-- Checkout de Clip para suscripciones.
--
-- La activacion nunca depende del navegador ni del cuerpo del webhook.
-- Una Edge Function consulta el estado directamente en Clip y esta funcion
-- aplica el resultado de forma atomica e idempotente.

create table if not exists public.subscription_prices (
  plan text primary key check (plan in ('presencia', 'destacado')),
  monthly_amount numeric(12,2) not null check (monthly_amount > 0),
  currency text not null default 'MXN' check (currency = 'MXN'),
  active boolean not null default true,
  updated_at timestamptz not null default now()
);

insert into public.subscription_prices (plan, monthly_amount, currency)
values
  ('presencia', 99.00, 'MXN'),
  ('destacado', 200.00, 'MXN')
on conflict (plan) do nothing;

alter table public.payment_requests
  add column if not exists clip_payment_request_id text,
  add column if not exists clip_checkout_url text,
  add column if not exists clip_status text,
  add column if not exists clip_receipt_no text,
  add column if not exists idempotency_key uuid,
  add column if not exists processed_at timestamptz,
  add column if not exists updated_at timestamptz not null default now(),
  add column if not exists error_message text,
  add column if not exists clip_payload jsonb;

create unique index if not exists payment_requests_clip_id_uidx
  on public.payment_requests (clip_payment_request_id)
  where clip_payment_request_id is not null;

create unique index if not exists payment_requests_store_idempotency_uidx
  on public.payment_requests (store_id, idempotency_key)
  where idempotency_key is not null;

create index if not exists payment_requests_store_created_idx
  on public.payment_requests (store_id, creado_en desc);

create index if not exists stores_owner_idx on public.stores (owner_id);
create index if not exists orders_client_created_idx on public.orders (client_id, created_at desc);
create index if not exists orders_store_created_idx on public.orders (store_id, created_at desc);
create index if not exists leads_store_created_idx on public.leads (store_id, created_at desc);
create index if not exists products_store_active_created_idx
  on public.products (store_id, is_active, created_at desc);

alter table public.subscription_prices enable row level security;
alter table public.payment_requests enable row level security;

drop policy if exists subscription_prices_public_read on public.subscription_prices;
create policy subscription_prices_public_read
  on public.subscription_prices for select
  to anon, authenticated
  using (active = true);

drop policy if exists payment_requests_owner_read on public.payment_requests;
create policy payment_requests_owner_read
  on public.payment_requests for select
  to authenticated
  using (
    exists (
      select 1
      from public.stores s
      where s.id = payment_requests.store_id
        and s.owner_id = auth.uid()
    )
  );

-- Las solicitudes se crean y cambian exclusivamente desde funciones de
-- servidor. Las RPC manuales existentes pueden seguir operando si son
-- SECURITY DEFINER, pero el navegador no recibe escritura directa.
revoke insert, update, delete on public.payment_requests from anon, authenticated;
grant select on public.payment_requests to authenticated;
grant select on public.subscription_prices to anon, authenticated;

create or replace function public.finalize_clip_subscription(
  p_clip_payment_request_id text,
  p_clip_status text,
  p_receipt_no text,
  p_amount numeric,
  p_currency text,
  p_payload jsonb default '{}'::jsonb
)
returns jsonb
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  v_request public.payment_requests%rowtype;
  v_new_until timestamptz;
  v_status text := upper(coalesce(p_clip_status, ''));
begin
  select *
    into v_request
    from public.payment_requests
   where clip_payment_request_id = p_clip_payment_request_id
   for update;

  if not found then
    raise exception 'clip_request_not_found';
  end if;

  -- Respuestas repetidas del webhook no vuelven a extender el plan.
  if v_request.estado = 'verificado' then
    return jsonb_build_object(
      'request_id', v_request.id,
      'estado', v_request.estado,
      'clip_status', v_request.clip_status,
      'already_applied', true
    );
  end if;

  if v_status in ('CHECKOUT_COMPLETED', 'COMPLETED') then
    if upper(coalesce(p_currency, '')) <> 'MXN'
       or round(coalesce(p_amount, -1), 2) <> round(v_request.monto, 2) then
      update public.payment_requests
         set clip_status = v_status,
             error_message = 'El monto o la moneda informados por Clip no coinciden.',
             clip_payload = p_payload,
             updated_at = now()
       where id = v_request.id;

      return jsonb_build_object(
        'request_id', v_request.id,
        'estado', 'por_verificar',
        'clip_status', v_status,
        'amount_mismatch', true
      );
    end if;

    select greatest(coalesce(s.subscribed_until, now()), now())
           + make_interval(months => v_request.meses)
      into v_new_until
      from public.stores s
     where s.id = v_request.store_id
     for update;

    if v_new_until is null then
      raise exception 'store_not_found';
    end if;

    update public.stores
       set plan = v_request.plan,
           sub_status = 'activa',
           status = 'active',
           subscribed_until = v_new_until
     where id = v_request.store_id;

    -- payments es la bitacora contable. El NOT EXISTS hace que el webhook
    -- sea idempotente incluso si Clip reintenta la notificacion.
    insert into public.payments (
      store_id, kind, ref_id, amount, status, provider_ref, paid_at
    )
    select
      v_request.store_id,
      'suscripcion',
      v_request.id::text,
      v_request.monto,
      'pagado',
      p_clip_payment_request_id,
      now()
    where not exists (
      select 1 from public.payments p
       where p.provider_ref = p_clip_payment_request_id
    );

    update public.payment_requests
       set estado = 'verificado',
           clip_status = v_status,
           clip_receipt_no = nullif(p_receipt_no, ''),
           referencia = coalesce(nullif(p_receipt_no, ''), referencia),
           resuelto_en = now(),
           processed_at = now(),
           updated_at = now(),
           error_message = null,
           clip_payload = p_payload
     where id = v_request.id;

    return jsonb_build_object(
      'request_id', v_request.id,
      'estado', 'verificado',
      'clip_status', v_status,
      'subscribed_until', v_new_until,
      'already_applied', false
    );
  end if;

  if v_status in ('CHECKOUT_CANCELLED', 'CHECKOUT_CANCELED', 'CANCELLED', 'CANCELED',
                  'CHECKOUT_EXPIRED', 'EXPIRED', 'DECLINED', 'REJECTED') then
    update public.payment_requests
       set estado = 'rechazado',
           clip_status = v_status,
           motivo_rechazo = coalesce(motivo_rechazo, 'Clip no completo el pago.'),
           resuelto_en = now(),
           processed_at = now(),
           updated_at = now(),
           clip_payload = p_payload
     where id = v_request.id;

    return jsonb_build_object(
      'request_id', v_request.id,
      'estado', 'rechazado',
      'clip_status', v_status
    );
  end if;

  update public.payment_requests
     set clip_status = v_status,
         updated_at = now(),
         clip_payload = p_payload
   where id = v_request.id;

  return jsonb_build_object(
    'request_id', v_request.id,
    'estado', 'por_verificar',
    'clip_status', v_status
  );
end;
$$;

revoke all on function public.finalize_clip_subscription(text, text, text, numeric, text, jsonb)
  from public, anon, authenticated;
grant execute on function public.finalize_clip_subscription(text, text, text, numeric, text, jsonb)
  to service_role;


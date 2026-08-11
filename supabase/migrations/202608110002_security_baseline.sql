-- Base de seguridad para las tablas que consume la SPA.
-- Ejecutar despues de 202608110001_clip_checkout.sql.

create or replace function public.is_platform_admin()
returns boolean
language sql
stable
security definer
set search_path = public, pg_temp
as $$
  select exists (
    select 1 from public.profiles p
    where p.id = auth.uid() and p.role = 'admin'
  );
$$;

revoke all on function public.is_platform_admin() from public;
grant execute on function public.is_platform_admin() to anon, authenticated, service_role;

-- Completa las relaciones faltantes sin bloquear la migracion por datos
-- historicos. Despues de limpiar huerfanos se deben VALIDATE CONSTRAINT.
do $$
begin
  begin alter table public.product_images add constraint product_images_product_fk foreign key (product_id) references public.products(id) on delete cascade not valid; exception when duplicate_object then null; end;
  begin alter table public.product_option_groups add constraint product_option_groups_product_fk foreign key (product_id) references public.products(id) on delete cascade not valid; exception when duplicate_object then null; end;
  begin alter table public.order_items add constraint order_items_order_fk foreign key (order_id) references public.orders(id) on delete cascade not valid; exception when duplicate_object then null; end;
  begin alter table public.order_items add constraint order_items_product_fk foreign key (product_id) references public.products(id) on delete set null not valid; exception when duplicate_object then null; end;
  begin alter table public.contact_events add constraint contact_events_store_fk foreign key (store_id) references public.stores(id) not valid; exception when duplicate_object then null; end;
  begin alter table public.contact_events add constraint contact_events_order_fk foreign key (order_id) references public.orders(id) on delete set null not valid; exception when duplicate_object then null; end;
  begin alter table public.contact_events add constraint contact_events_customer_fk foreign key (customer_id) references auth.users(id) on delete set null not valid; exception when duplicate_object then null; end;
  begin alter table public.credits_ledger add constraint credits_ledger_store_fk foreign key (store_id) references public.stores(id) not valid; exception when duplicate_object then null; end;
  begin alter table public.promotions add constraint promotions_store_fk foreign key (store_id) references public.stores(id) on delete cascade not valid; exception when duplicate_object then null; end;
  begin alter table public.promotions add constraint promotions_product_fk foreign key (product_id) references public.products(id) on delete cascade not valid; exception when duplicate_object then null; end;
end $$;

create index if not exists product_images_product_sort_idx on public.product_images (product_id, sort_order);
create index if not exists product_option_groups_product_sort_idx on public.product_option_groups (product_id, sort_order);
create index if not exists order_items_order_idx on public.order_items (order_id);
create index if not exists contact_events_store_created_idx on public.contact_events (store_id, created_at desc);
create index if not exists credits_ledger_store_created_idx on public.credits_ledger (store_id, created_at desc);
create index if not exists promotions_store_dates_idx on public.promotions (store_id, starts_at, ends_at);

do $$
begin
  begin alter table public.orders add constraint orders_total_nonnegative check (total >= 0) not valid; exception when duplicate_object then null; end;
  begin alter table public.orders add constraint orders_mode_allowed check (mode in ('delivery', 'pickup', 'Entrega', 'Recoger')) not valid; exception when duplicate_object then null; end;
  begin alter table public.promotions add constraint promotions_dates_valid check (ends_at > starts_at) not valid; exception when duplicate_object then null; end;
  begin alter table public.product_option_groups add constraint product_option_groups_limits_valid check (min_selected >= 0 and max_selected >= min_selected and max_selected <= 50) not valid; exception when duplicate_object then null; end;
end $$;

-- RLS se reconstruye para no heredar una politica permisiva antigua.
do $$
declare
  t text;
  p record;
begin
  foreach t in array array[
    'profiles','stores','products','product_details','product_images',
    'product_option_groups','orders','order_items','leads','contact_events',
    'credits_ledger','promotions','packages','promo_plans','payments',
    'payment_requests','terms_acceptances','cobro_config','destacado_precios',
    'destacado_canje','subscription_prices'
  ] loop
    execute format('alter table public.%I enable row level security', t);
    for p in
      select policyname from pg_policies where schemaname = 'public' and tablename = t
    loop
      execute format('drop policy %I on public.%I', p.policyname, t);
    end loop;
  end loop;
end $$;

create policy profiles_self_read on public.profiles for select to authenticated
  using (id = auth.uid() or public.is_platform_admin());
create policy profiles_self_insert on public.profiles for insert to authenticated
  with check (id = auth.uid() and role in ('customer','store_owner'));
create policy profiles_self_update on public.profiles for update to authenticated
  using (id = auth.uid()) with check (id = auth.uid());

create policy stores_public_read on public.stores for select to anon, authenticated
  using ((status = 'active' and sub_status not in ('suspendida','vencida')) or owner_id = auth.uid() or public.is_platform_admin());
create policy stores_owner_insert on public.stores for insert to authenticated
  with check (owner_id = auth.uid());
create policy stores_owner_update on public.stores for update to authenticated
  using (owner_id = auth.uid()) with check (owner_id = auth.uid());

create policy products_public_read on public.products for select to anon, authenticated
  using (
    (is_active and exists (
      select 1 from public.stores s where s.id = products.store_id
        and s.status = 'active' and s.sub_status not in ('suspendida','vencida')
    ))
    or exists (select 1 from public.stores s where s.id = products.store_id and s.owner_id = auth.uid())
    or public.is_platform_admin()
  );
create policy products_owner_insert on public.products for insert to authenticated
  with check (exists (select 1 from public.stores s where s.id = products.store_id and s.owner_id = auth.uid()));
create policy products_owner_update on public.products for update to authenticated
  using (exists (select 1 from public.stores s where s.id = products.store_id and s.owner_id = auth.uid()))
  with check (exists (select 1 from public.stores s where s.id = products.store_id and s.owner_id = auth.uid()));

create policy product_details_public_read on public.product_details for select to anon, authenticated
  using (exists (select 1 from public.products p where p.id = product_details.product_id));
create policy product_details_owner_insert on public.product_details for insert to authenticated
  with check (exists (select 1 from public.products p join public.stores s on s.id=p.store_id where p.id=product_details.product_id and s.owner_id=auth.uid()));
create policy product_details_owner_update on public.product_details for update to authenticated
  using (exists (select 1 from public.products p join public.stores s on s.id=p.store_id where p.id=product_details.product_id and s.owner_id=auth.uid()));

create policy product_images_public_read on public.product_images for select to anon, authenticated
  using (exists (select 1 from public.products p where p.id=product_images.product_id));
create policy product_option_groups_public_read on public.product_option_groups for select to anon, authenticated
  using (exists (select 1 from public.products p where p.id=product_option_groups.product_id));

create policy orders_parties_read on public.orders for select to authenticated
  using (client_id = auth.uid() or exists (select 1 from public.stores s where s.id=orders.store_id and s.owner_id=auth.uid()) or public.is_platform_admin());
create policy order_items_parties_read on public.order_items for select to authenticated
  using (exists (select 1 from public.orders o where o.id=order_items.order_id));
create policy leads_owner_read on public.leads for select to authenticated
  using (exists (select 1 from public.stores s where s.id=leads.store_id and s.owner_id=auth.uid()) or public.is_platform_admin());
create policy contact_events_owner_read on public.contact_events for select to authenticated
  using (exists (select 1 from public.stores s where s.id=contact_events.store_id and s.owner_id=auth.uid()) or public.is_platform_admin());
create policy credits_ledger_owner_read on public.credits_ledger for select to authenticated
  using (exists (select 1 from public.stores s where s.id=credits_ledger.store_id and s.owner_id=auth.uid()) or public.is_platform_admin());
create policy promotions_public_read on public.promotions for select to anon, authenticated
  using (status='active' and starts_at <= now() and ends_at > now());

create policy packages_public_read on public.packages for select to anon, authenticated using (active);
create policy promo_plans_public_read on public.promo_plans for select to anon, authenticated using (active);
create policy subscription_prices_public_read on public.subscription_prices for select to anon, authenticated using (active);
create policy cobro_config_public_read on public.cobro_config for select to anon, authenticated using (true);
create policy destacado_precios_public_read on public.destacado_precios for select to anon, authenticated using (true);
create policy destacado_canje_public_read on public.destacado_canje for select to anon, authenticated using (true);

create policy payments_owner_read on public.payments for select to authenticated
  using (exists (select 1 from public.stores s where s.id=payments.store_id and s.owner_id=auth.uid()) or public.is_platform_admin());
create policy payment_requests_owner_read on public.payment_requests for select to authenticated
  using (exists (select 1 from public.stores s where s.id=payment_requests.store_id and s.owner_id=auth.uid()) or public.is_platform_admin());
create policy terms_self_read on public.terms_acceptances for select to authenticated using (user_id=auth.uid() or public.is_platform_admin());
create policy terms_self_insert on public.terms_acceptances for insert to authenticated with check (user_id=auth.uid());

-- Privilegios por columna: aunque una politica acepte la fila, el dueño no
-- puede autoasignarse saldo, plan, estado, destacado ni rol administrativo.
revoke all on public.profiles, public.stores, public.products, public.product_details,
  public.product_images, public.product_option_groups, public.orders, public.order_items,
  public.leads, public.contact_events, public.credits_ledger, public.promotions,
  public.packages, public.promo_plans, public.subscription_prices, public.payments,
  public.payment_requests, public.terms_acceptances, public.cobro_config,
  public.destacado_precios, public.destacado_canje from anon, authenticated;

grant select on public.stores, public.products, public.product_details, public.product_images,
  public.product_option_groups, public.promotions, public.packages, public.promo_plans,
  public.subscription_prices, public.cobro_config, public.destacado_precios,
  public.destacado_canje to anon, authenticated;
grant select on public.profiles, public.orders, public.order_items, public.leads,
  public.contact_events, public.credits_ledger, public.payments, public.payment_requests,
  public.terms_acceptances to authenticated;

grant insert (id, role, full_name, phone, address, reference, lat, lng) on public.profiles to authenticated;
grant update (full_name, phone, address, reference, lat, lng) on public.profiles to authenticated;
grant insert on public.stores to authenticated;
grant update (slug, name, owner_name, whatsapp, email, category, description, address,
  lat, lng, service_modes, schedule, prep_minutes, logo_path, cover_path) on public.stores to authenticated;
grant insert on public.products to authenticated;
grant update (type, title, category, description, price, image_path, discount_type,
  discount_value, availability_modes, is_active, removable_items, extras) on public.products to authenticated;
grant insert, update on public.product_details to authenticated;
grant insert on public.terms_acceptances to authenticated;

-- En altas directas desde la SPA se fuerzan los valores comerciales. Las
-- Edge Functions usan service_role y no pasan por esta rama.
create or replace function public.protect_client_controlled_fields()
returns trigger
language plpgsql
security definer
set search_path = public, pg_temp
as $$
begin
  if auth.role() = 'authenticated' then
    if tg_table_name = 'stores' then
      if tg_op = 'INSERT' then
        new.owner_id := auth.uid();
        new.credits := 30;
        new.credit_spend := 0;
        new.marketing_spend := 0;
        new.plan := 'presencia';
        new.sub_status := 'prueba';
        new.subscribed_until := now() + interval '30 days';
        new.featured_until := null;
        new.featured_since := null;
      end if;
    elsif tg_table_name = 'products' and tg_op = 'INSERT' then
      new.featured_until := null;
      new.featured_since := null;
    elsif tg_table_name = 'profiles' and new.role = 'admin' then
      new.role := 'customer';
    end if;
  end if;
  return new;
end;
$$;

drop trigger if exists protect_stores_client_fields on public.stores;
create trigger protect_stores_client_fields before insert on public.stores
  for each row execute function public.protect_client_controlled_fields();
drop trigger if exists protect_products_client_fields on public.products;
create trigger protect_products_client_fields before insert on public.products
  for each row execute function public.protect_client_controlled_fields();
drop trigger if exists protect_profiles_client_fields on public.profiles;
create trigger protect_profiles_client_fields before insert or update on public.profiles
  for each row execute function public.protect_client_controlled_fields();

revoke all on function public.protect_client_controlled_fields() from public, anon, authenticated;

-- Storage publico para lectura, pero escritura solo dentro de la carpeta
-- del usuario o de una tienda que le pertenece.
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values
  ('logos', 'logos', true, 5242880, array['image/jpeg','image/png','image/webp','image/gif','image/avif']),
  ('portadas', 'portadas', true, 5242880, array['image/jpeg','image/png','image/webp','image/gif','image/avif']),
  ('productos', 'productos', true, 5242880, array['image/jpeg','image/png','image/webp','image/gif','image/avif'])
on conflict (id) do update set
  public = excluded.public,
  file_size_limit = excluded.file_size_limit,
  allowed_mime_types = excluded.allowed_mime_types;

drop policy if exists pueblo_images_public_read on storage.objects;
create policy pueblo_images_public_read on storage.objects for select to anon, authenticated
  using (bucket_id in ('logos','portadas','productos'));

drop policy if exists pueblo_images_owner_insert on storage.objects;
create policy pueblo_images_owner_insert on storage.objects for insert to authenticated
  with check (
    bucket_id in ('logos','portadas','productos') and (
      (storage.foldername(name))[1] = auth.uid()::text
      or exists (
        select 1 from public.stores s
        where s.id::text = (storage.foldername(name))[1] and s.owner_id = auth.uid()
      )
    )
  );

drop policy if exists pueblo_images_owner_update on storage.objects;
create policy pueblo_images_owner_update on storage.objects for update to authenticated
  using (
    bucket_id in ('logos','portadas','productos') and (
      (storage.foldername(name))[1] = auth.uid()::text
      or exists (select 1 from public.stores s where s.id::text=(storage.foldername(name))[1] and s.owner_id=auth.uid())
    )
  );

drop policy if exists pueblo_images_owner_delete on storage.objects;
create policy pueblo_images_owner_delete on storage.objects for delete to authenticated
  using (
    bucket_id in ('logos','portadas','productos') and (
      (storage.foldername(name))[1] = auth.uid()::text
      or exists (select 1 from public.stores s where s.id::text=(storage.foldername(name))[1] and s.owner_id=auth.uid())
    )
  );

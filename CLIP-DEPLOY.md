# Activar pagos automáticos con Clip

La API key de Clip nunca se agrega a `config.js`, GitHub, Netlify ni al navegador. Vive exclusivamente como secreto de Supabase Edge Functions.

## Requisitos

- Cuenta Clip activa y con identidad verificada.
- API key y clave secreta productivas de Clip Checkout.
- Supabase CLI conectado al proyecto `tgkomtcyxcknsxxpfnxj`.
- URL HTTPS pública y definitiva del sitio.

## Sobre la credencial de pruebas

La documentación actual de Clip limita las credenciales sandbox al Checkout
Transparente/SDK, pagos y reembolsos. Este proyecto usa Checkout Redireccionado
`POST /v2/checkout`, que evita que la tienda toque datos de tarjeta. Antes de
poner una credencial de pruebas en `CLIP_API_KEY` y `CLIP_API_SECRET`, confirma con soporte de
Clip que la habilitaron para Checkout Redireccionado. Si responde 401/403 no es
un fallo del código: esa credencial no tiene acceso a ese producto.

No cambies al Checkout Transparente solo para usar sandbox sin completar antes
su SDK, 3DS y las pruebas de seguridad correspondientes.

## Despliegue

1. Aplica en orden las migraciones de `supabase/migrations` mediante `supabase db push` o el SQL Editor.
2. Copia la API Key y la Clave Secreta exactamente como aparecen. La Clave
   Secreta solo se muestra una vez.
3. Configura los secretos del servidor. La Edge Function construye el token
   `Basic` internamente:

```text
supabase secrets set CLIP_API_KEY="TU_API_KEY"
supabase secrets set CLIP_API_SECRET="TU_CLAVE_SECRETA"
supabase secrets set PUBLIC_SITE_URL="https://tu-dominio.mx"
supabase secrets set PUBLIC_SITE_ORIGIN="https://tu-dominio.mx"
```

4. Publica las funciones:

```text
supabase functions deploy clip-checkout
supabase functions deploy clip-payment-status
supabase functions deploy clip-webhook --no-verify-jwt
```

`clip-webhook` es público porque Clip no posee una sesión de Supabase. Su token
se deriva internamente de `CLIP_API_SECRET`; la clave real nunca aparece en la
URL. Aun así, nunca confía en la notificación: consulta
`GET /v2/checkout/{payment_request_id}` directamente a Clip antes de acreditar.

## Qué se sube a cada lugar

- GitHub: todo el proyecto, incluida la carpeta `supabase`, para conservar el
  historial. `.gitignore` impide subir archivos `.env`.
- Hosting web (Netlify, Vercel u otro): los HTML, CSS, JavaScript e imágenes de
  la raíz. Normalmente el hosting los toma automáticamente desde GitHub.
- Supabase Database: los archivos de `supabase/migrations`, aplicados con
  `supabase db push` o revisados en SQL Editor.
- Supabase Edge Functions: `supabase/functions`, desplegadas con la CLI.
- Supabase Edge Function Secrets: la API key de Clip, el token del webhook y
  el dominio. Los valores se capturan en el Dashboard o con la CLI y nunca se
  guardan en GitHub.

## Prueba obligatoria

Realiza primero una compra mínima controlada y verifica estos escenarios:

1. Pago completado: una sola fila `payments`, solicitud `verificado` y extensión exacta de la suscripción.
2. Pago rechazado: solicitud `rechazado`, sin cambios en `stores.plan` ni `subscribed_until`.
3. Regreso falso a `#/pago/.../regreso`: debe permanecer pendiente y no activar nada.
4. Webhook repetido: no debe extender dos veces ni duplicar `payments`.
5. Monto alterado: debe quedar `por_verificar` con `amount_mismatch`, sin activación.
6. Webhook ausente: la pantalla de regreso debe consultar Clip y conciliar el pago.

## Operación

- Los precios autoritativos viven en `subscription_prices`, no en el navegador.
- Transferencia y efectivo conservan el flujo manual de revisión.
- No borres `payment_requests`, `payments` ni `clip_payload`: forman la auditoría.
- Revisa periódicamente solicitudes pendientes y errores de las Edge Functions.

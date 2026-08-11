import { adminClient, clipRequest, webhookToken } from "../_shared/clip.ts";
import { corsHeaders, json, message } from "../_shared/http.ts";

const PLANES = new Set(["presencia", "destacado"]);
const MESES = new Set([1, 3, 6, 12]);
const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

Deno.serve(async (request) => {
  if (request.method === "OPTIONS") return new Response("ok", { headers: corsHeaders(request) });
  if (request.method !== "POST") return json(request, { error: "Metodo no permitido." }, 405);

  try {
    const authorization = request.headers.get("authorization") || "";
    const jwt = authorization.replace(/^Bearer\s+/i, "");
    if (!jwt) return json(request, { error: "Inicia sesion para pagar." }, 401);

    const admin = adminClient();
    const { data: userData, error: userError } = await admin.auth.getUser(jwt);
    if (userError || !userData.user) return json(request, { error: "La sesion no es valida." }, 401);

    const body = await request.json().catch(() => ({}));
    const plan = String(body.plan || "").toLowerCase();
    const meses = Number(body.meses);
    const idempotencyKey = String(body.idempotencyKey || "");
    if (!PLANES.has(plan) || !MESES.has(meses) || !UUID.test(idempotencyKey)) {
      return json(request, { error: "Los datos del plan no son validos." }, 400);
    }

    const { data: store, error: storeError } = await admin
      .from("stores")
      .select("id,name")
      .eq("owner_id", userData.user.id)
      .maybeSingle();
    if (storeError) throw storeError;
    if (!store) return json(request, { error: "Tu cuenta no tiene una tienda." }, 403);

    const { data: previous } = await admin
      .from("payment_requests")
      .select("id,clip_checkout_url,estado")
      .eq("store_id", store.id)
      .eq("idempotency_key", idempotencyKey)
      .maybeSingle();
    if (previous?.clip_checkout_url) {
      return json(request, {
        requestId: previous.id,
        checkoutUrl: previous.clip_checkout_url,
        estado: previous.estado,
      });
    }

    const { data: price, error: priceError } = await admin
      .from("subscription_prices")
      .select("monthly_amount,currency")
      .eq("plan", plan)
      .eq("active", true)
      .single();
    if (priceError || !price) return json(request, { error: "Ese plan no esta disponible." }, 409);

    const amount = Math.round(Number(price.monthly_amount) * meses * 100) / 100;
    const requestId = crypto.randomUUID();
    const { error: insertError } = await admin.from("payment_requests").insert({
      id: requestId,
      store_id: store.id,
      plan,
      meses,
      monto: amount,
      metodo: "clip",
      estado: "por_verificar",
      idempotency_key: idempotencyKey,
      clip_status: "CREATING",
    });
    if (insertError) throw insertError;

    const siteUrl = (Deno.env.get("PUBLIC_SITE_URL") || "").replace(/\/$/, "");
    const webhookSecret = await webhookToken();
    const supabaseUrl = Deno.env.get("SUPABASE_URL") || "";
    if (!/^https:\/\//i.test(siteUrl)) {
      throw new Error("Falta PUBLIC_SITE_URL en los secretos del servidor.");
    }

    let clip: Record<string, unknown>;
    try {
      clip = await clipRequest("", {
        method: "POST",
        body: JSON.stringify({
          amount,
          currency: price.currency,
          purchase_description: `Suscripcion ${plan} por ${meses} mes${meses === 1 ? "" : "es"}`,
          redirection_url: {
            success: `${siteUrl}/#/pago/${requestId}/regreso`,
            error: `${siteUrl}/#/pago/${requestId}/fallo`,
            default: `${siteUrl}/#/pago/${requestId}/pendiente`,
          },
          webhook_url: `${supabaseUrl}/functions/v1/clip-webhook?token=${encodeURIComponent(webhookSecret)}`,
          metadata: { external_reference: requestId },
          override_settings: { locale: "es-MX", tip_enabled: false },
        }),
      });
    } catch (error) {
      await admin.from("payment_requests").update({
        estado: "rechazado",
        clip_status: "CREATE_FAILED",
        motivo_rechazo: message(error).slice(0, 500),
        error_message: message(error).slice(0, 500),
        resuelto_en: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      }).eq("id", requestId);
      throw error;
    }

    const clipId = String(clip.payment_request_id || "");
    const checkoutUrl = String(clip.payment_request_url || "");
    if (!UUID.test(clipId) || !/^https:\/\//i.test(checkoutUrl)) {
      throw new Error("Clip no devolvio un enlace de pago valido.");
    }

    const { error: updateError } = await admin.from("payment_requests").update({
      clip_payment_request_id: clipId,
      clip_checkout_url: checkoutUrl,
      clip_status: String(clip.status || "CHECKOUT_CREATED"),
      updated_at: new Date().toISOString(),
    }).eq("id", requestId);
    if (updateError) throw updateError;

    return json(request, { requestId, checkoutUrl, estado: "por_verificar" });
  } catch (error) {
    console.error(error);
    return json(request, { error: message(error) }, 500);
  }
});

import { adminClient, verifyAndApply } from "../_shared/clip.ts";
import { corsHeaders, json, message } from "../_shared/http.ts";

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

Deno.serve(async (request) => {
  if (request.method === "OPTIONS") return new Response("ok", { headers: corsHeaders(request) });
  if (request.method !== "POST") return json(request, { error: "Metodo no permitido." }, 405);

  try {
    const jwt = (request.headers.get("authorization") || "").replace(/^Bearer\s+/i, "");
    const body = await request.json().catch(() => ({}));
    const requestId = String(body.requestId || "");
    if (!jwt || !UUID.test(requestId)) return json(request, { error: "Solicitud no valida." }, 400);

    const admin = adminClient();
    const { data: userData, error: userError } = await admin.auth.getUser(jwt);
    if (userError || !userData.user) return json(request, { error: "La sesion no es valida." }, 401);

    const { data: payment, error: paymentError } = await admin
      .from("payment_requests")
      .select("id,store_id,plan,meses,monto,estado,clip_status,clip_payment_request_id,motivo_rechazo,stores!inner(owner_id)")
      .eq("id", requestId)
      .maybeSingle();
    if (paymentError) throw paymentError;
    const ownerId = Array.isArray(payment?.stores) ? payment.stores[0]?.owner_id : payment?.stores?.owner_id;
    if (!payment || ownerId !== userData.user.id) return json(request, { error: "Pago no encontrado." }, 404);

    let result: Record<string, unknown> = payment;
    let verificationWarning = "";
    if (payment.estado === "por_verificar" && payment.clip_payment_request_id) {
      try {
        result = await verifyAndApply(admin, payment.clip_payment_request_id);
      } catch (error) {
        verificationWarning = message(error);
      }
    }

    const { data: current, error: currentError } = await admin
      .from("payment_requests")
      .select("id,plan,meses,monto,estado,clip_status,motivo_rechazo,processed_at")
      .eq("id", requestId)
      .single();
    if (currentError) throw currentError;

    return json(request, {
      ...current,
      verificationWarning: verificationWarning || undefined,
      applied: result,
    });
  } catch (error) {
    console.error(error);
    return json(request, { error: message(error) }, 500);
  }
});


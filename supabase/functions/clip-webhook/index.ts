import { adminClient, verifyAndApply, webhookToken } from "../_shared/clip.ts";
import { json, message } from "../_shared/http.ts";

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

Deno.serve(async (request) => {
  if (request.method !== "POST") return json(request, { error: "Metodo no permitido." }, 405);

  try {
    const expected = await webhookToken();
    const received = new URL(request.url).searchParams.get("token") || "";
    if (!expected || received !== expected) return json(request, { error: "No autorizado." }, 401);

    const body = await request.json().catch(() => ({}));
    // Clip ha documentado dos formatos: el completo usa
    // payment_request_id y el reducido usa id. Nunca confiamos en el status
    // recibido; con este identificador consultamos la API de Clip.
    const clipId = String(body.payment_request_id || body.id || "");
    if (!UUID.test(clipId)) return json(request, { error: "Notificacion no valida." }, 400);

    const result = await verifyAndApply(adminClient(), clipId);
    return json(request, { received: true, estado: result.estado });
  } catch (error) {
    console.error(error);
    return json(request, { error: message(error) }, 500);
  }
});

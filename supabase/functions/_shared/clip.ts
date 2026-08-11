import { createClient, type SupabaseClient } from "https://esm.sh/@supabase/supabase-js@2";

const CLIP_API = "https://api.payclip.com/v2/checkout";

export function adminClient(): SupabaseClient {
  const url = Deno.env.get("SUPABASE_URL");
  const key = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
  if (!url || !key) throw new Error("Falta la configuracion interna de Supabase.");
  return createClient(url, key, { auth: { persistSession: false } });
}

function clipAuthorization(): string {
  const token = Deno.env.get("CLIP_API_TOKEN")?.trim();
  if (token) return /^(Basic|Bearer)\s/i.test(token) ? token : `Bearer ${token}`;

  // El operador copia las dos credenciales que muestra Clip. El servidor
  // construye el encabezado Basic; ninguna credencial llega al navegador.
  const apiKey = Deno.env.get("CLIP_API_KEY")?.trim();
  const apiSecret = Deno.env.get("CLIP_API_SECRET")?.trim();
  if (!apiKey || !apiSecret) {
    throw new Error("Faltan CLIP_API_KEY y CLIP_API_SECRET en los secretos del servidor.");
  }
  return `Basic ${btoa(`${apiKey}:${apiSecret}`)}`;
}

/**
 * Identificador privado para la URL del webhook. Se deriva de la clave de
 * Clip y nunca expone esa clave. CLIP_WEBHOOK_TOKEN queda como override
 * opcional para instalaciones anteriores.
 */
export async function webhookToken(): Promise<string> {
  const configured = Deno.env.get("CLIP_WEBHOOK_TOKEN")?.trim();
  if (configured) return configured;
  const secret = Deno.env.get("CLIP_API_SECRET")?.trim();
  if (!secret) throw new Error("Falta CLIP_API_SECRET para proteger el webhook.");
  const bytes = new TextEncoder().encode(`pueblopedidos:clip-webhook:${secret}`);
  const digest = await crypto.subtle.digest("SHA-256", bytes);
  return Array.from(new Uint8Array(digest), (byte) => byte.toString(16).padStart(2, "0")).join("");
}

export async function clipRequest(path = "", init: RequestInit = {}): Promise<Record<string, unknown>> {
  const response = await fetch(`${CLIP_API}${path}`, {
    ...init,
    headers: {
      "Authorization": clipAuthorization(),
      "Content-Type": "application/json",
      ...(init.headers || {}),
    },
  });
  const payload = await response.json().catch(() => ({})) as Record<string, unknown>;
  if (!response.ok) {
    const detail = String(payload.message || payload.error || payload.last_status_message || response.statusText);
    throw new Error(`Clip rechazo la solicitud (${response.status}): ${detail}`);
  }
  return payload;
}

function normalizedStatus(payload: Record<string, unknown>): string {
  return String(payload.status || payload.resource_status || "UNKNOWN").toUpperCase();
}

export async function verifyAndApply(
  admin: SupabaseClient,
  clipPaymentRequestId: string,
): Promise<Record<string, unknown>> {
  const clip = await clipRequest(`/${encodeURIComponent(clipPaymentRequestId)}`);
  const { data, error } = await admin.rpc("finalize_clip_subscription", {
    p_clip_payment_request_id: clipPaymentRequestId,
    p_clip_status: normalizedStatus(clip),
    p_receipt_no: String(clip.receipt_no || ""),
    p_amount: Number(clip.amount),
    p_currency: String(clip.currency || ""),
    p_payload: clip,
  });
  if (error) throw new Error(error.message);
  return { ...(data || {}), clip };
}

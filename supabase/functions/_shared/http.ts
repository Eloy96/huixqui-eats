export function corsHeaders(request: Request): Record<string, string> {
  const configured = (Deno.env.get("PUBLIC_SITE_ORIGIN") || "")
    .split(",")
    .map((item) => item.trim())
    .filter(Boolean);
  const origin = request.headers.get("origin") || "";
  const allowed = configured.length === 0 || configured.includes(origin);

  return {
    "Access-Control-Allow-Origin": allowed ? (origin || "*") : "null",
    "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
    "Access-Control-Allow-Methods": "POST, OPTIONS",
    "Vary": "Origin",
    "Content-Type": "application/json; charset=utf-8",
  };
}

export function json(request: Request, body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: corsHeaders(request),
  });
}

export function message(error: unknown): string {
  return error instanceof Error ? error.message : String(error || "Error inesperado");
}


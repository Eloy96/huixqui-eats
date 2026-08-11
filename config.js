// Configuración de Supabase.
//
// La publishable key (anon) SÍ puede vivir aquí: es pública por diseño y
// lo que protege los datos es RLS, no esconder la llave. Lo que NUNCA se
// pone aquí es la service_role key.
//
// Estos dos valores están copiados de tu supabase-config.js. Si alguna vez
// los rotas, se cambian aquí y en ningún otro lado.
// Los encuentras en: Supabase → Project Settings → API Keys.

export const CONFIG_SUPABASE = {
  url: "https://tgkomtcyxcknsxxpfnxj.supabase.co",
  publishableKey: "sb_publishable_xnyw7KTVnGdEcupe2-YVrg_EcxG2yvQ",
};

// ¿Quieres enseñar la app sin tocar la base? Pon esto en true y arranca
// siempre en demo local.
export const FORZAR_DEMO = false;

// Google Maps Platform (Places API New + Maps JavaScript API).
// Esta llave es pública por diseño porque se usa desde el navegador, pero
// DEBE quedar restringida en Google Cloud a https://eloy96.github.io/* y
// únicamente a Maps JavaScript API y Places API (New).
// Mientras esté vacía, la app conserva dirección manual, GPS y links de Maps.
export const CONFIG_GOOGLE_MAPS = {
  apiKey: "",
  country: "MX",
  language: "es",
  // Centro aproximado del área de servicio para priorizar resultados cercanos.
  center: { lat: 19.4, lng: -99.55 },
  radiusMeters: 70000,
};

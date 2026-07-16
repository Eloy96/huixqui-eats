// Configuración de Supabase.
//
// La publishable key (anon) SÍ puede vivir aquí: es pública por diseño y
// lo que protege los datos es RLS, no esconder la llave. Lo que NUNCA se
// pone aquí es la service_role key.

export const CONFIG_SUPABASE = {
  url: "https://tgkomtcyxcknsxxpfnxj.supabase.co",
  publishableKey: "sb_publishable_ZC1LOZWjJRxCkK5H49dvGA_HYIVQqSp",
};

// ¿Quieres enseñar la app sin tocar la base? Pon esto en true y arranca
// siempre en demo local.
export const FORZAR_DEMO = false;

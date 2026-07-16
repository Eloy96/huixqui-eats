// Router por hash. Rutas reales para que cada tienda y cada producto
// tengan su propio link compartible.
//
// Compatibilidad: los links viejos con formato #tienda/id-de-la-tienda
// ya andan circulando por WhatsApp del pueblo. Se redirigen, no se rompen.

const rutas = [];
let alCambiar = () => {};

export function definir(patron, manejador) {
  const partes = patron.split("/").filter(Boolean);
  rutas.push({ partes, manejador });
}

export function alNavegar(fn) {
  alCambiar = fn;
}

export function ir(ruta, { reemplazar = false } = {}) {
  const destino = ruta.startsWith("#") ? ruta : `#${ruta}`;
  if (location.hash === destino) {
    resolver();
    return;
  }
  if (reemplazar) history.replaceState(null, "", destino);
  else location.hash = destino;
}

export function rutaActual() {
  return location.hash.replace(/^#/, "") || "/";
}

export function atras(alterno = "/") {
  if (history.length > 1) history.back();
  else ir(alterno);
}

function normalizar(hash) {
  const limpio = hash.replace(/^#/, "");
  if (!limpio) return "/";
  // Links viejos: #tienda/burger-plaza → #/tienda/burger-plaza
  if (!limpio.startsWith("/")) return `/${limpio}`;
  return limpio;
}

function resolver() {
  const ruta = normalizar(location.hash);
  if (location.hash && !location.hash.startsWith("#/")) {
    history.replaceState(null, "", `#${ruta}`);
  }
  const partes = ruta.split("/").filter(Boolean);
  for (const definicion of rutas) {
    const params = emparejar(definicion.partes, partes);
    if (params) {
      alCambiar({ ruta, params, manejador: definicion.manejador });
      return;
    }
  }
  alCambiar({ ruta, params: {}, manejador: null });
}

function emparejar(patron, partes) {
  if (patron.length !== partes.length) return null;
  const params = {};
  for (let i = 0; i < patron.length; i += 1) {
    if (patron[i].startsWith(":")) {
      params[patron[i].slice(1)] = decodeURIComponent(partes[i]);
    } else if (patron[i] !== partes[i]) {
      return null;
    }
  }
  return params;
}

export function iniciar() {
  window.addEventListener("hashchange", resolver);
  resolver();
}

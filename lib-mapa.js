// Mapa para confirmar una ubicación arrastrando un pin.
//
// Se usa Leaflet + OpenStreetMap, no Google Maps, por dos razones:
//   · Google exige una llave de API con tarjeta registrada. Para esto no
//     vale la pena abrir una cuenta de cobro.
//   · Leaflet es gratis, sin llave y sin límite de uso.
//
// Lo importante: la librería se carga SOLO cuando el usuario toca "Ver en
// el mapa". Quien nunca abre el mapa no descarga ni un byte de más, que es
// lo que me hacía dudar de meterlo (el pueblo navega con datos móviles).

const CDN_JS = "https://unpkg.com/leaflet@1.9.4/dist/leaflet.js";
const CDN_CSS = "https://unpkg.com/leaflet@1.9.4/dist/leaflet.css";

let cargando = null;

/** Carga Leaflet una sola vez. Devuelve L, o lanza si no se pudo. */
function cargarLeaflet() {
  if (window.L) return Promise.resolve(window.L);
  if (cargando) return cargando;

  cargando = new Promise((resolver, rechazar) => {
    if (!document.querySelector(`link[href="${CDN_CSS}"]`)) {
      const css = document.createElement("link");
      css.rel = "stylesheet";
      css.href = CDN_CSS;
      document.head.appendChild(css);
    }

    const script = document.createElement("script");
    script.src = CDN_JS;
    script.async = true;
    script.onload = () => (window.L ? resolver(window.L) : rechazar(new Error("Leaflet no cargó.")));
    script.onerror = () => {
      cargando = null;
      rechazar(new Error("No pudimos cargar el mapa. Revisa tu conexión."));
    };
    document.head.appendChild(script);
  });

  return cargando;
}

/**
 * Monta un mapa con un pin movible.
 *
 * @param {HTMLElement} nodo  dónde dibujarlo
 * @param {{lat:number, lng:number}} inicio  centro inicial
 * @param {(coords:{lat:number,lng:number}) => void} alMover  cada vez que el pin cambia
 * @returns {Promise<{centrar:Function, destruir:Function}>}
 */
export async function montarMapa(nodo, inicio, alMover) {
  const L = await cargarLeaflet();

  const mapa = L.map(nodo, {
    center: [inicio.lat, inicio.lng],
    zoom: 17,
    // En móvil, un mapa a pantalla completa secuestra el scroll de la
    // página. Con esto solo hace zoom cuando el usuario lo toca a
    // propósito (dos dedos o clic dentro).
    scrollWheelZoom: false,
    tap: true,
  });

  L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", {
    maxZoom: 19,
    attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>',
  }).addTo(mapa);

  const pin = L.marker([inicio.lat, inicio.lng], { draggable: true }).addTo(mapa);
  pin.bindTooltip("Arrástrame al punto exacto", { permanent: false, direction: "top" });

  const avisar = () => {
    const p = pin.getLatLng();
    if (alMover) alMover({ lat: p.lat, lng: p.lng });
  };

  pin.on("dragend", avisar);
  // Tocar el mapa también mueve el pin: más fácil que arrastrar en una
  // pantalla chica.
  mapa.on("click", (ev) => {
    pin.setLatLng(ev.latlng);
    avisar();
  });

  // Leaflet mide mal el contenedor si se monta dentro de algo que acaba de
  // aparecer (una hoja, un acordeón). Un invalidateSize tardío lo corrige.
  setTimeout(() => mapa.invalidateSize(), 200);

  return {
    centrar(coords) {
      mapa.setView([coords.lat, coords.lng], 17);
      pin.setLatLng([coords.lat, coords.lng]);
    },
    destruir() {
      mapa.remove();
    },
  };
}

/** Punto de partida cuando no hay ubicación: centro del Estado de México. */
export const CENTRO_POR_DEFECTO = { lat: 19.4, lng: -99.55 };

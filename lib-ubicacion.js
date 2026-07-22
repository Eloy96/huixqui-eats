// Ubicación: leer el GPS, convertir coordenadas en dirección, y sacar
// coordenadas de un link de Google Maps.
//
// Por qué no metemos un mapa visual (Leaflet y similares): son ~40 KB más
// las imágenes de los mosaicos, y esto se usa con datos móviles de pueblo.
// Con el GPS y el link de Google Maps se resuelve el 95% de los casos sin
// cargar nada extra.

const CACHE = new Map();

/** Lee el GPS del dispositivo. Errores en español, no códigos. */
export function ubicacionActual({ preciso = true, esperaMs = 10000 } = {}) {
  return new Promise((resolver, rechazar) => {
    if (!navigator.geolocation) {
      rechazar(new Error("Tu navegador no permite compartir ubicación."));
      return;
    }
    navigator.geolocation.getCurrentPosition(
      (pos) =>
        resolver({
          lat: pos.coords.latitude,
          lng: pos.coords.longitude,
          precision: Math.round(pos.coords.accuracy || 0),
        }),
      (error) => {
        const motivos = {
          1: "No diste permiso de ubicación. Actívalo en el candado de la barra de direcciones.",
          2: "No pudimos obtener tu ubicación. Revisa que el GPS esté encendido.",
          3: "Tardó demasiado. Intenta de nuevo o escribe la dirección a mano.",
        };
        rechazar(new Error(motivos[error.code] || "No pudimos leer tu ubicación."));
      },
      { enableHighAccuracy: preciso, timeout: esperaMs, maximumAge: 60000 },
    );
  });
}

/**
 * Coordenadas → dirección, con OpenStreetMap (Nominatim).
 *
 * Es gratis y sin llave, pero es un servicio ajeno: puede tardar o no
 * responder. Por eso NUNCA bloquea nada — si falla, el usuario escribe la
 * dirección a mano y la ubicación se guarda igual.
 */
export async function direccionDesdeCoords(lat, lng) {
  const llave = `${lat.toFixed(5)},${lng.toFixed(5)}`;
  if (CACHE.has(llave)) return CACHE.get(llave);

  const url =
    `https://nominatim.openstreetmap.org/reverse?format=jsonv2` +
    `&lat=${lat}&lon=${lng}&zoom=18&addressdetails=1&accept-language=es`;

  const control = new AbortController();
  const corte = setTimeout(() => control.abort(), 6000);
  try {
    const respuesta = await fetch(url, { signal: control.signal });
    if (!respuesta.ok) throw new Error("sin respuesta");
    const datos = await respuesta.json();
    const resultado = armarDireccion(datos);
    CACHE.set(llave, resultado);
    return resultado;
  } catch {
    return null;
  } finally {
    clearTimeout(corte);
  }
}

function armarDireccion(datos) {
  const d = datos?.address || {};
  const calle = d.road || d.pedestrian || d.footway || "";
  const numero = d.house_number || "";
  const colonia = d.neighbourhood || d.suburb || d.quarter || d.village || "";
  const municipio = d.city || d.town || d.municipality || d.village || "";
  const estado = d.state || "";
  const cp = d.postcode || "";

  const linea = [calle && numero ? `${calle} ${numero}` : calle, colonia]
    .filter(Boolean)
    .join(", ");

  return {
    linea: linea || datos?.display_name?.split(",").slice(0, 2).join(",") || "",
    colonia,
    municipio,
    estado,
    cp,
    completa: datos?.display_name || "",
  };
}

/**
 * Saca coordenadas de un link de Google Maps.
 *
 * En México la gente comparte ubicaciones de Google Maps por WhatsApp todo
 * el tiempo, así que pegar el link es más natural que buscar en un mapa.
 *
 * Los links cortos (maps.app.goo.gl) no se pueden resolver desde el
 * navegador: el servidor de Google no permite leerlos desde otra página.
 * En ese caso devolvemos una explicación en vez de fallar en silencio.
 */
export function coordsDesdeLink(texto) {
  const url = String(texto || "").trim();
  if (!url) return { error: "Pega el link primero." };

  if (/maps\.app\.goo\.gl|goo\.gl\/maps/i.test(url)) {
    return {
      error:
        "Ese es un link corto. Ábrelo en Google Maps, espera a que cargue el mapa y copia la dirección completa de la barra del navegador.",
    };
  }

  // Coordenadas sueltas: "19.4326, -99.1332"
  const sueltas = url.match(/^\s*(-?\d{1,3}\.\d+)\s*,\s*(-?\d{1,3}\.\d+)\s*$/);
  if (sueltas) return validar(Number(sueltas[1]), Number(sueltas[2]));

  // .../@19.4326,-99.1332,17z    ?q=19.4326,-99.1332    !3d19.43!4d-99.13
  const patrones = [
    /@(-?\d{1,3}\.\d+),(-?\d{1,3}\.\d+)/,
    /[?&](?:q|ll|center|daddr)=(-?\d{1,3}\.\d+),\s*(-?\d{1,3}\.\d+)/,
    /!3d(-?\d{1,3}\.\d+)!4d(-?\d{1,3}\.\d+)/,
  ];
  for (const patron of patrones) {
    const m = url.match(patron);
    if (m) return validar(Number(m[1]), Number(m[2]));
  }

  return {
    error: "No encontramos coordenadas en ese link. Revisa que sea de Google Maps.",
  };
}

function validar(lat, lng) {
  if (!Number.isFinite(lat) || !Number.isFinite(lng)) {
    return { error: "Las coordenadas no se ven bien." };
  }
  if (Math.abs(lat) > 90 || Math.abs(lng) > 180) {
    return { error: "Esas coordenadas están fuera del mapa." };
  }
  return { lat, lng };
}

/** Link para ver un punto en Google Maps. */
export function linkMapa(lat, lng) {
  return `https://www.google.com/maps/search/?api=1&query=${lat},${lng}`;
}

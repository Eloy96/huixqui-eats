// Integración progresiva con Google Maps Platform.
// La app nunca se bloquea si la llave no está configurada o Google falla.

import { CONFIG_GOOGLE_MAPS } from "./config.js";

let carga = null;

export function googleMapsConfigurado() {
  return Boolean(String(CONFIG_GOOGLE_MAPS?.apiKey || "").trim());
}

export function cargarGoogleMaps() {
  if (globalThis.google?.maps) return Promise.resolve(globalThis.google.maps);
  if (!googleMapsConfigurado()) return Promise.reject(new Error("Google Maps todavía no está configurado."));
  if (carga) return carga;

  carga = new Promise((resolve, reject) => {
    const callback = `__puebloGoogleMaps${Date.now()}`;
    globalThis[callback] = () => {
      delete globalThis[callback];
      globalThis.google?.maps ? resolve(globalThis.google.maps) : reject(new Error("Google Maps no cargó."));
    };
    const script = document.createElement("script");
    const params = new URLSearchParams({
      key: CONFIG_GOOGLE_MAPS.apiKey,
      libraries: "places",
      v: "weekly",
      loading: "async",
      language: CONFIG_GOOGLE_MAPS.language || "es",
      region: CONFIG_GOOGLE_MAPS.country || "MX",
      callback,
    });
    script.src = `https://maps.googleapis.com/maps/api/js?${params}`;
    script.async = true;
    script.onerror = () => {
      delete globalThis[callback];
      carga = null;
      reject(new Error("No pudimos cargar Google Maps. Escribe la dirección manualmente."));
    };
    document.head.appendChild(script);
  });
  return carga;
}

export async function montarAutocompleteGoogle(zona, {
  valor = "",
  requerido = false,
  alElegir,
  alEditar,
} = {}) {
  if (!googleMapsConfigurado()) return null;
  const maps = await cargarGoogleMaps();
  const { PlaceAutocompleteElement } = await maps.importLibrary("places");
  const campo = new PlaceAutocompleteElement();
  campo.id = `direccion-google-${Math.random().toString(36).slice(2, 8)}`;
  campo.placeholder = "Calle, número y colonia";
  campo.includedRegionCodes = [String(CONFIG_GOOGLE_MAPS.country || "MX").toLowerCase()];
  campo.locationBias = {
    center: CONFIG_GOOGLE_MAPS.center,
    radius: Number(CONFIG_GOOGLE_MAPS.radiusMeters || 70000),
  };
  campo.setAttribute("aria-label", "Buscar dirección");
  if (requerido) campo.setAttribute("required", "");
  if (valor) campo.value = valor;
  zona.appendChild(campo);
  campo.addEventListener("input", () => alEditar?.());

  campo.addEventListener("gmp-select", async (evento) => {
    const prediccion = evento.placePrediction;
    if (!prediccion) return;
    const lugar = prediccion.toPlace();
    await lugar.fetchFields({ fields: ["id", "formattedAddress", "location", "addressComponents"] });
    const lat = lugar.location?.lat?.();
    const lng = lugar.location?.lng?.();
    if (!Number.isFinite(lat) || !Number.isFinite(lng)) return;
    alElegir?.(
      lugar.formattedAddress || String(campo.value || ""),
      { lat, lng },
      { placeId: lugar.id || "", addressComponents: lugar.addressComponents || [] },
    );
  });

  return campo;
}

export async function direccionGoogleDesdeCoords(lat, lng) {
  if (!googleMapsConfigurado()) return null;
  try {
    const maps = await cargarGoogleMaps();
    const geocoder = new maps.Geocoder();
    const respuesta = await geocoder.geocode({ location: { lat, lng }, region: "MX", language: "es" });
    const primero = respuesta?.results?.[0];
    if (!primero) return null;
    return {
      linea: primero.formatted_address || "",
      completa: primero.formatted_address || "",
      placeId: primero.place_id || "",
    };
  } catch {
    return null;
  }
}

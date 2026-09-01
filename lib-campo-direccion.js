// Campo de dirección progresivo.
// Con Google configurado ofrece sugerencias precisas; sin llave conserva
// captura manual y coordenadas existentes, sin depender de Nominatim.

import { html, pintarEn } from "./lib-dom.js";
import { googleMapsConfigurado, montarAutocompleteGoogle } from "./lib-google-maps.js";

export function campoDireccion(zona, opciones = {}) {
  const {
    valor = "",
    coords = null,
    alElegir = null,
    alEditar: alEditarDireccion = null,
    requerido = false,
  } = opciones;
  let elegidas = coords;
  let metadatos = null;

  pintarEn(
    zona,
    html`
      <div class="dir-auto">
        <div class="dir-google" data-google-direccion ${googleMapsConfigurado() ? "" : "hidden"}></div>
        <input
          name="address"
          class="dir-auto-input"
          value="${valor}"
          placeholder="Calle, número, colonia y municipio"
          autocomplete="street-address"
          ${googleMapsConfigurado() ? "hidden" : ""}
          ${requerido ? "required" : ""}
        />
        <small class="dir-auto-ayuda" data-ayuda>
          ${googleMapsConfigurado()
            ? "Escribe y elige una dirección de Google para guardar el punto exacto."
            : "Escribe la dirección completa. Puedes complementar con el GPS."}
        </small>
      </div>
    `,
  );

  const input = zona.querySelector(".dir-auto-input");
  const ayuda = zona.querySelector("[data-ayuda]");
  const zonaGoogle = zona.querySelector("[data-google-direccion]");

  input.addEventListener("input", () => {
    elegidas = null;
    metadatos = null;
    ayuda.textContent = "Dirección escrita manualmente. Usa el GPS si quieres fijar el punto exacto.";
    ayuda.classList.remove("dir-auto-ok");
    alEditarDireccion?.(input.value.trim());
  });

  if (googleMapsConfigurado()) {
    montarAutocompleteGoogle(zonaGoogle, {
      valor,
      requerido,
      alEditar() {
        elegidas = null;
        metadatos = null;
        ayuda.textContent = "Elige una sugerencia para confirmar la ubicación.";
        ayuda.classList.remove("dir-auto-ok");
        alEditarDireccion?.(input.value.trim());
      },
      alElegir(direccion, coordsElegidas, meta) {
        input.value = direccion;
        elegidas = coordsElegidas;
        metadatos = meta;
        ayuda.textContent = "Dirección y ubicación confirmadas ✓";
        ayuda.classList.add("dir-auto-ok");
        alElegir?.(direccion, elegidas, metadatos);
      },
    }).catch(() => {
      zonaGoogle.hidden = true;
      input.hidden = false;
      ayuda.textContent = "Google no respondió. Escribe la dirección y usa el GPS para confirmar.";
    });
  }

  return {
    direccion: () => input.value.trim(),
    coords: () => elegidas,
    metadata: () => metadatos,
    elemento: () => input,
    enfocar() {
      const controlGoogle = zonaGoogle.querySelector("input, [tabindex]");
      const objetivo = input.hidden ? controlGoogle || zonaGoogle : input;
      if (!objetivo.hasAttribute("tabindex") && objetivo === zonaGoogle) objetivo.tabIndex = -1;
      objetivo.focus({ preventScroll: true });
    },
    establecer(direccion, nuevasCoords = null) {
      input.value = String(direccion || "");
      elegidas = nuevasCoords;
      metadatos = null;
      ayuda.textContent = nuevasCoords && direccion
        ? "Dirección y ubicación confirmadas ✓"
        : nuevasCoords
          ? "Ubicación confirmada ✓ La dirección se pedirá al ordenar."
          : "Dirección guardada. Usa el GPS si quieres mejorar la precisión.";
      ayuda.classList.toggle("dir-auto-ok", Boolean(nuevasCoords));
    },
  };
}

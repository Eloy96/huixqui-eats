// La hoja que se abre al tocar "Entregar en" del header.
//
// Antes ese botón solo te empujaba a otra pantalla, que no es lo que
// promete: dice "Entregar en" y debe dejarte elegir dónde.

import { html, pintarEn } from "./lib-dom.js";
import { abrirHoja, toast, icono } from "./lib-ui.js";
import { estado, fijar } from "./estado.js";
import * as repo from "./datos-repo.js";
import { ubicacionActual, direccionDesdeCoords } from "./lib-ubicacion.js";

export function abrirSelectorUbicacion(alElegir) {
  const sesion = repo.sesion();
  const guardada = sesion?.role === "client" ? sesion.perfil?.address : "";
  const actual = estado.ubicacion;

  const { nodo, cerrar } = abrirHoja({
    titulo: "¿Dónde entregamos?",
    cuerpo: html`
      <p style="color:var(--tinta-60);font-size:var(--t-sm);margin-bottom:var(--e-3)">
        Con tu ubicación te mostramos primero los negocios más cerca de ti y el tiempo estimado real.
      </p>

      <button class="boton boton--principal boton--ancho" data-gps type="button">
        Usar mi ubicación actual
      </button>
      <p data-estado-gps style="font-size:var(--t-xs);color:var(--tinta-60);margin-top:var(--e-2);min-height:18px"></p>

      ${guardada
        ? html`
            <button class="boton boton--contorno boton--ancho" data-guardada type="button" style="margin-top:var(--e-3)">
              Mi dirección guardada
            </button>
            <p style="font-size:var(--t-xs);color:var(--tinta-60);margin-top:var(--e-1)">${guardada}</p>
          `
        : ""}

      <div style="display:flex;align-items:center;gap:var(--e-2);margin:var(--e-4) 0">
        <span style="flex:1;height:1px;background:var(--linea)"></span>
        <span style="font-size:var(--t-xs);color:var(--tinta-40)">o escribe una referencia</span>
        <span style="flex:1;height:1px;background:var(--linea)"></span>
      </div>

      <label class="campo">
        <span>Zona o referencia</span>
        <input data-manual value="${estado.etiquetaUbicacion || ""}" placeholder="Centro, junto a la iglesia" />
        <small>Solo para ti: no ordena por cercanía, pero te recuerda dónde pediste.</small>
      </label>

      ${actual
        ? html`
            <button class="boton boton--texto" data-limpiar type="button" style="margin-top:var(--e-2)">
              Quitar mi ubicación y ver todo el pueblo
            </button>
          `
        : ""}
    `,
    pie: html`<button class="boton boton--principal boton--ancho" data-listo type="button">Listo</button>`,
  });

  const aviso = nodo.querySelector("[data-estado-gps]");

  nodo.querySelector("[data-gps]").addEventListener("click", async (ev) => {
    const boton = ev.currentTarget;
    boton.disabled = true;
    boton.textContent = "Buscando...";
    aviso.textContent = "";
    try {
      const punto = await ubicacionActual();
      // La dirección es un extra: si el servicio no responde, la ubicación
      // se guarda igual. Nunca dejamos que un servicio ajeno bloquee esto.
      const dir = await direccionDesdeCoords(punto.lat, punto.lng);
      fijar({
        ubicacion: { lat: punto.lat, lng: punto.lng },
        etiquetaUbicacion: dir?.linea || "Cerca de ti",
      });
      toast("Listo, ya ordenamos los negocios por cercanía.");
      cerrar();
      if (alElegir) alElegir();
    } catch (error) {
      aviso.textContent = error.message;
      aviso.style.color = "var(--error-500)";
      boton.disabled = false;
      boton.textContent = "Usar mi ubicación actual";
    }
  });

  const botonGuardada = nodo.querySelector("[data-guardada]");
  if (botonGuardada) {
    botonGuardada.addEventListener("click", () => {
      const coords = sesion?.perfil?.coords;
      fijar({
        ubicacion: coords || estado.ubicacion,
        etiquetaUbicacion: guardada,
      });
      if (!coords) {
        toast("Guardamos tu dirección, pero sin coordenadas no podemos ordenar por cercanía.");
      }
      cerrar();
      if (alElegir) alElegir();
    });
  }

  const limpiar = nodo.querySelector("[data-limpiar]");
  if (limpiar) {
    limpiar.addEventListener("click", () => {
      fijar({ ubicacion: null, etiquetaUbicacion: "" });
      cerrar();
      if (alElegir) alElegir();
    });
  }

  nodo.querySelector("[data-listo]").addEventListener("click", () => {
    const manual = nodo.querySelector("[data-manual]").value.trim();
    if (manual) fijar({ etiquetaUbicacion: manual });
    cerrar();
    if (alElegir) alElegir();
  });
}

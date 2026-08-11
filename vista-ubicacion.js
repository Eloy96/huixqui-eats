// La hoja que se abre al tocar "Entregar en" del header.
//
// Antes ese botón solo te empujaba a otra pantalla, que no es lo que
// promete: dice "Entregar en" y debe dejarte elegir dónde.

import { html, pintarEn } from "./lib-dom.js";
import { abrirHoja, toast, icono } from "./lib-ui.js";
import { estado, fijar } from "./estado.js";
import * as repo from "./datos-repo.js";
import { ubicacionActual, direccionDesdeCoords } from "./lib-ubicacion.js";
import { campoDireccion } from "./lib-campo-direccion.js";

export function abrirSelectorUbicacion(alElegir) {
  const sesion = repo.sesion();
  const guardada = sesion?.role === "client" ? sesion.perfil?.address : "";
  const coordsGuardadas = sesion?.role === "client" ? sesion.perfil?.coords : null;
  const actual = estado.ubicacion;

  const { nodo, cerrar } = abrirHoja({
    titulo: "¿Dónde entregamos?",
    cuerpo: html`
      <p style="color:var(--tinta-60);font-size:var(--t-sm);margin-bottom:var(--e-3)">
        Escribe tu dirección o usa el GPS. Así mostramos primero los negocios realmente cercanos.
      </p>

      <label class="campo">
        <span>Tu dirección</span>
        <div data-campo-direccion></div>
      </label>

      <button class="boton boton--contorno boton--ancho" data-gps type="button">
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
  const controlador = campoDireccion(nodo.querySelector("[data-campo-direccion]"), {
    valor: guardada || estado.etiquetaUbicacion || "",
    coords: coordsGuardadas || actual,
    requerido: true,
    alElegir(direccion, coords) {
      fijar({ ubicacion: coords, etiquetaUbicacion: direccion });
    },
    alEditar(direccion) {
      fijar({ ubicacion: null, etiquetaUbicacion: direccion });
    },
  });

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
      const direccion = dir?.linea || controlador.direccion();
      fijar({
        ubicacion: { lat: punto.lat, lng: punto.lng },
        etiquetaUbicacion: direccion || "Cerca de ti",
      });
      controlador.establecer(direccion, { lat: punto.lat, lng: punto.lng });
      aviso.textContent = punto.precision > 100
        ? `Punto aproximado (±${punto.precision} m). Revisa o completa la dirección.`
        : "Ubicación precisa. Revisa la dirección y toca Listo.";
      aviso.style.color = punto.precision > 100 ? "var(--maiz-600)" : "var(--ok-500)";
    } catch (error) {
      aviso.textContent = error.message;
      aviso.style.color = "var(--error-500)";
      boton.disabled = false;
    } finally {
      boton.disabled = false;
      boton.textContent = "Usar mi ubicación actual";
    }
  });

  const botonGuardada = nodo.querySelector("[data-guardada]");
  if (botonGuardada) {
    botonGuardada.addEventListener("click", () => {
      const coords = sesion?.perfil?.coords;
      fijar({
        ubicacion: coordsGuardadas || estado.ubicacion,
        etiquetaUbicacion: guardada,
      });
      controlador.establecer(guardada, coordsGuardadas || null);
      if (!coordsGuardadas) {
        toast("Guardamos tu dirección, pero sin coordenadas no podemos ordenar por cercanía.");
      }
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

  nodo.querySelector("[data-listo]").addEventListener("click", async (ev) => {
    const direccion = controlador.direccion();
    const coords = controlador.coords() || estado.ubicacion;
    if (!direccion) {
      toast("Escribe tu dirección para continuar.", "error");
      return;
    }
    const boton = ev.currentTarget;
    boton.disabled = true;
    boton.textContent = "Guardando...";
    fijar({ ubicacion: coords || null, etiquetaUbicacion: direccion });
    if (sesion?.role === "client") {
      try {
        await repo.actualizarPerfil({ address: direccion, coords: coords || null });
      } catch {
        toast("La dirección queda en este dispositivo, pero no pudimos guardarla en tu cuenta.", "error");
      }
    }
    cerrar();
    if (alElegir) alElegir();
  });
}

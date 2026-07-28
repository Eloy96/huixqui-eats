// Campo de dirección con autocompletado.
//
// El usuario escribe, aparecen sugerencias reales (calles, colonias del
// pueblo), toca una, y se llenan solos el texto de la dirección Y sus
// coordenadas. Es lo que hace el autocompletado de Google Maps, pero con
// OpenStreetMap: gratis y sin tarjeta de crédito.
//
// Diseñado para reemplazar un <input name="address"> suelto sin que el
// resto del formulario se entere: sigue habiendo un input con ese nombre,
// solo que ahora es inteligente.

import { html, pintarEn } from "./lib-dom.js";
import { buscarDirecciones } from "./lib-ubicacion.js";

/**
 * Convierte un contenedor en un campo de dirección con autocompletado.
 *
 * @param {HTMLElement} zona  dónde montarlo
 * @param {object} opciones
 *   - valor: dirección inicial (para editar un perfil existente)
 *   - coords: { lat, lng } inicial
 *   - alElegir: callback(direccion, coords) cada vez que se elige una
 *   - requerido: si el input es obligatorio
 * @returns un objeto con { direccion(), coords() } para leer al guardar
 */
export function campoDireccion(zona, opciones = {}) {
  const { valor = "", coords = null, alElegir = null, requerido = false } = opciones;

  let elegidas = coords; // coordenadas de la dirección elegida
  let ultimaBusqueda = 0;
  let temporizador = null;

  pintarEn(
    zona,
    html`
      <div class="dir-auto">
        <input
          name="address"
          class="dir-auto-input"
          value="${valor}"
          placeholder="Escribe tu calle o colonia..."
          autocomplete="off"
          ${requerido ? "required" : ""}
        />
        <div class="dir-auto-lista" data-sugerencias hidden></div>
        <small class="dir-auto-ayuda" data-ayuda>
          Escribe y elige de la lista para ubicarte en el mapa.
        </small>
      </div>
    `,
  );

  const input = zona.querySelector(".dir-auto-input");
  const lista = zona.querySelector("[data-sugerencias]");
  const ayuda = zona.querySelector("[data-ayuda]");

  const cerrarLista = () => {
    lista.hidden = true;
    pintarEn(lista, "");
  };

  const pintarSugerencias = (opciones) => {
    if (!opciones.length) {
      cerrarLista();
      return;
    }
    pintarEn(
      lista,
      html`${opciones.map(
        (o, i) => html`
          <button type="button" class="dir-auto-item" data-idx="${i}">
            ${o.nombre}
          </button>
        `,
      )}`,
    );
    lista.hidden = false;

    lista.querySelectorAll(".dir-auto-item").forEach((btn, i) => {
      btn.addEventListener("click", () => {
        const elegida = opciones[i];
        input.value = elegida.nombre;
        elegidas = { lat: elegida.lat, lng: elegida.lng };
        ayuda.textContent = "Ubicación fijada ✓";
        ayuda.classList.add("dir-auto-ok");
        cerrarLista();
        if (alElegir) alElegir(elegida.nombre, elegidas);
      });
    });
  };

  const buscar = async (texto) => {
    const marca = ++ultimaBusqueda;
    const resultados = await buscarDirecciones(texto);
    // Si llegó otra búsqueda mientras esta viajaba, ignoramos la vieja:
    // así no parpadean sugerencias de lo que el usuario ya borró.
    if (marca !== ultimaBusqueda) return;
    pintarSugerencias(resultados);
  };

  input.addEventListener("input", () => {
    // Si el usuario reescribe, las coordenadas viejas ya no valen.
    elegidas = null;
    ayuda.textContent = "Escribe y elige de la lista para ubicarte en el mapa.";
    ayuda.classList.remove("dir-auto-ok");

    // Espera 350ms tras la última tecla antes de buscar: no dispara una
    // consulta por letra, respeta el servicio gratuito y va más suave.
    clearTimeout(temporizador);
    const texto = input.value.trim();
    if (texto.length < 3) {
      cerrarLista();
      return;
    }
    temporizador = setTimeout(() => buscar(texto), 350);
  });

  // Cerrar la lista al tocar fuera.
  document.addEventListener("click", (ev) => {
    if (!zona.contains(ev.target)) cerrarLista();
  });

  return {
    direccion: () => input.value.trim(),
    coords: () => elegidas,
  };
}

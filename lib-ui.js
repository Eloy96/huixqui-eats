// Toast, hojas inferiores, esqueletos, vacíos e iconos.
// Nada de aquí sabe qué es una tienda o un producto.

import { html, raw, pintarEn } from "./lib-dom.js";

// ---------- Iconos (inline: cero requests, cero librería) ----------

const trazo = (d) =>
  raw(
    `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">${d}</svg>`,
  );

export const icono = {
  inicio: () => trazo(`<path d="M3 10.5 12 3l9 7.5"/><path d="M5 9.5V21h14V9.5"/>`),
  buscar: () => trazo(`<circle cx="11" cy="11" r="7"/><path d="m20 20-3.6-3.6"/>`),
  carrito: () =>
    trazo(`<path d="M3 4h2l2.4 11.2a2 2 0 0 0 2 1.6h7.7a2 2 0 0 0 2-1.5L21 8H6"/><circle cx="10" cy="20" r="1.4"/><circle cx="18" cy="20" r="1.4"/>`),
  pedidos: () => trazo(`<path d="M6 3h9l4 4v14H6z"/><path d="M14 3v5h5"/><path d="M9 13h7M9 17h5"/>`),
  cuenta: () => trazo(`<circle cx="12" cy="8" r="4"/><path d="M4 21c1.5-4 4.5-6 8-6s6.5 2 8 6"/>`),
  atras: () => trazo(`<path d="M15 5 8 12l7 7"/>`),
  cerrar: () => trazo(`<path d="M6 6l12 12M18 6 6 18"/>`),
  tienda: () => trazo(`<path d="M4 4h16l1 5a3 3 0 0 1-6 0 3 3 0 0 1-6 0 3 3 0 0 1-6 0z"/><path d="M5 11v9h14v-9"/>`),
  wa: () =>
    raw(
      `<svg viewBox="0 0 24 24" fill="currentColor" aria-hidden="true"><path d="M12 2a10 10 0 0 0-8.6 15.1L2 22l5.1-1.3A10 10 0 1 0 12 2Zm5.3 14.1c-.2.6-1.3 1.2-1.8 1.2-.5 0-1.1.2-3.5-.8-2.9-1.3-4.7-4.4-4.9-4.6-.1-.2-1.1-1.5-1.1-2.8 0-1.3.7-2 .9-2.2.2-.3.5-.3.7-.3h.5c.2 0 .4 0 .6.5l.9 2c.1.2.1.4 0 .6l-.4.6-.3.3c-.1.1-.3.3-.1.6.2.3.8 1.4 1.8 2.3 1.2 1.1 2.2 1.4 2.5 1.6.3.1.5.1.6 0l.9-1c.2-.2.3-.2.6-.1l2 1c.3.1.5.2.5.3.1.2.1.8-.1 1.3Z"/></svg>`,
    ),
  copiar: () => trazo(`<rect x="9" y="9" width="11" height="11" rx="2"/><path d="M5 15V5a2 2 0 0 1 2-2h8"/>`),
  mas: () => trazo(`<path d="M12 5v14M5 12h14"/>`),
  basura: () => trazo(`<path d="M4 7h16M9 7V4h6v3M6 7l1 13h10l1-13"/>`),
  estrella: () =>
    raw(
      `<svg viewBox="0 0 24 24" fill="currentColor" aria-hidden="true"><path d="m12 3.5 2.6 5.3 5.9.9-4.3 4.1 1 5.8-5.2-2.7-5.2 2.7 1-5.8L3.5 9.7l5.9-.9z"/></svg>`,
    ),
};

// ---------- Toast ----------

let zonaToast = null;

export function toast(mensaje, tipo = "ok") {
  if (!zonaToast) {
    zonaToast = document.createElement("div");
    zonaToast.className = "toast-zona";
    zonaToast.setAttribute("role", "status");
    zonaToast.setAttribute("aria-live", "polite");
    document.body.appendChild(zonaToast);
  }
  const nodo = document.createElement("div");
  nodo.className = `toast${tipo === "error" ? " toast--error" : ""}`;
  nodo.textContent = mensaje;
  zonaToast.appendChild(nodo);
  setTimeout(() => nodo.remove(), 4000);
}

// ---------- Hoja inferior ----------
// Una sola hoja viva a la vez. Atrapa el foco, cierra con Escape y
// devuelve el foco a donde estaba: eso es lo que la vuelve usable
// con teclado y con lector de pantalla.

let hojaViva = null;

export function abrirHoja({ titulo, cuerpo, pie, alCerrar, ancha = false }) {
  cerrarHoja();
  const disparador = document.activeElement;

  const velo = document.createElement("div");
  velo.className = "velo";

  const hoja = document.createElement("section");
  hoja.className = `hoja${ancha ? " hoja--ancha" : ""}`;
  hoja.setAttribute("role", "dialog");
  hoja.setAttribute("aria-modal", "true");
  hoja.setAttribute("aria-label", titulo || "Detalle");

  pintarEn(
    hoja,
    html`
      <div class="hoja-agarre"></div>
      <header class="hoja-cabeza">
        <h2>${titulo}</h2>
        <button class="boton boton--icono boton--contorno" data-cerrar-hoja type="button" aria-label="Cerrar">
          ${icono.cerrar()}
        </button>
      </header>
      <div class="hoja-cuerpo">${cuerpo}</div>
      ${pie ? html`<footer class="hoja-pie">${pie}</footer>` : ""}
    `,
  );

  document.body.appendChild(velo);
  document.body.appendChild(hoja);
  document.body.classList.add("sin-scroll");

  const cerrar = () => {
    velo.remove();
    hoja.remove();
    document.body.classList.remove("sin-scroll");
    document.removeEventListener("keydown", alTeclear);
    hojaViva = null;
    if (disparador?.focus) disparador.focus();
    if (alCerrar) alCerrar();
  };

  function alTeclear(ev) {
    if (ev.key === "Escape") {
      ev.preventDefault();
      cerrar();
      return;
    }
    if (ev.key !== "Tab") return;
    const foco = hoja.querySelectorAll(
      'a[href], button:not([disabled]), input:not([disabled]), select, textarea, [tabindex]:not([tabindex="-1"])',
    );
    if (!foco.length) return;
    const primero = foco[0];
    const ultimo = foco[foco.length - 1];
    if (ev.shiftKey && document.activeElement === primero) {
      ev.preventDefault();
      ultimo.focus();
    } else if (!ev.shiftKey && document.activeElement === ultimo) {
      ev.preventDefault();
      primero.focus();
    }
  }

  velo.addEventListener("click", cerrar);
  hoja.addEventListener("click", (ev) => {
    if (ev.target.closest("[data-cerrar-hoja]")) cerrar();
  });
  document.addEventListener("keydown", alTeclear);

  const primerCampo = hoja.querySelector("input, textarea, select, button");
  if (primerCampo) primerCampo.focus({ preventScroll: true });

  hojaViva = { hoja, cerrar };
  return { nodo: hoja, cerrar };
}

export function cerrarHoja() {
  if (hojaViva) hojaViva.cerrar();
}

export function hojaAbierta() {
  return Boolean(hojaViva);
}

// ---------- Esqueletos y vacíos ----------

export function esqueletoCarrusel(n = 3) {
  return html`<div class="carrusel">
    ${Array.from({ length: n }, () => html`<div class="esqueleto esqueleto-tienda"></div>`)}
  </div>`;
}

export function esqueletoLista(n = 4) {
  return html`<div class="menu-lista">
    ${Array.from({ length: n }, () => html`<div class="esqueleto esqueleto-fila"></div>`)}
  </div>`;
}

export function vacio({ titulo, texto, accion }) {
  return html`
    <div class="vacio">
      <strong>${titulo}</strong>
      <p>${texto}</p>
      ${accion || ""}
    </div>
  `;
}

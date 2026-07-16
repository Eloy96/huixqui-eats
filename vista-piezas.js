// Piezas de dominio compartidas entre vistas. Devuelven HTML seguro.

import { html, urlSegura } from "./lib-dom.js";
import { icono, abrirHoja, toast } from "./lib-ui.js";
import {
  dinero,
  precioFinal,
  tieneDescuento,
  estaPromocionado,
  etiquetaModo,
  etiquetaTipo,
  estaAbierta,
  proximaApertura,
  distanciaKm,
  etiquetaDistancia,
  tiempoEstimado,
} from "./lib-formato.js";
import { estado, agregarAlCarrito } from "./estado.js";

export function precioHtml(producto) {
  const final = precioFinal(producto);
  if (!tieneDescuento(producto)) {
    return html`<div class="precio"><strong>${dinero(final)}</strong></div>`;
  }
  return html`<div class="precio precio--oferta">
    <strong>${dinero(final)}</strong>
    <del>${dinero(producto.price)}</del>
  </div>`;
}

export function selloDescuento(producto) {
  if (!tieneDescuento(producto)) return "";
  const texto =
    producto.discountType === "percent"
      ? `-${producto.discountValue}%`
      : `-${dinero(producto.discountValue)}`;
  return html`<span class="sello sello--oferta">${texto}</span>`;
}

/** Estado real de la tienda: calculado del horario, no inventado. */
export function estadoTienda(tienda) {
  const abierta = estaAbierta(tienda);
  return {
    abierta,
    sello: abierta
      ? html`<span class="sello sello--abierto">Abierto</span>`
      : html`<span class="sello sello--cerrado">Cerrado</span>`,
    detalle: abierta ? "" : proximaApertura(tienda),
  };
}

export function metaTienda(tienda) {
  const km = distanciaKm(estado.ubicacion, tienda.coords);
  const partes = [];
  if (km !== null) {
    partes.push(etiquetaDistancia(km));
    partes.push(tiempoEstimado(km, tienda.prepMinutes));
  }
  partes.push(etiquetaModo(tienda.serviceModes));
  return partes.filter(Boolean);
}

export function tarjetaTienda(tienda, { fila = false, conteo = 0 } = {}) {
  const { abierta, sello, detalle } = estadoTienda(tienda);
  const meta = metaTienda(tienda);
  return html`
    <a
      class="tienda-tarjeta ${fila ? "tienda-tarjeta--fila" : ""} ${abierta ? "" : "tienda-cerrada"}"
      href="#/tienda/${tienda.slug || tienda.id}"
    >
      <div class="tienda-portada">
        <img src="${urlSegura(tienda.cover || tienda.image)}" alt="" loading="lazy" decoding="async" />
        ${sello}
      </div>
      <div class="tienda-cuerpo">
        <h3>${tienda.name}</h3>
        <div class="tienda-meta">
          <span>${tienda.category}</span>
          ${meta.map((m) => html`<span class="punto">${m}</span>`)}
        </div>
        <div class="tienda-meta">
          ${detalle ? html`<span>${detalle}</span>` : html`<span>${conteo} producto${conteo === 1 ? "" : "s"}</span>`}
        </div>
      </div>
    </a>
  `;
}

export function filaMenu(producto, { tienda } = {}) {
  const agotado = producto.type === "retail" && producto.stock !== "" && Number(producto.stock) <= 0;
  return html`
    <button
      class="menu-fila ${agotado ? "menu-fila--agotado" : ""}"
      data-producto="${producto.id}"
      type="button"
      ${agotado ? "disabled" : ""}
    >
      <div>
        <h3>${producto.title}</h3>
        <p>${producto.description}</p>
        <div class="menu-fila-etiquetas">
          ${estaPromocionado(producto) ? html`<span class="sello sello--promo">Promocionado</span>` : ""}
          ${selloDescuento(producto)}
          ${agotado ? html`<span class="sello sello--cerrado">Agotado</span>` : ""}
          ${tienda ? html`<span class="sello sello--modo">${tienda.name}</span>` : ""}
        </div>
        ${precioHtml(producto)}
      </div>
      <img class="menu-fila-foto" src="${urlSegura(producto.image)}" alt="" loading="lazy" decoding="async" />
    </button>
  `;
}

function detalleTipo(producto) {
  const filas = [];
  if (producto.type === "food") {
    if (producto.ingredients) filas.push(["Ingredientes", producto.ingredients]);
    if (producto.allergens) filas.push(["Alérgenos", producto.allergens]);
    if (producto.portion) filas.push(["Porción", producto.portion]);
  }
  if (producto.type === "retail") {
    if (producto.brand) filas.push(["Marca", producto.brand]);
    if (producto.stock !== "" && producto.stock !== null) filas.push(["Disponibles", `${producto.stock}`]);
    if (producto.specs) filas.push(["Especificaciones", producto.specs]);
  }
  if (producto.type === "service") {
    if (producto.duration) filas.push(["Duración", producto.duration]);
    if (producto.serviceArea) filas.push(["Zona de servicio", producto.serviceArea]);
    if (producto.requirements) filas.push(["Requisitos", producto.requirements]);
  }
  if (producto.options) filas.push(["Opciones", producto.options]);
  if (!filas.length) return "";
  return html`
    <dl class="tarjeta" style="margin-top:var(--e-3);display:grid;gap:var(--e-2)">
      ${filas.map(
        ([clave, valor]) => html`
          <div>
            <dt style="font-size:var(--t-xs);color:var(--tinta-60);text-transform:uppercase;letter-spacing:.06em">${clave}</dt>
            <dd style="margin:0;font-size:var(--t-sm)">${valor}</dd>
          </div>
        `,
      )}
    </dl>
  `;
}

/** Hoja de producto: cantidad + nota antes de agregar. */
export function abrirProducto(producto, tienda) {
  let cantidad = 1;
  const final = precioFinal(producto);
  const { abierta } = estadoTienda(tienda);

  const { nodo, cerrar } = abrirHoja({
    titulo: producto.title,
    cuerpo: html`
      <img
        src="${urlSegura(producto.image)}"
        alt=""
        class="previa"
        style="aspect-ratio:4/3"
        decoding="async"
      />
      <div class="menu-fila-etiquetas">
        <span class="sello sello--modo">${etiquetaTipo(producto.type)}</span>
        <span class="sello sello--modo">${etiquetaModo(producto.availability)}</span>
        ${estaPromocionado(producto) ? html`<span class="sello sello--promo">Promocionado</span>` : ""}
        ${selloDescuento(producto)}
      </div>
      <h2 style="margin-top:var(--e-3)">${producto.title}</h2>
      <p style="color:var(--tinta-60);font-size:var(--t-sm);margin-top:var(--e-1)">${producto.description}</p>
      ${precioHtml(producto)}
      <a
        href="#/tienda/${tienda.slug || tienda.id}"
        style="display:inline-flex;gap:var(--e-2);align-items:center;margin-top:var(--e-2);font-size:var(--t-sm);color:var(--verde-700);font-weight:var(--peso-medio)"
      >
        ${icono.tienda()} ${tienda.name}
      </a>
      ${detalleTipo(producto)}
      ${abierta
        ? ""
        : html`<p class="campo-error" style="margin-top:var(--e-3)">
            ${tienda.name} está cerrado ahora. Puedes agregarlo y enviar el pedido cuando abra.
          </p>`}
      <label class="campo" style="margin-top:var(--e-4)">
        <span>¿Alguna indicación para la cocina?</span>
        <textarea data-nota placeholder="Ej. sin cebolla, salsa aparte, bien cocida"></textarea>
        <small>La tienda lo recibe tal cual en el WhatsApp.</small>
      </label>
    `,
    pie: html`
      <div style="display:flex;align-items:center;gap:var(--e-3)">
        <div class="cantidad">
          <button data-menos type="button" aria-label="Quitar uno">−</button>
          <span data-cantidad aria-live="polite">1</span>
          <button data-mas type="button" aria-label="Agregar uno">+</button>
        </div>
        <button class="boton boton--principal" data-agregar type="button" style="flex:1">
          Agregar · <span data-total>${dinero(final)}</span>
        </button>
      </div>
    `,
  });

  const pinta = () => {
    nodo.querySelector("[data-cantidad]").textContent = String(cantidad);
    nodo.querySelector("[data-total]").textContent = dinero(final * cantidad);
    nodo.querySelector("[data-menos]").disabled = cantidad <= 1;
  };
  pinta();

  nodo.querySelector("[data-menos]").addEventListener("click", () => {
    cantidad = Math.max(1, cantidad - 1);
    pinta();
  });
  nodo.querySelector("[data-mas]").addEventListener("click", () => {
    cantidad = Math.min(50, cantidad + 1);
    pinta();
  });
  nodo.querySelector("[data-agregar]").addEventListener("click", () => {
    agregarAlCarrito({
      producto,
      cantidad,
      nota: nodo.querySelector("[data-nota]").value,
      precio: final,
    });
    cerrar();
    toast(`${producto.title} agregado al carrito.`);
  });
}

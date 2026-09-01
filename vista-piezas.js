// Piezas de dominio compartidas entre vistas. Devuelven HTML seguro.

import { html, urlSegura, pintarEn, delegar } from "./lib-dom.js";
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
  normalizarWhatsApp,
} from "./lib-formato.js";
import { imagenPorCategoria } from "./datos-semillas.js";
import { estado, agregarAlCarrito, productoCompatibleConModo } from "./estado.js";

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
        <img
          src="${urlSegura(tienda.cover) || urlSegura(imagenPorCategoria(tienda.category))}"
          data-respaldo="${urlSegura(imagenPorCategoria(tienda.category))}"
          alt=""
          loading="lazy"
          decoding="async"
        />
        ${sello}
        ${tienda.plan === "destacado"
          ? html`<span class="sello sello--destacado">${icono.estrella()} Destacado</span>`
          : ""}
      </div>
      <div class="tienda-cuerpo">
        <h3>${tienda.name}</h3>
        <div class="tienda-meta">
          <span>${tienda.category}</span>
          ${meta.map((m) => html`<span class="punto">${m}</span>`)}
        </div>
        <div class="tienda-meta">
          ${detalle
            ? html`<span>${detalle}</span>`
            : conteo > 0
              ? html`<span>${conteo} producto${conteo === 1 ? "" : "s"}</span>`
              : html`<span class="catalogo-preparacion">Catálogo en preparación</span>`}
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
      <div class="menu-fila-texto">
        <h3>${producto.title}</h3>
        <p class="menu-fila-desc">${producto.description}</p>
        <div class="menu-fila-etiquetas">
          ${estaPromocionado(producto) ? html`<span class="sello sello--promo">Promocionado</span>` : ""}
          ${selloDescuento(producto)}
          ${agotado ? html`<span class="sello sello--cerrado">Agotado</span>` : ""}
          ${tienda ? html`<span class="sello sello--modo">${tienda.name}</span>` : ""}
        </div>
        ${precioHtml(producto)}
      </div>
      <img
        class="menu-fila-foto"
        src="${urlSegura(producto.image) || urlSegura(imagenPorCategoria(producto.productCategory))}"
        data-respaldo="${urlSegura(imagenPorCategoria(producto.productCategory))}"
        alt=""
        loading="lazy"
        decoding="async"
      />
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
    <dl class="ficha-datos">
      ${filas.map(
        ([clave, valor]) => html`
          <div class="ficha-dato">
            <dt>${clave}</dt>
            <dd>${valor}</dd>
          </div>
        `,
      )}
    </dl>
  `;
}

/**
 * Ingredientes que el cliente puede quitar.
 *
 * Vienen marcados: el platillo LOS LLEVA. Desmarcar es pedir "sin
 * cebolla". Al revés (marcar para agregar) confundía: la gente no sabía
 * si estaba pidiendo con o sin.
 */
function bloqueQuitables(producto) {
  const lista = Array.isArray(producto.quitables) ? producto.quitables : [];
  if (!lista.length) return "";
  return html`
    <fieldset class="opciones-cliente">
      <legend>Lleva</legend>
      <p class="opciones-cliente-ayuda">Desmarca lo que no quieras.</p>
      ${lista.map(
        (nombre, i) => html`
          <label class="opcion-check">
            <input type="checkbox" data-quitable="${nombre}" id="q${i}" checked />
            <span>${nombre}</span>
          </label>
        `,
      )}
    </fieldset>
  `;
}

/** Extras que cuestan y suman al total. */
function bloqueExtras(producto) {
  const lista = (Array.isArray(producto.extras) ? producto.extras : []).filter((e) => e?.nombre);
  if (!lista.length) return "";
  return html`
    <fieldset class="opciones-cliente">
      <legend>Agregar extra</legend>
      <p class="opciones-cliente-ayuda">Se suma a tu total.</p>
      ${lista.map(
        (extra, i) => html`
          <label class="opcion-check opcion-check--extra">
            <input
              type="checkbox"
              data-extra="${extra.nombre}"
              data-precio="${extra.precio || 0}"
              id="e${i}"
            />
            <span>${extra.nombre}</span>
            <strong class="opcion-precio-etiqueta">+${dinero(extra.precio || 0)}</strong>
          </label>
        `,
      )}
    </fieldset>
  `;
}

/** Variantes configurables: salsa, tamaño, tortilla, sabor, etc. */
function bloqueGrupos(producto) {
  const grupos = (Array.isArray(producto.optionGroups) ? producto.optionGroups : []).filter(
    (grupo) => grupo?.name && Array.isArray(grupo.options) && grupo.options.length,
  );
  if (!grupos.length) return "";

  return html`${grupos.map((grupo, indiceGrupo) => {
    const minimo = Math.max(grupo.required ? 1 : 0, Number(grupo.minSelected || 0));
    const maximo = Math.max(1, Number(grupo.maxSelected || 1));
    const tipo = maximo === 1 ? "radio" : "checkbox";
    const ayuda = maximo === 1
      ? minimo > 0 ? "Elige una opción." : "Opcional: elige una opción."
      : `Elige ${minimo ? `de ${minimo} a ` : "hasta "}${maximo}.`;
    return html`
      <fieldset
        class="opciones-cliente opciones-cliente--grupo"
        data-option-group="${grupo.id}"
        data-group-name="${grupo.name}"
        data-min="${minimo}"
        data-max="${maximo}"
      >
        <legend>${grupo.name}${minimo ? " · obligatorio" : ""}</legend>
        <p class="opciones-cliente-ayuda">${ayuda}</p>
        ${grupo.options.map(
          (opcion, indiceOpcion) => html`
            <label class="opcion-check opcion-check--extra">
              <input
                type="${tipo}"
                name="grupo-${indiceGrupo}"
                data-group-option
                data-group-id="${grupo.id}"
                data-group-name="${grupo.name}"
                data-option-id="${opcion.id || `${indiceGrupo}-${indiceOpcion}`}"
                data-option-name="${opcion.name}"
                data-precio="${Number(opcion.price) || 0}"
              />
              <span>${opcion.name}</span>
              ${Number(opcion.price)
                ? html`<strong class="opcion-precio-etiqueta">+${dinero(opcion.price)}</strong>`
                : ""}
            </label>
          `,
        )}
        <p class="campo-error opcion-grupo-error" data-group-error hidden></p>
      </fieldset>
    `;
  })}`;
}

/** Hoja de producto: cantidad + nota antes de agregar. */
export function abrirProducto(producto, tienda) {
  if (!productoCompatibleConModo(producto, tienda)) {
    toast(`Este producto no está disponible para ${estado.modoPedido.toLowerCase()}.`, "error");
    return;
  }
  let cantidad = 1;
  const final = precioFinal(producto);
  const { abierta } = estadoTienda(tienda);
  const enlaceProducto = `${location.origin}${location.pathname}#/tienda/${tienda.slug || tienda.id}`;
  const mensajeDuda = `Hola ${tienda.name}, vi ${producto.title} en PuebloPedidos. ¿Me ayudas con una duda? ${enlaceProducto}`;

  const { nodo, cerrar } = abrirHoja({
    titulo: producto.title,
    cuerpo: html`
      <img
        src="${urlSegura(producto.image) || urlSegura(imagenPorCategoria(producto.productCategory))}"
        data-respaldo="${urlSegura(imagenPorCategoria(producto.productCategory))}"
        alt="${producto.title}"
        class="previa previa--hoja"
        decoding="async"
      />
      <div class="menu-fila-etiquetas">
        <span class="sello sello--modo">${etiquetaTipo(producto.type)}</span>
        <span class="sello sello--modo">${etiquetaModo(producto.availability)}</span>
        ${estaPromocionado(producto) ? html`<span class="sello sello--promo">Promocionado</span>` : ""}
        ${selloDescuento(producto)}
      </div>
      <h2 class="hoja-titulo">${producto.title}</h2>
      <p class="hoja-descripcion">${producto.description}</p>

      <!-- Precio y tienda en su propia fila: antes iban en el flujo de
           texto y se peleaban el ancho, así que el nombre de la tienda se
           partía en un renglón por palabra. -->
      <div class="hoja-precio-fila">
        ${precioHtml(producto)}
        <a class="hoja-tienda" href="#/tienda/${tienda.slug || tienda.id}">
          ${icono.tienda()}
          <span>${tienda.name}</span>
        </a>
      </div>
      ${detalleTipo(producto)}
      ${abierta
        ? ""
        : html`<p class="campo-error" style="margin-top:var(--e-3)">
            ${tienda.name} está cerrado ahora. Puedes agregarlo y enviar el pedido cuando abra.
          </p>`}
      ${bloqueQuitables(producto)}
      ${bloqueExtras(producto)}
      ${bloqueGrupos(producto)}

      <a
        class="boton boton--wa boton--ancho producto-pregunta"
        href="https://wa.me/${normalizarWhatsApp(tienda.phone)}?text=${encodeURIComponent(mensajeDuda)}"
        target="_blank"
        rel="noopener"
      >
        ${icono.wa()} Preguntar por este producto
      </a>

      <label class="campo" style="margin-top:var(--e-4)">
        <span>Comentario para la cocina</span>
        <textarea data-nota placeholder="Ej. bien dorado, salsa aparte" maxlength="200"></textarea>
        <small>
          Solo indicaciones sobre <strong>este</strong> producto. Si quieres pedir algo más,
          agrégalo desde el menú: lo que escribas aquí no se cobra ni se prepara aparte.
        </small>
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
  /** Lo que el cliente desmarcó de "Lleva". */
  const leerSinQue = () =>
    [...nodo.querySelectorAll("[data-quitable]")]
      .filter((c) => !c.checked)
      .map((c) => c.dataset.quitable);

  /** Los extras que marcó, con su precio. */
  const leerExtras = () =>
    [...nodo.querySelectorAll("[data-extra]:checked")].map((c) => ({
      nombre: c.dataset.extra,
      precio: Number(c.dataset.precio) || 0,
    }));

  const precioConExtras = () =>
    final
    + leerExtras().reduce((suma, e) => suma + e.precio, 0)
    + leerOpcionesGrupo().reduce((suma, opcion) => suma + opcion.price, 0);

  const leerOpcionesGrupo = () =>
    [...nodo.querySelectorAll("[data-group-option]:checked")].map((campo) => ({
      groupId: campo.dataset.groupId,
      groupName: campo.dataset.groupName,
      optionId: campo.dataset.optionId,
      name: campo.dataset.optionName,
      price: Number(campo.dataset.precio) || 0,
    }));

  const validarGrupos = () => {
    let valido = true;
    nodo.querySelectorAll("[data-option-group]").forEach((grupo) => {
      const elegidas = grupo.querySelectorAll("[data-group-option]:checked").length;
      const minimo = Number(grupo.dataset.min || 0);
      const maximo = Number(grupo.dataset.max || 1);
      const error = grupo.querySelector("[data-group-error]");
      let mensaje = "";
      if (elegidas < minimo) mensaje = `Elige al menos ${minimo} en ${grupo.dataset.groupName}.`;
      if (elegidas > maximo) mensaje = `Elige máximo ${maximo} en ${grupo.dataset.groupName}.`;
      error.textContent = mensaje;
      error.hidden = !mensaje;
      grupo.classList.toggle("opciones-cliente--error", Boolean(mensaje));
      if (mensaje) valido = false;
    });
    return valido;
  };

  /** El botón muestra siempre lo que se va a cobrar de verdad. */
  const refrescarTotal = () => {
    const boton = nodo.querySelector("[data-agregar]");
    if (boton) pintarEn(boton, html`Agregar · ${dinero(precioConExtras() * cantidad)}`);
  };

  // Marcar un extra cambia el total al instante: nadie debe descubrir el
  // cargo hasta el carrito.
  delegar(nodo, "change", "[data-extra]", refrescarTotal);
  delegar(nodo, "change", "[data-group-option]", (_ev, campo) => {
    const grupo = campo.closest("[data-option-group]");
    if (campo.type === "checkbox" && grupo) {
      const maximo = Number(grupo.dataset.max || 1);
      const elegidas = [...grupo.querySelectorAll("[data-group-option]:checked")];
      if (elegidas.length > maximo) {
        campo.checked = false;
        toast(`Puedes elegir máximo ${maximo} en ${grupo.dataset.groupName}.`, "error");
      }
    }
    validarGrupos();
    refrescarTotal();
  });
  refrescarTotal();

  nodo.querySelector("[data-agregar]").addEventListener("click", () => {
    if (!productoCompatibleConModo(producto, tienda)) {
      toast(`Este producto no está disponible para ${estado.modoPedido.toLowerCase()}.`, "error");
      return;
    }
    if (!validarGrupos()) {
      nodo.querySelector(".opciones-cliente--error")?.scrollIntoView({ behavior: "smooth", block: "center" });
      toast("Completa las opciones obligatorias.", "error");
      return;
    }
    const agregado = agregarAlCarrito({
      producto,
      tienda,
      cantidad,
      nota: nodo.querySelector("[data-nota]").value,
      precio: precioConExtras(),
      sinQue: leerSinQue(),
      extras: leerExtras(),
      selectedOptions: leerOpcionesGrupo(),
    });
    if (!agregado) {
      toast(`No se pudo agregar para ${estado.modoPedido.toLowerCase()}.`, "error");
      return;
    }
    cerrar();
    toast(`${producto.title} agregado al carrito.`);
  });
}

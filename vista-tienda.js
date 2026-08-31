// Perfil público de la tienda. Cada tienda tiene su propio link:
// #/tienda/tacos-don-luis  → esto es lo que el negocio pega en su estado
// de WhatsApp y en su rótulo. Es la mitad del valor del producto.

import { html, pintarEn, delegar, urlSegura, copiar } from "./lib-dom.js";
import { icono, toast, vacio, esqueletoLista, abrirHoja } from "./lib-ui.js";
import * as repo from "./datos-repo.js";
import { estado, fijar } from "./estado.js";
import {
  etiquetaModo,
  proximaApertura,
  normalizarWhatsApp,
} from "./lib-formato.js";
import { estadoTienda, metaTienda, filaMenu, abrirProducto } from "./vista-piezas.js";
import { imagenPorCategoria } from "./datos-semillas.js";

const DIAS = ["Domingo", "Lunes", "Martes", "Miércoles", "Jueves", "Viernes", "Sábado"];

export async function vistaTienda(contenedor, { slug }) {
  pintarEn(contenedor, html`<div class="esqueleto" style="height:180px"></div>${esqueletoLista(3)}`);

  let tienda;
  let productos = [];
  try {
    tienda = await repo.tienda(slug);
    if (!tienda) throw new Error("no existe");
    productos = await repo.productos(tienda.id);
  } catch {
    pintarEn(
      contenedor,
      vacio({
        titulo: "No encontramos ese negocio",
        texto: "Quizá cambió de nombre o ya no está publicado.",
        accion: html`<a class="boton boton--principal" href="#/">Ver el pueblo</a>`,
      }),
    );
    return;
  }

  const { abierta, sello, detalle } = estadoTienda(tienda);
  const modo = estado.modoPedido === "Entrega" ? "delivery" : "pickup";
  const disponibles = productos.filter(
    (p) => p.availability === "both" || p.availability === modo,
  );
  const enlace = `${location.origin}${location.pathname}#/tienda/${tienda.slug || tienda.id}`;
  const mensajeDuda = `Hola ${tienda.name}, vi tu tienda en PuebloPedidos. ¿Me ayudas con una duda? ${enlace}`;

  pintarEn(
    contenedor,
    html`
      <div class="tienda-hero">
        <img
          src="${urlSegura(tienda.cover) || urlSegura(imagenPorCategoria(tienda.category))}"
          data-respaldo="${urlSegura(imagenPorCategoria(tienda.category))}"
          alt=""
          decoding="async"
        />
        <a class="tienda-hero-atras" href="#/" aria-label="Volver">${icono.atras()}</a>
      </div>

      <section class="tienda-ficha">
        <div style="display:flex;gap:var(--e-2);flex-wrap:wrap;margin-bottom:var(--e-2)">
          ${sello}
          <span class="sello sello--modo">${etiquetaModo(tienda.serviceModes)}</span>
        </div>
        <h1>${tienda.name}</h1>
        <div class="tienda-meta">
          <span>${tienda.category}</span>
          ${metaTienda(tienda).map((m) => html`<span class="punto">${m}</span>`)}
        </div>
        <p style="margin-top:var(--e-2);color:var(--tinta-80);font-size:var(--t-sm)">${tienda.description}</p>
        <p style="margin-top:var(--e-1);color:var(--tinta-60);font-size:var(--t-sm)">${tienda.address}</p>
        ${detalle ? html`<p class="campo-error" style="margin-top:var(--e-2)">${detalle}</p>` : ""}

        <div class="tienda-acciones">
          <a
            class="boton boton--wa boton--chico"
            href="https://wa.me/${normalizarWhatsApp(tienda.phone)}?text=${encodeURIComponent(mensajeDuda)}"
            target="_blank"
            rel="noopener"
          >
            ${icono.wa()} Preguntar
          </a>
          <button class="boton boton--contorno boton--chico" data-horario type="button">Ver horario</button>
          <button class="boton boton--contorno boton--chico" data-copiar type="button">
            ${icono.copiar()} Copiar link
          </button>
        </div>
      </section>

      <div class="seccion-cabeza">
        <div>
          <h2>Menú</h2>
          <p>${disponibles.length} para ${estado.modoPedido.toLowerCase()}</p>
        </div>
      </div>
      <div class="menu-lista" data-menu></div>
    `,
  );

  const menu = contenedor.querySelector("[data-menu]");
  if (!disponibles.length) {
    const sinCatalogo = productos.length === 0;
    const otroModo = estado.modoPedido === "Entrega" ? "Recoger" : "Entrega";
    pintarEn(
      menu,
      vacio({
        titulo: sinCatalogo ? "Este catálogo se está preparando" : `Nada para ${estado.modoPedido.toLowerCase()}`,
        texto: sinCatalogo
          ? `${tienda.name} todavía no publica productos. Puedes preguntarle directamente por WhatsApp.`
          : `No hay productos disponibles para ${estado.modoPedido.toLowerCase()}, pero puedes revisar el otro tipo de pedido.`,
        accion: sinCatalogo
          ? html`<a class="boton boton--wa" href="https://wa.me/${normalizarWhatsApp(tienda.phone)}?text=${encodeURIComponent(mensajeDuda)}" target="_blank" rel="noopener">${icono.wa()} Preguntar al negocio</a>`
          : html`<button class="boton boton--principal" data-cambiar-modo type="button">Ver para ${otroModo.toLowerCase()}</button>`,
      }),
    );
    menu.querySelector("[data-cambiar-modo]")?.addEventListener("click", () => {
      fijar({ modoPedido: otroModo });
      vistaTienda(contenedor, { slug });
    });
  } else {
    pintarEn(menu, disponibles.map((p) => filaMenu(p)));
  }

  delegar(contenedor, "click", "[data-producto]", (_ev, boton) => {
    const producto = disponibles.find((p) => p.id === boton.dataset.producto);
    if (producto) abrirProducto(producto, tienda);
  });

  contenedor.querySelector("[data-copiar]").addEventListener("click", async () => {
    try {
      await copiar(enlace);
      toast("Link copiado. Ya lo puedes pegar en WhatsApp.");
    } catch {
      toast("No se pudo copiar. Copia la dirección del navegador.", "error");
    }
  });

  contenedor.querySelector("[data-horario]").addEventListener("click", () => {
    abrirHoja({
      titulo: `Horario de ${tienda.name}`,
      cuerpo: horarioHtml(tienda, abierta),
      pie: html`
        <a
          class="boton boton--wa boton--ancho"
          href="https://wa.me/${normalizarWhatsApp(tienda.phone)}"
          target="_blank"
          rel="noopener"
        >
          ${icono.wa()} Escribir al negocio
        </a>
      `,
    });
  });
}

function horarioHtml(tienda, abierta) {
  if (!tienda.schedule) {
    return html`<p style="color:var(--tinta-60)">Este negocio todavía no publica su horario.</p>`;
  }
  const hoy = new Date().getDay();
  return html`
    <p style="margin-bottom:var(--e-3)">
      ${abierta
        ? html`<span class="sello sello--abierto">Abierto ahora</span>`
        : html`<span class="sello sello--cerrado">Cerrado</span> ${proximaApertura(tienda)}`}
    </p>
    <table class="tabla">
      <tbody>
        ${DIAS.map((nombre, indice) => {
          const franjas = tienda.schedule[String(indice)] || [];
          return html`
            <tr style="${indice === hoy ? "font-weight:var(--peso-fuerte)" : ""}">
              <td>${nombre}${indice === hoy ? " · hoy" : ""}</td>
              <td>
                ${franjas.length
                  ? franjas.map(([a, b]) => html`<div>${a} a ${b}</div>`)
                  : html`<span style="color:var(--tinta-40)">Cerrado</span>`}
              </td>
            </tr>
          `;
        })}
      </tbody>
    </table>
  `;
}

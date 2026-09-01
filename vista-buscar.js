// Búsqueda instantánea sobre tiendas y productos a la vez.
// Antes solo filtraba el arreglo de productos ya pintado; ahora un mismo
// término encuentra "Tacos Don Luis" (tienda) y "Orden de pastor"
// (producto), que es como la gente busca de verdad.

import { html, pintarEn, delegar } from "./lib-dom.js";
import { icono, vacio, esqueletoLista } from "./lib-ui.js";
import { estado, fijar, disponibleEnModo, productoCompatibleConModo } from "./estado.js";
import * as repo from "./datos-repo.js";
import { tarjetaTienda, filaMenu, abrirProducto } from "./vista-piezas.js";

let catalogo = [];
let tiendas = [];

export async function vistaBuscar(contenedor) {
  pintarEn(
    contenedor,
    html`
      <div class="home-cabeza">
        <h1>Buscar</h1>
        <div class="modo-switch" role="group" aria-label="Tipo de pedido">
          <button data-modo-buscar="Entrega" type="button" aria-pressed="${estado.modoPedido === "Entrega"}">Entrega</button>
          <button data-modo-buscar="Recoger" type="button" aria-pressed="${estado.modoPedido === "Recoger"}">Recoger</button>
        </div>
      </div>
      <div class="buscador" style="margin-top:var(--e-3)">
        ${icono.buscar()}
        <input
          type="search"
          data-q
          value="${estado.busqueda}"
          placeholder="Tacos, pastel, tornillos, plomero..."
          aria-label="Buscar"
          autocomplete="off"
        />
      </div>
      <div data-zona style="margin-top:var(--e-4)">${esqueletoLista(3)}</div>
    `,
  );

  const campo = contenedor.querySelector("[data-q]");
  campo.focus({ preventScroll: true });

  let temporizador;
  campo.addEventListener("input", () => {
    clearTimeout(temporizador);
    // 120 ms: lo justo para no repintar en cada tecla, no tanto como para
    // que se sienta lento.
    temporizador = setTimeout(() => {
      fijar({ busqueda: campo.value });
      pintarResultados(contenedor);
    }, 120);
  });

  delegar(contenedor, "click", "[data-producto]", (_ev, boton) => {
    const producto = catalogo.find((p) => p.id === boton.dataset.producto);
    if (producto) abrirProducto(producto, producto.tienda);
  });

  delegar(contenedor, "click", "[data-modo-buscar]", (_ev, boton) => {
    fijar({ modoPedido: boton.dataset.modoBuscar });
    contenedor.querySelectorAll("[data-modo-buscar]").forEach((opcion) => {
      opcion.setAttribute("aria-pressed", String(opcion.dataset.modoBuscar === estado.modoPedido));
    });
    pintarResultados(contenedor);
  });

  [tiendas, catalogo] = await Promise.all([repo.tiendas(), repo.catalogo()]);
  pintarResultados(contenedor);
}

function normalizar(texto) {
  return String(texto || "")
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase();
}

/**
 * Cuántos productos tiene cada tienda.
 *
 * La tarjeta recibe `conteo` con default 0, y esta vista nunca se lo
 * pasaba: TODAS las tiendas decían "0 productos" aunque tuvieran menú.
 * Un negocio que aparece vacío en la búsqueda es un negocio que no
 * vende.
 */
function conteoPorTienda(productos) {
  const mapa = new Map();
  productos.forEach((p) => {
    mapa.set(p.storeId, (mapa.get(p.storeId) || 0) + 1);
  });
  return mapa;
}

function resultadosDelModo(modoPedido = estado.modoPedido) {
  const productos = catalogo.filter((producto) =>
    productoCompatibleConModo(producto, producto.tienda, modoPedido),
  );
  const conCualquierProducto = new Set(catalogo.map((producto) => producto.storeId));
  const conProductoCompatible = new Set(productos.map((producto) => producto.storeId));
  const negocios = tiendas.filter(
    (tienda) =>
      disponibleEnModo(tienda.serviceModes, modoPedido) &&
      (!conCualquierProducto.has(tienda.id) || conProductoCompatible.has(tienda.id)),
  );
  return { productos, negocios };
}

function pintarResultados(contenedor) {
  const zona = contenedor.querySelector("[data-zona]");
  const q = normalizar(estado.busqueda).trim();
  const { productos: productosDelModo, negocios: tiendasDelModo } = resultadosDelModo();
  const conteos = conteoPorTienda(productosDelModo);

  if (!q) {
    pintarEn(
      zona,
      html`
        <div class="seccion-cabeza"><h2>Negocios para ${estado.modoPedido.toLowerCase()}</h2></div>
        <div class="lista-tiendas">
          ${tiendasDelModo
            .slice(0, 6)
            .map((t) => tarjetaTienda(t, { fila: true, conteo: conteos.get(t.id) || 0 }))}
        </div>
      `,
    );
    return;
  }

  const tiendasEncontradas = tiendasDelModo.filter((t) =>
    [t.name, t.category, t.description, t.address].some((campo) => normalizar(campo).includes(q)),
  );
  const productosEncontrados = productosDelModo.filter((p) =>
    [p.title, p.description, p.productCategory, p.tienda?.name].some((campo) =>
      normalizar(campo).includes(q),
    ),
  );

  if (!tiendasEncontradas.length && !productosEncontrados.length) {
    const alterno = estado.modoPedido === "Entrega" ? "Recoger" : "Entrega";
    const otros = resultadosDelModo(alterno);
    const hayEnOtroModo = otros.negocios.some((tienda) =>
      [tienda.name, tienda.category, tienda.description, tienda.address].some((valor) => normalizar(valor).includes(q)),
    ) || otros.productos.some((producto) =>
      [producto.title, producto.description, producto.productCategory, producto.tienda?.name].some((valor) =>
        normalizar(valor).includes(q),
      ),
    );
    pintarEn(
      zona,
      vacio({
        titulo: `Sin resultados para “${estado.busqueda}”`,
        texto: hayEnOtroModo
          ? `Sí encontramos opciones para ${alterno.toLowerCase()}.`
          : "Revisa cómo se escribe o busca por categoría, por ejemplo: tacos, pizza, postres.",
        accion: hayEnOtroModo
          ? html`<button class="boton boton--principal" data-modo-buscar="${alterno}" type="button">Ver para ${alterno.toLowerCase()}</button>`
          : html`<a class="boton boton--contorno" href="#/">Ver todos los negocios</a>`,
      }),
    );
    return;
  }

  pintarEn(
    zona,
    html`
      ${tiendasEncontradas.length
        ? html`
            <div class="seccion-cabeza">
              <h2>Negocios</h2>
              <p>${tiendasEncontradas.length}</p>
            </div>
            <div class="lista-tiendas" style="margin-bottom:var(--e-6)">
              ${tiendasEncontradas.map((t) =>
                tarjetaTienda(t, { fila: true, conteo: conteos.get(t.id) || 0 }),
              )}
            </div>
          `
        : ""}
      ${productosEncontrados.length
        ? html`
            <div class="seccion-cabeza">
              <h2>Productos</h2>
              <p>${productosEncontrados.length}</p>
            </div>
            <div class="menu-lista">
              ${productosEncontrados.slice(0, 40).map((p) => filaMenu(p, { tienda: p.tienda }))}
            </div>
          `
        : ""}
    `,
  );
}

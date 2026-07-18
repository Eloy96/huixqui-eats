// Búsqueda instantánea sobre tiendas y productos a la vez.
// Antes solo filtraba el arreglo de productos ya pintado; ahora un mismo
// término encuentra "Tacos Don Luis" (tienda) y "Orden de pastor"
// (producto), que es como la gente busca de verdad.

import { html, pintarEn, delegar } from "./lib-dom.js";
import { icono, vacio, esqueletoLista } from "./lib-ui.js";
import { estado, fijar } from "./estado.js";
import * as repo from "./datos-repo.js";
import { tarjetaTienda, filaMenu, abrirProducto } from "./vista-piezas.js";

let catalogo = [];
let tiendas = [];

export async function vistaBuscar(contenedor) {
  pintarEn(
    contenedor,
    html`
      <h1>Buscar</h1>
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

  [tiendas, catalogo] = await Promise.all([repo.tiendas(), repo.catalogo()]);
  pintarResultados(contenedor);
}

function normalizar(texto) {
  return String(texto || "")
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase();
}

function pintarResultados(contenedor) {
  const zona = contenedor.querySelector("[data-zona]");
  const q = normalizar(estado.busqueda).trim();

  if (!q) {
    pintarEn(
      zona,
      html`
        <div class="seccion-cabeza"><h2>Categorías</h2></div>
        <div class="lista-tiendas">${tiendas.slice(0, 6).map((t) => tarjetaTienda(t, { fila: true }))}</div>
      `,
    );
    return;
  }

  const tiendasEncontradas = tiendas.filter((t) =>
    [t.name, t.category, t.description, t.address].some((campo) => normalizar(campo).includes(q)),
  );
  const productosEncontrados = catalogo.filter((p) =>
    [p.title, p.description, p.productCategory, p.tienda?.name].some((campo) =>
      normalizar(campo).includes(q),
    ),
  );

  if (!tiendasEncontradas.length && !productosEncontrados.length) {
    pintarEn(
      zona,
      vacio({
        titulo: `Sin resultados para “${estado.busqueda}”`,
        texto: "Revisa cómo se escribe o busca por categoría, por ejemplo: tacos, pizza, postres.",
        accion: html`<a class="boton boton--contorno" href="#/">Ver todos los negocios</a>`,
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
              ${tiendasEncontradas.map((t) => tarjetaTienda(t, { fila: true }))}
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

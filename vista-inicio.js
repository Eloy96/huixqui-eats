// Home. Cambio de fondo respecto a la versión anterior: la lista ya no
// sale en orden de creación. Sale ordenada por (abierto, cercanía). Eso
// es lo que hace que Uber Eats se sienta útil y una lista fija no.

import { html, pintarEn, delegar } from "./lib-dom.js";
import { icono, esqueletoCarrusel, vacio } from "./lib-ui.js";
import { estado, fijar } from "./estado.js";
import * as repo from "./datos-repo.js";
import { CATEGORIAS } from "./datos-semillas.js";
import { estaAbierta, distanciaKm, estaPromocionado } from "./lib-formato.js";
import { tarjetaTienda, filaMenu, abrirProducto } from "./vista-piezas.js";

export async function vistaInicio(contenedor) {
  pintarEn(
    contenedor,
    html`
      <div class="home-cabeza">
        <div>
          <h1>¿Qué se te antoja?</h1>
          <p style="color:var(--tinta-60);font-size:var(--t-sm)">
            Pide a los negocios del pueblo. El pedido llega por WhatsApp.
          </p>
        </div>
        <div class="modo-switch" role="group" aria-label="Tipo de pedido">
          <button data-modo="Entrega" type="button" aria-pressed="${estado.modoPedido === "Entrega"}">
            Entrega
          </button>
          <button data-modo="Recoger" type="button" aria-pressed="${estado.modoPedido === "Recoger"}">
            Recoger
          </button>
        </div>
      </div>

      <div class="buscador">
        ${icono.buscar()}
        <input
          type="search"
          placeholder="Buscar tacos, pastel, plomero..."
          aria-label="Buscar en el pueblo"
          data-ir-buscar
        />
      </div>

      <section class="seccion" data-zona="promos"></section>
      <section class="seccion" data-zona="categorias"></section>
      <section class="seccion" data-zona="tiendas">
        <div class="seccion-cabeza"><h2>Negocios del pueblo</h2></div>
        ${esqueletoCarrusel(3)}
      </section>
    `,
  );

  contenedor.querySelector("[data-ir-buscar]").addEventListener("focus", () => {
    location.hash = "#/buscar";
  });

  delegar(contenedor, "click", "[data-modo]", (_ev, boton) => {
    fijar({ modoPedido: boton.dataset.modo });
    vistaInicio(contenedor);
  });

  delegar(contenedor, "click", "[data-categoria]", (_ev, boton) => {
    fijar({ categoria: boton.dataset.categoria });
    pintarTiendas(contenedor);
    pintarCategorias(contenedor);
  });

  await cargar(contenedor);
}

let datos = { tiendas: [], productos: [] };

async function cargar(contenedor) {
  try {
    const [listaTiendas, catalogoCompleto] = await Promise.all([repo.tiendas(), repo.catalogo()]);
    datos = { tiendas: listaTiendas, productos: catalogoCompleto };
  } catch (error) {
    pintarEn(
      contenedor.querySelector('[data-zona="tiendas"]'),
      vacio({
        titulo: "No pudimos cargar los negocios",
        texto: error.message,
        accion: html`<button class="boton boton--contorno" onclick="location.reload()" type="button">Reintentar</button>`,
      }),
    );
    return;
  }
  pintarPromos(contenedor);
  pintarCategorias(contenedor);
  pintarTiendas(contenedor);
}

function disponible(producto) {
  const modo = estado.modoPedido === "Entrega" ? "delivery" : "pickup";
  return producto.availability === "both" || producto.availability === modo;
}

function tiendaDisponible(tienda) {
  const modo = estado.modoPedido === "Entrega" ? "delivery" : "pickup";
  return tienda.serviceModes === "both" || tienda.serviceModes === modo;
}

/** El orden del home: abiertas primero, luego más cerca, luego promocionadas. */
function ordenar(a, b) {
  const abiertaA = estaAbierta(a) ? 0 : 1;
  const abiertaB = estaAbierta(b) ? 0 : 1;
  if (abiertaA !== abiertaB) return abiertaA - abiertaB;
  const kmA = distanciaKm(estado.ubicacion, a.coords);
  const kmB = distanciaKm(estado.ubicacion, b.coords);
  if (kmA !== null && kmB !== null && Math.abs(kmA - kmB) > 0.05) return kmA - kmB;
  return String(a.name).localeCompare(String(b.name), "es");
}

function pintarPromos(contenedor) {
  const promos = datos.productos
    .filter((p) => estaPromocionado(p) && disponible(p) && tiendaDisponible(p.tienda))
    .slice(0, 8);
  const zona = contenedor.querySelector('[data-zona="promos"]');
  if (!promos.length) {
    pintarEn(zona, "");
    return;
  }
  pintarEn(
    zona,
    html`
      <div class="seccion-cabeza">
        <div>
          <h2>Promocionados hoy</h2>
          <p>Espacios pagados por los negocios</p>
        </div>
      </div>
      <div class="carrusel">
        ${promos.map(
          (p) => html`
            <div style="width:260px">
              ${filaMenu(p, { tienda: p.tienda })}
            </div>
          `,
        )}
      </div>
    `,
  );
  delegar(zona, "click", "[data-producto]", (_ev, boton) => {
    const producto = datos.productos.find((p) => p.id === boton.dataset.producto);
    if (producto) abrirProducto(producto, producto.tienda);
  });
}

function pintarCategorias(contenedor) {
  const activas = CATEGORIAS.filter((c) =>
    datos.tiendas.some((t) => t.category === c && tiendaDisponible(t)),
  );
  const conteo = (categoria) =>
    datos.tiendas.filter((t) => tiendaDisponible(t) && (categoria === "Todos" || t.category === categoria))
      .length;

  pintarEn(
    contenedor.querySelector('[data-zona="categorias"]'),
    html`
      <div class="categorias" role="group" aria-label="Categorías">
        ${["Todos", ...activas].map(
          (categoria) => html`
            <button
              class="chip"
              type="button"
              data-categoria="${categoria}"
              aria-pressed="${estado.categoria === categoria}"
            >
              ${categoria} <small>${conteo(categoria)}</small>
            </button>
          `,
        )}
      </div>
    `,
  );
}

function pintarTiendas(contenedor) {
  const lista = datos.tiendas
    .filter(tiendaDisponible)
    .filter((t) => estado.categoria === "Todos" || t.category === estado.categoria)
    .sort(ordenar);

  const zona = contenedor.querySelector('[data-zona="tiendas"]');
  const conteos = new Map(
    datos.tiendas.map((t) => [
      t.id,
      datos.productos.filter((p) => p.storeId === t.id && disponible(p)).length,
    ]),
  );

  if (!lista.length) {
    pintarEn(
      zona,
      html`
        <div class="seccion-cabeza"><h2>Negocios del pueblo</h2></div>
        ${vacio({
          titulo: "Nada por aquí todavía",
          texto:
            estado.categoria === "Todos"
              ? `Ningún negocio ofrece ${estado.modoPedido.toLowerCase()} por ahora. Prueba el otro modo.`
              : `No hay negocios de ${estado.categoria} con ${estado.modoPedido.toLowerCase()}.`,
          accion: html`<button class="boton boton--contorno" data-categoria="Todos" type="button">Ver todo</button>`,
        })}
      `,
    );
    return;
  }

  const abiertas = lista.filter((t) => estaAbierta(t));
  const cerradas = lista.filter((t) => !estaAbierta(t));

  pintarEn(
    zona,
    html`
      <div class="seccion-cabeza">
        <div>
          <h2>Negocios del pueblo</h2>
          <p>${abiertas.length} abierto${abiertas.length === 1 ? "" : "s"} ahora · ${estado.modoPedido.toLowerCase()}</p>
        </div>
      </div>
      <div class="lista-tiendas">
        ${abiertas.map((t) => tarjetaTienda(t, { fila: true, conteo: conteos.get(t.id) || 0 }))}
      </div>
      ${cerradas.length
        ? html`
            <div class="seccion-cabeza" style="margin-top:var(--e-6)">
              <div>
                <h2 style="font-size:var(--t-lg)">Cerrados ahora</h2>
                <p>Puedes ver el menú y pedir cuando abran</p>
              </div>
            </div>
            <div class="lista-tiendas">
              ${cerradas.map((t) => tarjetaTienda(t, { fila: true, conteo: conteos.get(t.id) || 0 }))}
            </div>
          `
        : ""}
    `,
  );
}

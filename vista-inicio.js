// Home. Cambio de fondo respecto a la versión anterior: la lista ya no
// sale en orden de creación. Sale ordenada por (abierto, cercanía). Eso
// es lo que hace que Uber Eats se sienta útil y una lista fija no.

import { html, pintarEn, delegar } from "./lib-dom.js";
import { icono, esqueletoCarrusel, vacio } from "./lib-ui.js";
import { estado, fijar } from "./estado.js";
import * as repo from "./datos-repo.js";
import { CATEGORIAS } from "./datos-semillas.js";
import { estaAbierta, distanciaKm, etiquetaDistancia, estaPromocionado } from "./lib-formato.js";
import { abrirSelectorUbicacion } from "./vista-ubicacion.js";
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

      <div class="orden-barra" data-zona="orden"></div>

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

  delegar(contenedor, "click", "[data-orden]", (_ev, boton) => {
    const quiereCercania = boton.dataset.orden === "cerca";
    // Pedir "más cercanos" sin ubicación no puede fallar en silencio:
    // abrimos el selector y al volver se aplica solo.
    if (quiereCercania && !estado.ubicacion) {
      abrirSelectorUbicacion(() => {
        if (estado.ubicacion) fijar({ ordenCercania: true });
        vistaInicio(contenedor);
      });
      return;
    }
    fijar({ ordenCercania: quiereCercania });
    pintarOrden(contenedor);
    pintarTiendas(contenedor);
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
  pintarOrden(contenedor);
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

/**
 * Abiertas siempre primero: un negocio cerrado a 100 m no le sirve a nadie
 * que tiene hambre ahora. Dentro de las abiertas, el usuario elige entre
 * cercanía y orden alfabético.
 */
function ordenar(a, b) {
  // Abiertas primero, SIEMPRE. Un destacado cerrado arriba no le sirve a
  // nadie: el cliente no puede pedirle, y el negocio quema su lugar pagado
  // en un momento en que no puede vender.
  const abiertaA = estaAbierta(a) ? 0 : 1;
  const abiertaB = estaAbierta(b) ? 0 : 1;
  if (abiertaA !== abiertaB) return abiertaA - abiertaB;

  // Ya dentro de las abiertas, el destacado (plan $200) va primero: es
  // exactamente lo que paga.
  const destA = a.plan === "destacado" ? 0 : 1;
  const destB = b.plan === "destacado" ? 0 : 1;
  if (destA !== destB) return destA - destB;

  if (estado.ordenCercania && estado.ubicacion) {
    const kmA = distanciaKm(estado.ubicacion, a.coords);
    const kmB = distanciaKm(estado.ubicacion, b.coords);
    // Los que no tienen coordenadas van al final, no al principio.
    if (kmA === null && kmB !== null) return 1;
    if (kmB === null && kmA !== null) return -1;
    if (kmA !== null && kmB !== null && Math.abs(kmA - kmB) > 0.05) return kmA - kmB;
  }
  return String(a.name).localeCompare(String(b.name), "es");
}

function pintarOrden(contenedor) {
  const zona = contenedor.querySelector('[data-zona="orden"]');
  if (!zona) return;
  const conUbicacion = Boolean(estado.ubicacion);
  const cercania = conUbicacion && estado.ordenCercania;

  pintarEn(
    zona,
    html`
      <span class="orden-etiqueta">Ordenar por</span>
      <div class="orden-opciones" role="group" aria-label="Ordenar negocios">
        <button class="chip" type="button" data-orden="cerca" aria-pressed="${cercania}">
          ${icono.cercania()} Más cercanos
        </button>
        <button class="chip" type="button" data-orden="nombre" aria-pressed="${!cercania}">
          Nombre
        </button>
      </div>
      ${!conUbicacion
        ? html`<span class="orden-nota">Activa tu ubicación para ver los más cercanos</span>`
        : ""}
    `,
  );
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

/** "· el más cerca a 400 m" — solo si de verdad hay con qué medirlo. */
function cercaTexto(abiertas) {
  if (!estado.ubicacion || !estado.ordenCercania || !abiertas.length) return "";
  const km = distanciaKm(estado.ubicacion, abiertas[0].coords);
  if (km === null) return "";
  return ` · el más cerca a ${etiquetaDistancia(km)}`;
}

function pintarTiendas(contenedor) {
  const zona = contenedor.querySelector('[data-zona="tiendas"]');

  const conteos = new Map(
    datos.tiendas.map((t) => [
      t.id,
      datos.productos.filter((p) => p.storeId === t.id && disponible(p)).length,
    ]),
  );

  const lista = datos.tiendas
    .filter(tiendaDisponible)
    // Y además que TENGA algo que vender en este modo. Antes bastaba con
    // que el negocio dijera "entrega y recoger": si todos sus productos
    // eran "solo recoger", en modo Entrega aparecía vacío y el cliente se
    // metía a una tienda sin nada. Prometer algo que no se puede cumplir
    // es peor que no aparecer.
    .filter((t) => conteos.get(t.id) > 0)
    .filter((t) => estado.categoria === "Todos" || t.category === estado.categoria)
    .sort(ordenar);

  // Cuántas quedaron fuera solo por el modo: sirve para explicárselo al
  // cliente en vez de dejarlo con una pantalla vacía sin motivo.
  const ocultasPorModo = datos.tiendas.filter(
    (t) =>
      (estado.categoria === "Todos" || t.category === estado.categoria) &&
      !lista.includes(t) &&
      datos.productos.some((p) => p.storeId === t.id),
  ).length;

  if (!lista.length) {
    pintarEn(
      zona,
      html`
        <div class="seccion-cabeza"><h2>Negocios del pueblo</h2></div>
        ${ocultasPorModo > 0
          ? vacio({
              titulo: `Nadie ofrece ${estado.modoPedido.toLowerCase()} ahora`,
              texto: `Hay ${ocultasPorModo} negocio${ocultasPorModo === 1 ? "" : "s"} disponible${ocultasPorModo === 1 ? "" : "s"} con el otro modo.`,
              accion: html`<button class="boton boton--principal" data-cambiar-modo type="button">
                Ver los de ${estado.modoPedido === "Entrega" ? "recoger" : "entrega"}
              </button>`,
            })
          : vacio({
              titulo: "Nada por aquí todavía",
              texto:
                estado.categoria === "Todos"
                  ? "Todavía no hay negocios publicados."
                  : `No hay negocios de ${estado.categoria} con ${estado.modoPedido.toLowerCase()}.`,
              accion: html`<button class="boton boton--contorno" data-categoria="Todos" type="button">Ver todo</button>`,
            })}
      `,
    );
    // El botón de cambiar de modo, si se pintó.
    const cambiar = zona.querySelector("[data-cambiar-modo]");
    if (cambiar) {
      cambiar.addEventListener("click", () => {
        fijar({ modoPedido: estado.modoPedido === "Entrega" ? "Recoger" : "Entrega" });
        vistaInicio(contenedor);
      });
    }
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
          <p>
            ${abiertas.length} abierto${abiertas.length === 1 ? "" : "s"} ahora ·
            ${estado.modoPedido.toLowerCase()}${cercaTexto(abiertas)}
          </p>
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

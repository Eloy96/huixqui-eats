// Carrito y confirmación.
//
// Aquí vive la firma del producto: el carrito se agrupa por tienda y
// genera UN WhatsApp por tienda. Uber Eats no te deja pedir a dos
// negocios a la vez; en un pueblo eso es justo lo normal (los tacos de
// Don Luis y el pastel de Mía en el mismo mandado).
//
// El descuento de contactos ocurre en el servidor (repo → RPC), no aquí.

import { html, pintarEn, delegar } from "./lib-dom.js";
import { icono, toast, vacio } from "./lib-ui.js";
import {
  estado,
  grupos,
  cambiarCantidad,
  quitarLinea,
  vaciarCarrito,
  totalCarrito,
  piezas,
  itemsParaServidor,
  fijar,
} from "./estado.js";
import * as repo from "./datos-repo.js";
import { dinero, normalizarWhatsApp, estaAbierta } from "./lib-formato.js";

export async function vistaCarrito(contenedor) {
  if (estado.envios.length) {
    pintarEnvios(contenedor);
    return;
  }

  if (!estado.carrito.length) {
    pintarEn(
      contenedor,
      html`
        <h1>Tu carrito</h1>
        <div style="margin-top:var(--e-4)">
          ${vacio({
            titulo: "Todavía no hay nada aquí",
            texto: "Agrega productos de uno o varios negocios. Cada tienda recibe su propio WhatsApp.",
            accion: html`<a class="boton boton--principal" href="#/">Ver negocios</a>`,
          })}
        </div>
      `,
    );
    return;
  }

  const listaTiendas = await repo.tiendas();
  const porId = new Map(listaTiendas.map((t) => [t.id, t]));
  const lista = grupos(porId);
  const sesion = repo.sesion();
  const cliente = sesion?.role === "client" ? sesion.perfil : null;
  const entrega = estado.modoPedido === "Entrega";

  pintarEn(
    contenedor,
    html`
      <h1>Tu carrito</h1>
      <p style="color:var(--tinta-60);font-size:var(--t-sm);margin-top:var(--e-1)">
        ${piezas()} artículo${piezas() === 1 ? "" : "s"} · ${lista.length} negocio${lista.length === 1 ? "" : "s"} ·
        ${estado.modoPedido.toLowerCase()}
      </p>

      <div style="margin-top:var(--e-4)">
        ${lista.map(
          (grupo) => html`
            <article class="carrito-grupo">
              <header class="carrito-grupo-cabeza">
                <div>
                  <strong>${grupo.tienda?.name || "Negocio"}</strong>
                  ${grupo.tienda && !estaAbierta(grupo.tienda)
                    ? html`<span class="sello sello--cerrado" style="margin-left:var(--e-2)">Cerrado</span>`
                    : ""}
                </div>
                <span style="font-weight:var(--peso-fuerte)">${dinero(grupo.total)}</span>
              </header>
              ${grupo.lineas.map(
                (linea) => html`
                  <div class="carrito-linea">
                    <div>
                      <strong>${linea.titulo}</strong>
                      <small>${dinero(linea.precio)} c/u</small>
                      ${linea.nota ? html`<div class="carrito-nota">${linea.nota}</div>` : ""}
                    </div>
                    <div style="display:grid;gap:var(--e-2);justify-items:end">
                      <div class="cantidad">
                        <button data-menos="${linea.lineaId}" type="button" aria-label="Quitar uno de ${linea.titulo}">−</button>
                        <span>${linea.qty}</span>
                        <button data-mas="${linea.lineaId}" type="button" aria-label="Agregar uno de ${linea.titulo}">+</button>
                      </div>
                      <button class="boton boton--texto" data-quitar="${linea.lineaId}" type="button">Quitar</button>
                    </div>
                  </div>
                `,
              )}
            </article>
          `,
        )}
      </div>

      <section class="tarjeta" style="margin-top:var(--e-4)">
        <h2 style="font-size:var(--t-lg);margin-bottom:var(--e-3)">
          ${entrega ? "¿A dónde lo llevamos?" : "¿Quién recoge?"}
        </h2>
        <label class="campo">
          <span>Tu nombre</span>
          <input data-nombre value="${cliente?.name || ""}" placeholder="Como te conocen en el pueblo" />
        </label>
        <label class="campo">
          <span>Tu WhatsApp</span>
          <input data-telefono type="tel" inputmode="numeric" value="${cliente?.phone || ""}" placeholder="10 dígitos" />
        </label>
        ${entrega
          ? html`
              <label class="campo">
                <span>Dirección</span>
                <input data-direccion value="${cliente?.address || ""}" placeholder="Calle, número, colonia" />
              </label>
              <label class="campo">
                <span>Referencia</span>
                <input data-referencia value="${cliente?.reference || ""}" placeholder="Portón verde, junto a la tienda" />
              </label>
            `
          : ""}
      </section>

      <div style="margin-top:var(--e-4)">
        <div class="total-fila"><span>Productos</span><span>${dinero(totalCarrito())}</span></div>
        <div class="total-fila">
          <span>Envío</span><span>${entrega ? "Lo acuerdas con cada negocio" : "Recoges tú"}</span>
        </div>
        <div class="total-fila total-fila--fuerte">
          <span>Total</span><span>${dinero(totalCarrito())}</span>
        </div>
        <p style="font-size:var(--t-xs);color:var(--tinta-60);margin-top:var(--e-2)">
          PuebloPedidos no cobra comisión sobre tu compra. Pagas directo al negocio.
        </p>
      </div>

      <div style="display:grid;gap:var(--e-2);margin-top:var(--e-4)">
        <button class="boton boton--principal boton--ancho" data-confirmar type="button">
          Confirmar y preparar ${lista.length} WhatsApp${lista.length === 1 ? "" : "s"}
        </button>
        <button class="boton boton--texto" data-vaciar type="button">Vaciar carrito</button>
      </div>
    `,
  );

  delegar(contenedor, "click", "[data-mas]", (_ev, b) => {
    cambiarCantidad(b.dataset.mas, 1);
    vistaCarrito(contenedor);
  });
  delegar(contenedor, "click", "[data-menos]", (_ev, b) => {
    cambiarCantidad(b.dataset.menos, -1);
    vistaCarrito(contenedor);
  });
  delegar(contenedor, "click", "[data-quitar]", (_ev, b) => {
    quitarLinea(b.dataset.quitar);
    vistaCarrito(contenedor);
  });
  contenedor.querySelector("[data-vaciar]").addEventListener("click", () => {
    vaciarCarrito();
    vistaCarrito(contenedor);
  });

  contenedor.querySelector("[data-confirmar]").addEventListener("click", async (ev) => {
    const boton = ev.currentTarget;
    const nombre = contenedor.querySelector("[data-nombre]").value.trim();
    const telefono = contenedor.querySelector("[data-telefono]").value.trim();
    const direccion = entrega ? contenedor.querySelector("[data-direccion]").value.trim() : "";
    const referencia = entrega ? contenedor.querySelector("[data-referencia]").value.trim() : "";

    if (!nombre || telefono.replace(/\D/g, "").length < 10) {
      toast("Escribe tu nombre y un WhatsApp de 10 dígitos.", "error");
      return;
    }
    if (entrega && !direccion) {
      toast("Falta la dirección de entrega.", "error");
      return;
    }
    if (!repo.esCliente()) {
      toast("Inicia sesión como cliente para enviar tu pedido.", "error");
      location.hash = "#/cuenta";
      return;
    }

    boton.disabled = true;
    boton.textContent = "Preparando...";

    try {
      await repo.actualizarPerfil({ name: nombre, phone: telefono, address: direccion, reference: referencia });
      const resultado = await repo.crearPedidos({
        grupos: lista.map((g) => ({
          storeId: g.storeId,
          items: itemsParaServidor(g),
          total: g.total,
        })),
        modo: estado.modoPedido,
        direccion,
        referencia,
      });

      const envios = resultado.map((fila) => {
        const grupo = lista.find((g) => g.storeId === (fila.pedido.storeId || fila.pedido.store_id));
        return {
          storeId: grupo.storeId,
          tienda: grupo.tienda?.name || "Negocio",
          telefono: grupo.tienda?.phone || "",
          total: grupo.total,
          enviado: false,
          cobrable: fila.cobrable,
          texto: mensaje({
            tienda: grupo.tienda,
            lineas: grupo.lineas,
            total: grupo.total,
            nombre,
            telefono,
            direccion,
            referencia,
            modo: estado.modoPedido,
          }),
        };
      });

      vaciarCarrito();
      fijar({ envios });
      pintarEnvios(contenedor);
    } catch (error) {
      toast(error.message, "error");
      boton.disabled = false;
      boton.textContent = "Confirmar y preparar WhatsApp";
    }
  });
}

function mensaje({ tienda, lineas, total, nombre, telefono, direccion, referencia, modo }) {
  const detalle = lineas
    .map((l) => `• ${l.qty} x ${l.titulo}${l.nota ? ` (${l.nota})` : ""} — ${dinero(l.qty * l.precio)}`)
    .join("\n");
  return [
    `Hola ${tienda?.name || ""}, hice un pedido en PuebloPedidos.`,
    "",
    detalle,
    "",
    `Total: ${dinero(total)}`,
    `Modo: ${modo}`,
    modo === "Entrega" ? `Dirección: ${direccion}` : "Paso a recoger",
    modo === "Entrega" && referencia ? `Referencia: ${referencia}` : "",
    "",
    `Soy ${nombre} · ${telefono}`,
  ]
    .filter((linea) => linea !== "")
    .join("\n");
}

function pintarEnvios(contenedor) {
  const pendientes = estado.envios.filter((e) => !e.enviado).length;

  pintarEn(
    contenedor,
    html`
      <h1>Envía tu pedido</h1>
      <p style="color:var(--tinta-60);font-size:var(--t-sm);margin-top:var(--e-1)">
        Un WhatsApp por negocio, con tu pedido ya escrito. Toca cada botón; si el navegador bloquea la
        ventana, vuelve aquí y toca otra vez.
      </p>

      <div style="margin-top:var(--e-4)">
        ${estado.envios.map(
          (envio, indice) => html`
            <div class="envio-fila ${envio.enviado ? "envio-fila--enviado" : ""}">
              <span class="envio-fila-num">${envio.enviado ? "✓" : indice + 1}</span>
              <div class="envio-fila-info">
                <strong>${envio.tienda}</strong>
                <small>${dinero(envio.total)} ${envio.cobrable ? "" : "· la tienda se quedó sin contactos"}</small>
              </div>
              <a
                class="boton boton--wa boton--chico"
                href="https://wa.me/${normalizarWhatsApp(envio.telefono)}?text=${encodeURIComponent(envio.texto)}"
                target="_blank"
                rel="noopener"
                data-enviar="${indice}"
              >
                ${icono.wa()} ${envio.enviado ? "Reenviar" : "Enviar"}
              </a>
            </div>
          `,
        )}
      </div>

      ${pendientes === 0
        ? html`
            <div class="tarjeta" style="margin-top:var(--e-4);text-align:center">
              <strong>Listo, ya salieron todos</strong>
              <p style="color:var(--tinta-60);font-size:var(--t-sm);margin-top:var(--e-1)">
                El negocio te contesta por WhatsApp para confirmar tiempo y pago.
              </p>
              <div style="display:grid;gap:var(--e-2);margin-top:var(--e-3)">
                <a class="boton boton--principal" href="#/pedidos">Ver mis pedidos</a>
                <a class="boton boton--contorno" href="#/">Seguir pidiendo</a>
              </div>
            </div>
          `
        : html`
            <button class="boton boton--texto" data-cancelar type="button" style="margin-top:var(--e-4)">
              Cancelar y volver al inicio
            </button>
          `}
    `,
  );

  delegar(contenedor, "click", "[data-enviar]", (_ev, enlace) => {
    const indice = Number(enlace.dataset.enviar);
    estado.envios[indice].enviado = true;
    setTimeout(() => pintarEnvios(contenedor), 400);
  });

  const cancelar = contenedor.querySelector("[data-cancelar]");
  if (cancelar) {
    cancelar.addEventListener("click", () => {
      fijar({ envios: [] });
      location.hash = "#/";
    });
  }
}

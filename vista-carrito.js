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
  disponibleEnModo,
} from "./estado.js";
import * as repo from "./datos-repo.js";
import { dinero, normalizarWhatsApp, estaAbierta, telefonoValido } from "./lib-formato.js";
import { campoDireccion } from "./lib-campo-direccion.js";

export async function vistaCarrito(contenedor) {
  if (enviosDelCliente().length) {
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
  const incompatibles = estado.carrito.filter(
    (linea) =>
      (linea.disponibilidad && !disponibleEnModo(linea.disponibilidad)) ||
      (linea.modosTienda && !disponibleEnModo(linea.modosTienda)),
  );

  pintarEn(
    contenedor,
    html`
      <h1>Tu carrito</h1>
      <p style="color:var(--tinta-60);font-size:var(--t-sm);margin-top:var(--e-1)">
        ${piezas()} artículo${piezas() === 1 ? "" : "s"} · ${lista.length} negocio${lista.length === 1 ? "" : "s"} ·
        ${estado.modoPedido.toLowerCase()}
      </p>

      ${incompatibles.length
        ? html`<div class="banner banner--aviso carrito-modo-aviso" data-aviso-modo>
            <strong>${incompatibles.length} producto${incompatibles.length === 1 ? " no está" : "s no están"} disponible${incompatibles.length === 1 ? "" : "s"} para ${estado.modoPedido.toLowerCase()}.</strong>
            <span>Cambia el tipo de pedido o quita esos productos antes de confirmar.</span>
            <button class="banner-accion" data-cambiar-modo-carrito type="button">
              Cambiar a ${estado.modoPedido === "Entrega" ? "recoger" : "entrega"}
            </button>
          </div>`
        : ""}

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
                      ${detalleLinea(linea)}
                      ${incompatibles.includes(linea)
                        ? html`<span class="sello sello--cerrado">No disponible para ${estado.modoPedido.toLowerCase()}</span>`
                        : ""}
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

      ${!repo.esCliente()
        ? html`<section class="tarjeta carrito-acceso">
            <div>
              <strong>Inicia sesión antes de confirmar</strong>
              <p>Tu carrito se conservará mientras entras o creas tu cuenta.</p>
            </div>
            <a class="boton boton--contorno boton--chico" href="#/cuenta">Entrar</a>
          </section>`
        : ""}

      <form class="tarjeta" id="form-carrito" data-form-carrito novalidate style="margin-top:var(--e-4)">
        <h2 style="font-size:var(--t-lg);margin-bottom:var(--e-3)">
          ${entrega ? "¿A dónde lo llevamos?" : "¿Quién recoge?"}
        </h2>
        <label class="campo" data-campo-nombre>
          <span>Tu nombre</span>
          <input name="name" data-nombre value="${cliente?.name || ""}" placeholder="Como te conocen en el pueblo" autocomplete="name" aria-describedby="carrito-error-nombre" required />
          <small class="campo-error" id="carrito-error-nombre" data-error-nombre role="alert" hidden></small>
        </label>
        <label class="campo" data-campo-telefono>
          <span>Tu WhatsApp activo</span>
          <input name="phone" data-telefono type="tel" inputmode="tel" value="${cliente?.phone || ""}" placeholder="10 dígitos" autocomplete="tel" aria-describedby="carrito-ayuda-telefono carrito-error-telefono" required />
          <small id="carrito-ayuda-telefono">El negocio usará este número para responderte y confirmar el pedido.</small>
          <small class="campo-error" id="carrito-error-telefono" data-error-telefono role="alert" hidden></small>
        </label>
        ${entrega
          ? html`
              <label class="campo" data-campo-direccion>
                <span>Dirección</span>
                <div data-direccion-carrito></div>
                <small class="campo-error" id="carrito-error-direccion" data-error-direccion role="alert" hidden></small>
              </label>
              <label class="campo">
                <span>Referencia</span>
                <input data-referencia value="${cliente?.reference || ""}" placeholder="Portón verde, junto a la tienda" autocomplete="off" />
              </label>
            `
          : ""}
      </form>

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
        <button class="boton boton--principal boton--ancho" data-confirmar type="submit" form="form-carrito">
          Confirmar y preparar ${lista.length} WhatsApp${lista.length === 1 ? "" : "s"}
        </button>
        <button class="boton boton--texto" data-vaciar type="button">Vaciar carrito</button>
      </div>
    `,
  );

  const direccionCarrito = entrega
    ? campoDireccion(contenedor.querySelector("[data-direccion-carrito]"), {
        valor: cliente?.address || estado.etiquetaUbicacion || "",
        coords: cliente?.coords || estado.ubicacion,
        requerido: true,
        alElegir(direccion, coords) {
          fijar({ etiquetaUbicacion: direccion, ubicacion: coords });
          limpiarErrorCarrito(contenedor, "direccion", direccionCarrito?.elemento());
        },
        alEditar(direccion) {
          fijar({ etiquetaUbicacion: direccion, ubicacion: null });
          limpiarErrorCarrito(contenedor, "direccion", direccionCarrito?.elemento());
        },
      })
    : null;

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
  contenedor.querySelector("[data-cambiar-modo-carrito]")?.addEventListener("click", () => {
    fijar({ modoPedido: estado.modoPedido === "Entrega" ? "Recoger" : "Entrega" });
    vistaCarrito(contenedor);
  });
  contenedor.querySelector("[data-vaciar]").addEventListener("click", () => {
    vaciarCarrito();
    vistaCarrito(contenedor);
  });

  const formCarrito = contenedor.querySelector("[data-form-carrito]");
  const campoNombre = contenedor.querySelector("[data-nombre]");
  const campoTelefono = contenedor.querySelector("[data-telefono]");
  campoNombre.addEventListener("input", () => limpiarErrorCarrito(contenedor, "nombre", campoNombre));
  campoTelefono.addEventListener("input", () => limpiarErrorCarrito(contenedor, "telefono", campoTelefono));

  formCarrito.addEventListener("submit", async (ev) => {
    ev.preventDefault();
    const boton = contenedor.querySelector("[data-confirmar]");
    const nombre = campoNombre.value.trim();
    const telefono = campoTelefono.value.trim();
    const direccion = entrega ? direccionCarrito.direccion() : "";
    const coordsEntrega = entrega ? direccionCarrito.coords() || estado.ubicacion : null;
    const referencia = entrega ? contenedor.querySelector("[data-referencia]").value.trim() : "";

    limpiarErrorCarrito(contenedor, "nombre", campoNombre);
    limpiarErrorCarrito(contenedor, "telefono", campoTelefono);
    if (entrega) limpiarErrorCarrito(contenedor, "direccion", direccionCarrito.elemento());
    if (!nombre) {
      mostrarErrorCarrito(contenedor, "nombre", campoNombre, "Escribe tu nombre.");
      return;
    }
    if (!telefonoValido(telefono)) {
      mostrarErrorCarrito(contenedor, "telefono", campoTelefono, "Escribe un WhatsApp con al menos 10 dígitos.");
      return;
    }
    if (incompatibles.length) {
      contenedor.querySelector("[data-aviso-modo]")?.scrollIntoView({ behavior: "smooth", block: "center" });
      toast("Revisa los productos que no están disponibles para este tipo de pedido.", "error");
      return;
    }

    // El candado: no se manda un pedido a un negocio cerrado. Antes salía
    // el WhatsApp igual y el cliente se quedaba esperando una respuesta
    // que llegaba al día siguiente.
    const cerradas = lista.filter((g) => g.tienda && !estaAbierta(g.tienda));
    if (cerradas.length) {
      const nombres = cerradas.map((g) => g.tienda.name).join(", ");
      toast(
        `${nombres} ${cerradas.length === 1 ? "está cerrado" : "están cerrados"} ahora. Quítalo del carrito o espera a que abra.`,
        "error",
      );
      return;
    }
    if (entrega && !direccion) {
      const inputDireccion = direccionCarrito.elemento();
      mostrarErrorCarrito(contenedor, "direccion", inputDireccion, "Escribe la dirección de entrega.");
      direccionCarrito.enfocar();
      return;
    }
    if (!repo.esCliente()) {
      toast("Inicia sesión como cliente para enviar tu pedido.", "error");
      location.hash = "#/cuenta";
      return;
    }

    const textoBoton = boton.textContent;
    boton.disabled = true;
    boton.textContent = "Preparando...";
    formCarrito.setAttribute("aria-busy", "true");

    try {
      await repo.actualizarPerfil({
        name: nombre,
        phone: telefono,
        address: direccion,
        reference: referencia,
        coords: coordsEntrega,
      });
      const resultado = await repo.crearPedidos({
        grupos: lista.map((g) => ({
          storeId: g.storeId,
          items: itemsParaServidor(g),
          total: g.total,
        })),
        modo: estado.modoPedido,
        direccion,
        referencia,
        coords: coordsEntrega,
      });

      const envios = resultado.map((fila) => {
        const grupo = lista.find((g) => g.storeId === (fila.pedido.storeId || fila.pedido.store_id));
        const lineasConfirmadas = lineasDesdeServidor(fila.pedido.items, grupo.lineas);
        const totalConfirmado = Number(fila.pedido.total ?? grupo.total);
        return {
          pedidoId: fila.pedido.id,
          clienteId: sesion.id,
          storeId: grupo.storeId,
          tienda: grupo.tienda?.name || "Negocio",
          telefono: grupo.tienda?.phone || "",
          total: totalConfirmado,
          abiertoEn: null,
          confirmadoEn: null,
          creadoEn: Date.now(),
          texto: mensaje({
            tienda: grupo.tienda,
            lineas: lineasConfirmadas,
            total: totalConfirmado,
            nombre,
            telefono,
            direccion,
            referencia,
            modo: estado.modoPedido,
            coords: coordsEntrega,
          }),
        };
      });

      // Una sola escritura: nunca queda guardado un carrito vacío sin la
      // lista que permite continuar con los WhatsApp.
      fijar({ carrito: [], envios });
      pintarEnvios(contenedor);
    } catch (error) {
      toast(error.message, "error");
      boton.disabled = false;
      boton.textContent = textoBoton;
      formCarrito.removeAttribute("aria-busy");
    }
  });
}

/** Usa lo que confirmó el servidor, no precios viejos que quedaran en el carrito. */
function lineasDesdeServidor(items, respaldo) {
  if (!Array.isArray(items) || !items.length) return respaldo;
  return items.map((item) => {
    const opciones = Array.isArray(item.selected_options) ? item.selected_options : [];
    return {
      titulo: item.title,
      qty: Number(item.qty || item.quantity || 1),
      precio: Number(item.price ?? item.unit_price) || 0,
      nota: item.note || item.customer_note || "",
      sinQue: opciones.filter((o) => o.kind === "remove").map((o) => o.name),
      extras: opciones
        .filter((o) => o.kind === "extra")
        .map((o) => ({ nombre: o.name, precio: Number(o.price) || 0 })),
      selectedOptions: opciones
        .filter((o) => o.kind === "group")
        .map((o) => ({ groupName: o.group_name, name: o.name, price: Number(o.price) || 0 })),
    };
  });
}

/** Resume exactamente la configuración elegida sin romper el carrito. */
function detalleLinea(linea) {
  const sinQue = Array.isArray(linea.sinQue) ? linea.sinQue : [];
  const extras = Array.isArray(linea.extras) ? linea.extras : [];
  const opciones = Array.isArray(linea.selectedOptions) ? linea.selectedOptions : [];
  if (!sinQue.length && !extras.length && !opciones.length) return "";

  return html`<div class="carrito-config">
    ${sinQue.map((nombre) => html`<span class="carrito-sin">Sin ${nombre}</span>`)}
    ${extras.map(
      (extra) => html`<span class="carrito-extra">+ ${extra.nombre} ${Number(extra.precio) ? dinero(extra.precio) : ""}</span>`,
    )}
    ${opciones.map(
      (opcion) => html`<span class="carrito-opcion">${opcion.groupName || "Opción"}: ${opcion.name}</span>`,
    )}
  </div>`;
}

function mensaje({ tienda, lineas, total, nombre, telefono, direccion, referencia, modo, coords }) {
  const detalle = lineas
    .map((l) => {
      // El negocio necesita leerlo de un vistazo en su teléfono, sin
      // adivinar: cada cambio en su propio renglón, con sangría.
      const partes = [`• ${l.qty} x ${l.titulo} — ${dinero(l.qty * l.precio)}`];
      const sinQue = Array.isArray(l.sinQue) ? l.sinQue : [];
      const extras = Array.isArray(l.extras) ? l.extras : [];
      const opciones = Array.isArray(l.selectedOptions) ? l.selectedOptions : [];
      if (sinQue.length) partes.push(`   SIN: ${sinQue.join(", ")}`);
      extras.forEach((e) => partes.push(`   + ${e.nombre} (${dinero(e.precio || 0)})`));
      opciones.forEach((o) => partes.push(`   ${o.groupName || "Opción"}: ${o.name}`));
      if (l.nota) partes.push(`   Nota: ${l.nota}`);
      return partes.join("\n");
    })
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
    modo === "Entrega" && coords
      ? `Ubicación: https://www.google.com/maps/search/?api=1&query=${coords.lat},${coords.lng}`
      : "",
    "",
    `Soy ${nombre} · ${telefono}`,
  ]
    .filter((linea) => linea !== "")
    .join("\n");
}

function pintarEnvios(contenedor) {
  const envios = enviosDelCliente();
  const pendientes = envios.filter((envio) => !envio.confirmadoEn && !envio.confirmado && !envio.enviado).length;

  pintarEn(
    contenedor,
    html`
      <h1>Envía tu pedido</h1>
      <p style="color:var(--tinta-60);font-size:var(--t-sm);margin-top:var(--e-1)">
        Abre un WhatsApp por negocio. Cuando realmente lo hayas enviado, vuelve aquí y marca “Ya lo envié”.
        Esta lista se conserva si cierras o recargas la página.
      </p>

      <div style="margin-top:var(--e-4)">
        ${envios.map(
          (envio, indice) => {
            const confirmado = Boolean(envio.confirmadoEn || envio.confirmado || envio.enviado);
            const abierto = Boolean(envio.abiertoEn || envio.abierto);
            const clave = envio.pedidoId || `${envio.storeId}-${indice}`;
            return html`
            <div class="envio-fila ${confirmado ? "envio-fila--enviado" : abierto ? "envio-fila--abierto" : ""}">
              <span class="envio-fila-num">${confirmado ? "✓" : abierto ? "↗" : indice + 1}</span>
              <div class="envio-fila-info">
                <strong>${envio.tienda}</strong>
                <small>
                  ${dinero(envio.total)}
                  ${confirmado ? "· marcado como enviado" : abierto ? "· WhatsApp abierto; falta confirmar" : "· listo para abrir"}
                </small>
              </div>
              <div class="envio-fila-acciones">
                <a
                  class="boton boton--wa boton--chico"
                  href="https://wa.me/${normalizarWhatsApp(envio.telefono)}?text=${encodeURIComponent(envio.texto)}"
                  target="_blank"
                  rel="noopener"
                  data-abrir-whatsapp="${clave}"
                >
                  ${icono.wa()} ${abierto || confirmado ? "Abrir otra vez" : "Abrir WhatsApp"}
                </a>
                ${abierto && !confirmado
                  ? html`<button class="boton boton--principal boton--chico" data-confirmar-envio="${clave}" type="button">Ya lo envié</button>`
                  : ""}
              </div>
            </div>
          `;
          },
        )}
      </div>

      ${pendientes === 0
        ? html`
            <div class="tarjeta" style="margin-top:var(--e-4);text-align:center">
              <strong>Marcaste todos como enviados</strong>
              <p style="color:var(--tinta-60);font-size:var(--t-sm);margin-top:var(--e-1)">
                El negocio te contesta por WhatsApp para confirmar tiempo y pago.
              </p>
              <div style="display:grid;gap:var(--e-2);margin-top:var(--e-3)">
                <a class="boton boton--principal" data-finalizar-envios href="#/pedidos">Ver mis pedidos</a>
                <a class="boton boton--contorno" data-finalizar-envios href="#/">Seguir pidiendo</a>
              </div>
            </div>
          `
        : html`
            <button class="boton boton--texto" data-continuar-despues type="button" style="margin-top:var(--e-4)">
              Continuar después
            </button>
          `}
    `,
  );

  contenedor.querySelectorAll("[data-abrir-whatsapp]").forEach((enlace) => {
    enlace.addEventListener("click", () => {
      const clave = enlace.dataset.abrirWhatsapp;
      fijar({
        envios: estado.envios.map((envio, indice) =>
          claveEnvio(envio, indice) === clave ? { ...envio, abiertoEn: new Date().toISOString() } : envio,
        ),
      });
      setTimeout(() => pintarEnvios(contenedor), 400);
    });
  });

  contenedor.querySelectorAll("[data-confirmar-envio]").forEach((boton) => {
    boton.addEventListener("click", () => {
      const clave = boton.dataset.confirmarEnvio;
      fijar({
        envios: estado.envios.map((envio, indice) =>
          claveEnvio(envio, indice) === clave ? { ...envio, confirmadoEn: new Date().toISOString() } : envio,
        ),
      });
      pintarEnvios(contenedor);
    });
  });

  contenedor.querySelectorAll("[data-finalizar-envios]").forEach((enlace) => {
    enlace.addEventListener("click", limpiarEnviosDelCliente);
  });
  contenedor.querySelector("[data-continuar-despues]")?.addEventListener("click", () => {
    toast("Guardamos esta lista. Vuelve al carrito para continuar.");
    location.hash = "#/";
  });
}

function enviosDelCliente() {
  const clienteId = repo.sesion()?.role === "client" ? repo.sesion().id : "";
  if (!clienteId) return [];
  return estado.envios.filter((envio) => !envio.clienteId || envio.clienteId === clienteId);
}

function claveEnvio(envio, indice) {
  return String(envio.pedidoId || `${envio.storeId}-${indice}`);
}

function limpiarEnviosDelCliente() {
  const clienteId = repo.sesion()?.id;
  fijar({
    envios: estado.envios.filter((envio) => envio.clienteId && envio.clienteId !== clienteId),
  });
}

function limpiarErrorCarrito(contenedor, clave, campo = null) {
  const caja = contenedor.querySelector(`[data-campo-${clave}]`);
  const error = contenedor.querySelector(`[data-error-${clave}]`);
  caja?.classList.remove("campo--error");
  campo?.removeAttribute("aria-invalid");
  if (error) {
    error.hidden = true;
    error.textContent = "";
  }
}

function mostrarErrorCarrito(contenedor, clave, campo, mensaje) {
  const caja = contenedor.querySelector(`[data-campo-${clave}]`);
  const error = contenedor.querySelector(`[data-error-${clave}]`);
  caja?.classList.add("campo--error");
  campo?.setAttribute("aria-invalid", "true");
  if (error) {
    error.textContent = mensaje;
    error.hidden = false;
  }
  campo?.focus({ preventScroll: true });
  caja?.scrollIntoView?.({ behavior: "smooth", block: "center" });
  toast(mensaje, "error");
}

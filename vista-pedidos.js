// Historial del cliente.

import { html, pintarEn } from "./lib-dom.js";
import { vacio, esqueletoLista } from "./lib-ui.js";
import * as repo from "./datos-repo.js";
import { dinero, fechaHora, normalizarWhatsApp } from "./lib-formato.js";
import { icono } from "./lib-ui.js";

export async function vistaPedidos(contenedor) {
  if (!repo.esCliente()) {
    pintarEn(
      contenedor,
      html`
        <h1>Mis pedidos</h1>
        <div style="margin-top:var(--e-4)">
          ${vacio({
            titulo: "Entra para ver tus pedidos",
            texto: "Con tu cuenta guardamos tu dirección y el historial de lo que has pedido.",
            accion: html`<a class="boton boton--principal" href="#/cuenta">Entrar o registrarme</a>`,
          })}
        </div>
      `,
    );
    return;
  }

  pintarEn(contenedor, html`<h1>Mis pedidos</h1><div style="margin-top:var(--e-4)">${esqueletoLista(3)}</div>`);

  const [pedidos, tiendas] = await Promise.all([repo.pedidosDeCliente(), repo.tiendas()]);
  const porId = new Map(tiendas.map((t) => [t.id, t]));

  if (!pedidos.length) {
    pintarEn(
      contenedor,
      html`
        <h1>Mis pedidos</h1>
        <div style="margin-top:var(--e-4)">
          ${vacio({
            titulo: "Aún no has pedido nada",
            texto: "Cuando envíes tu primer pedido por WhatsApp, aparecerá aquí para que lo repitas fácil.",
            accion: html`<a class="boton boton--principal" href="#/">Ver negocios</a>`,
          })}
        </div>
      `,
    );
    return;
  }

  pintarEn(
    contenedor,
    html`
      <h1>Mis pedidos</h1>
      <p style="color:var(--tinta-60);font-size:var(--t-sm);margin-top:var(--e-1)">
        ${pedidos.length} pedido${pedidos.length === 1 ? "" : "s"}
      </p>
      <div style="margin-top:var(--e-4)">
        ${pedidos.map((pedido) => {
          const tienda = porId.get(pedido.storeId);
          return html`
            <article class="pedido">
              <header class="pedido-cabeza">
                <div>
                  <strong>${tienda?.name || "Negocio"}</strong>
                  <small>${fechaHora(pedido.createdAt)} · ${pedido.mode}</small>
                </div>
                <strong>${dinero(pedido.total)}</strong>
              </header>
              <ul>
                ${(pedido.items || []).map(
                  (item) => html`
                    <li>${item.qty} × ${item.title}${item.note ? html` <em style="color:var(--tinta-60)">(${item.note})</em>` : ""}</li>
                  `,
                )}
              </ul>
              ${tienda
                ? html`
                    <div style="display:flex;gap:var(--e-2);margin-top:var(--e-3);flex-wrap:wrap">
                      <a class="boton boton--contorno boton--chico" href="#/tienda/${tienda.slug || tienda.id}">
                        Volver a pedir
                      </a>
                      <a
                        class="boton boton--wa boton--chico"
                        href="https://wa.me/${normalizarWhatsApp(tienda.phone)}"
                        target="_blank"
                        rel="noopener"
                      >
                        ${icono.wa()} Escribir
                      </a>
                    </div>
                  `
                : ""}
            </article>
          `;
        })}
      </div>
    `,
  );
}

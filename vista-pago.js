import { html, pintarEn } from "./lib-dom.js";
import { esqueletoLista } from "./lib-ui.js";
import { dinero } from "./lib-formato.js";
import * as repo from "./datos-repo.js";

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

export async function vistaPago(contenedor, params) {
  if (repo.sesion()?.role !== "store") {
    pintarEn(contenedor, estadoFinal(
      "Necesitas entrar con la cuenta del negocio para verificar este pago.",
      "error",
    ));
    return;
  }
  if (!UUID.test(params.requestId || "")) {
    pintarEn(contenedor, estadoFinal("El enlace de pago no es valido.", "error"));
    return;
  }

  pintarEn(
    contenedor,
    html`<section class="tarjeta pago-resultado">
      <h1>Estamos confirmando tu pago</h1>
      <p>No cierres esta pagina. Consultamos el resultado directamente con Clip.</p>
      <div style="margin-top:var(--e-4)">${esqueletoLista(1)}</div>
    </section>`,
  );

  let ultimo = null;
  for (let intento = 0; intento < 8; intento += 1) {
    try {
      ultimo = await repo.estadoPagoClip(params.requestId);
      if (ultimo.estado !== "por_verificar") break;
    } catch (error) {
      if (intento === 7) {
        pintarEn(contenedor, estadoFinal(error.message, "error"));
        return;
      }
    }
    await esperar(2000);
    if (!location.hash.includes(params.requestId)) return;
  }

  if (ultimo?.estado === "verificado") {
    const detalle = ultimo.purchase_type === "store_feature"
      ? `Pago confirmado. Tu tienda quedó destacada por ${ultimo.promo_days || 7} días.`
      : ultimo.purchase_type === "product_feature"
        ? `Pago confirmado. Tu producto quedó destacado por ${ultimo.promo_days || 7} días.`
        : `Pago confirmado. Tu plan ${ultimo.plan === "destacado" ? "Destacado" : "Presencia"} por ${ultimo.meses} mes${ultimo.meses === 1 ? "" : "es"} ya está activo.`;
    pintarEn(
      contenedor,
      estadoFinal(
        detalle,
        "ok",
        dinero(ultimo.monto),
      ),
    );
    return;
  }

  if (ultimo?.estado === "rechazado") {
    pintarEn(
      contenedor,
      estadoFinal(
        ultimo.motivo_rechazo || "Clip no pudo completar el pago. No se activó ninguna compra.",
        "error",
      ),
    );
    return;
  }

  pintarEn(
    contenedor,
    estadoFinal(
      "El pago sigue pendiente. No activaremos nada hasta que Clip lo confirme. Puedes volver a revisar desde Tus pagos.",
      "pendiente",
    ),
  );
}

function estadoFinal(mensaje, tipo, monto = "") {
  const titulo = tipo === "ok"
    ? "Pago confirmado"
    : tipo === "error"
      ? "El pago no se completo"
      : "Pago pendiente";
  return html`
    <section class="tarjeta pago-resultado">
      <span class="sello ${tipo === "ok" ? "sello--abierto" : tipo === "error" ? "sello--cerrado" : "sello--promo"}">
        ${titulo}
      </span>
      <h1 style="margin-top:var(--e-3)">${titulo}</h1>
      ${monto ? html`<strong class="plan-precio" style="display:block">${monto}</strong>` : ""}
      <p>${mensaje}</p>
      <a class="boton boton--principal" href="#/panel" style="margin-top:var(--e-4)">Volver a mi panel</a>
    </section>
  `;
}

function esperar(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

// Panel privado del operador. La ruta oculta no es una medida de seguridad:
// cada lectura y cada cambio sensible se valida también en Supabase.

import { html, pintarEn, delegar, copiar } from "./lib-dom.js";
import { vacio, esqueletoLista, toast } from "./lib-ui.js";
import * as repo from "./datos-repo.js";
import { dinero, csv, descargar, fechaHora, fechaCorta } from "./lib-formato.js";

export async function vistaAdmin(contenedor) {
  pintarEn(contenedor, html`<h1>Panel del operador</h1><div style="margin-top:var(--e-4)">${esqueletoLista(2)}</div>`);

  let resumen;
  let tiendas = [];
  let cobro = {};
  try {
    [resumen, tiendas] = await Promise.all([repo.resumenPlataforma(), repo.tiendas()]);
    cobro = await repo.configCobro().catch(() => ({}));
  } catch (error) {
    pintarEn(
      contenedor,
      vacio({
        titulo: "Sin acceso",
        texto: `Esta vista es solo para el operador de la plataforma. ${error.message}`,
        accion: html`<a class="boton boton--contorno" href="#/">Volver al inicio</a>`,
      }),
    );
    return;
  }

  const ingresoTotal = Number(
    resumen.ingresoTotal ??
      Number(resumen.ingresoSuscripciones || 0) + Number(resumen.ingresoPromos || 0),
  );
  const ahora = Date.now();
  const suscripcionesVigentes = tiendas.filter(
    (tienda) =>
      ["prueba", "activa"].includes(tienda.subStatus) &&
      Date.parse(tienda.subscribedUntil || "") > ahora,
  ).length;

  pintarEn(
    contenedor,
    html`
      <div class="operacion-cabecera">
        <div>
          <span class="sello sello--abierto">${repo.modo() === "demo" ? "Demo local" : "Datos en vivo"}</span>
          <h1>Panel del operador</h1>
          <p>Primero atiende los pagos pendientes; después revisa vencimientos y negocios.</p>
        </div>
        <nav class="operacion-accesos" aria-label="Secciones del panel">
          <button class="boton boton--contorno boton--chico" data-ir-operacion="pagos-operador" type="button">Pagos</button>
          <button class="boton boton--contorno boton--chico" data-ir-operacion="suscripciones-operador" type="button">Suscripciones</button>
        </nav>
      </div>

      <div class="metricas" style="margin-top:var(--e-4)">
        <div class="metrica">
          <span>Ingreso</span>
          <strong>${dinero(ingresoTotal)}</strong>
          <small>suscripciones + promociones</small>
        </div>
        <div class="metrica">
          <span>Contactos</span>
          <strong>${resumen.contactos ?? resumen.contactosCobrados ?? 0}</strong>
          <small>incluidos sin límite</small>
        </div>
        <div class="metrica">
          <span>Negocios</span>
          <strong>${resumen.tiendas ?? tiendas.length}</strong>
          <small>${suscripcionesVigentes} con plan vigente</small>
        </div>
        <div class="metrica">
          <span>Pedidos</span>
          <strong>${resumen.pedidos || 0}</strong>
          <small>${dinero(resumen.ventasTotales || 0)} movidos</small>
        </div>
      </div>

      <section id="pagos-operador" class="operacion-seccion">
        <div class="seccion-cabeza">
          <div>
            <h2>Pagos por verificar</h2>
            <p>Clip se concilia con su servidor; transferencia y efectivo se revisan manualmente.</p>
          </div>
          <button class="boton boton--contorno boton--chico" data-avisarme type="button">Avisarme por WhatsApp</button>
        </div>
        <div data-cola></div>
      </section>

      <section id="suscripciones-operador" class="operacion-seccion">
        <div class="seccion-cabeza">
          <div>
            <h2>Suscripciones</h2>
            <p>Las que están por vencer salen primero</p>
          </div>
          <div style="display:flex;gap:var(--e-2);flex-wrap:wrap">
            <button class="boton boton--contorno boton--chico" data-barrer type="button">Actualizar estados</button>
            <button class="boton boton--texto" data-csv type="button">CSV</button>
          </div>
        </div>
        <div data-tablero></div>
      </section>
    `,
  );

  delegar(contenedor, "click", "[data-ir-operacion]", (_ev, boton) => {
    contenedor.querySelector(`#${boton.dataset.irOperacion}`)?.scrollIntoView({ behavior: "smooth", block: "start" });
  });

  const pintarTablero = async () => {
    const zona = contenedor.querySelector("[data-tablero]");
    try {
      const filas = await repo.tableroSuscripciones();
      if (!filas.length) {
        pintarEn(zona, html`<p style="color:var(--tinta-60)">Aún no hay negocios registrados.</p>`);
        return;
      }
      const precioPresencia = Number(cobro.subscriptionPrices?.presencia) || 99;
      const precioDestacado = Number(cobro.subscriptionPrices?.destacado) || 200;
      pintarEn(
        zona,
        html`
          <div class="tabla-envoltura">
            <table class="tabla tabla--suscripciones">
              <thead><tr><th>Negocio</th><th>Plan</th><th>Estado</th><th>Vence</th><th>Acciones</th></tr></thead>
              <tbody>
                ${filas.map(
                  (f) => html`
                    <tr>
                      <td data-label="Negocio">
                        <a href="#/tienda/${f.store_id}" style="color:var(--verde-500);font-weight:var(--peso-medio)">${f.nombre}</a>
                        <small style="display:block;color:var(--tinta-60)">${f.categoria}</small>
                      </td>
                      <td data-label="Plan">${f.plan === "destacado" ? "Destacado" : "Presencia"}</td>
                      <td data-label="Estado">${selloEstado(f.estado)}</td>
                      <td data-label="Vence">
                        ${f.vence ? fechaCorta(f.vence) : "—"}
                        ${["activa", "prueba"].includes(f.estado)
                          ? html`<small style="display:block;color:var(--tinta-60)">${f.dias_restantes} días</small>`
                          : ""}
                      </td>
                      <td data-label="Acciones">
                        <div class="acciones-sub">
                          <button class="boton boton--contorno boton--chico" data-activar="${f.store_id}" data-plan="presencia" type="button">
                            Activar Presencia · ${dinero(precioPresencia)}
                          </button>
                          <button class="boton boton--contorno boton--chico" data-activar="${f.store_id}" data-plan="destacado" type="button">
                            Activar Destacado · ${dinero(precioDestacado)}
                          </button>
                          <button class="boton boton--texto" data-cortesia="${f.store_id}" data-negocio="${f.nombre}" type="button">Regalar mes</button>
                          ${f.estado === "suspendida"
                            ? html`<button class="boton boton--texto" data-reactivar="${f.store_id}" type="button">Quitar suspensión</button>`
                            : html`<button class="boton boton--peligro boton--chico" data-suspender="${f.store_id}" type="button">Suspender</button>`}
                        </div>
                      </td>
                    </tr>
                  `,
                )}
              </tbody>
            </table>
          </div>
        `,
      );
    } catch (error) {
      pintarEn(zona, html`<p class="pago-fila-alerta">No se pudo cargar el tablero: ${error.message}</p>`);
    }
  };

  const tarjetaPago = (f) => {
    const automatico = esClipAutomatico(f);
    const puedeConciliar = repo.sesion()?.role === "store" && repo.sesion()?.id === f.store_id;
    const tipo = tipoCompra(f);
    const nota = notaVisible(f.nota);
    const categoriaOcupada = tipo.codigo === "subscription" && f.plan === "destacado" && f.categoria_libre === false;
    return html`
      <div class="pago-fila ${automatico ? "pago-fila--automatico" : ""}">
        <div class="pago-fila-info">
          <strong>${f.negocio || "Negocio sin nombre"}</strong>
          <div class="pago-fila-datos">
            <span class="cifra">${dinero(f.monto)}</span>
            <span>${tipo.texto}</span>
            <span>${etiquetaMetodoOp(f.metodo)}</span>
            ${automatico ? selloClip(f.clip_status) : ""}
            ${f.creado_en ? html`<span>${fechaCorta(f.creado_en)}</span>` : ""}
            ${f.referencia ? html`<code>${f.referencia}</code>` : ""}
          </div>
          ${nota ? html`<small class="pago-fila-nota">“${nota}”</small>` : ""}
          ${automatico
            ? html`<small class="pago-fila-ayuda">No lo confirmes ni rechaces a mano: el estado se consulta directamente en Clip.</small>`
            : ""}
          ${categoriaOcupada
            ? html`<small class="pago-fila-alerta">Otro negocio ya tiene el destacado de ${f.categoria}. No confirmes hasta liberar ese espacio.</small>`
            : ""}
        </div>
        <div class="pago-fila-acciones">
          ${ayudaVerificar(f)}
          ${automatico
            ? puedeConciliar
              ? html`<button class="boton boton--principal boton--chico" data-conciliar="${f.id}" type="button">Consultar Clip</button>`
              : html`<span class="sello sello--abierto">Confirmación automática</span>`
            : html`
                <button class="boton boton--principal boton--chico" data-confirmar="${f.id}" type="button">Confirmar</button>
                <button class="boton boton--texto" data-rechazar="${f.id}" type="button">Rechazar</button>
              `}
        </div>
      </div>
    `;
  };

  const pintarCola = async () => {
    const zona = contenedor.querySelector("[data-cola]");
    try {
      const filas = await repo.colaPagos();
      const pendientes = filas.filter((f) => f.estado === "por_verificar");
      if (!pendientes.length) {
        pintarEn(zona, html`<p style="color:var(--tinta-60)">Nada pendiente. Los pagos nuevos aparecen aquí.</p>`);
        return;
      }
      pintarEn(zona, html`${pendientes.map((f) => tarjetaPago(f))}`);
    } catch (error) {
      pintarEn(zona, html`<p class="pago-fila-alerta">No se pudo cargar la cola: ${error.message}</p>`);
    }
  };

  await Promise.all([pintarCola(), pintarTablero()]);

  delegar(contenedor, "click", "[data-avisarme]", async (_ev, boton) => {
    boton.disabled = true;
    try {
      const alertas = await repo.alertasPendientes();
      if (!alertas.length) {
        toast("No hay nada pendiente por avisar.");
        return;
      }
      const conLink = alertas.find((a) => a.link_whatsapp);
      if (conLink?.link_whatsapp) window.open(conLink.link_whatsapp, "_blank", "noopener");
      else toast("Configura tu WhatsApp de soporte para recibir avisos.", "error");
    } catch (error) {
      toast(error, "error");
    } finally {
      boton.disabled = false;
    }
  });

  // Solo aparece cuando el operador también es propietario de esa tienda.
  // La Edge Function vuelve a comprobar la propiedad antes de consultar Clip.
  delegar(contenedor, "click", "[data-conciliar]", async (_ev, boton) => {
    const texto = boton.textContent;
    boton.disabled = true;
    boton.textContent = "Consultando…";
    try {
      const resultado = await repo.estadoPagoClip(boton.dataset.conciliar);
      if (resultado.estado === "verificado") {
        toast("Pago confirmado por Clip y beneficio aplicado.");
      } else if (resultado.estado === "rechazado") {
        toast(resultado.motivo_rechazo || "Clip informó que el pago no se completó.", "error");
      } else if (resultado.applied?.amount_mismatch) {
        toast("Clip reportó un monto distinto. El beneficio no se aplicó; revisa la transacción.", "error");
      } else if (resultado.applied?.category_conflict) {
        toast("Clip confirmó el pago, pero esa categoría ya tiene un destacado. Revisa el caso antes de asignar el beneficio.", "error");
      } else if (resultado.applied?.category_changed) {
        toast("Clip confirmó el pago, pero la categoría del negocio cambió después de crear el enlace. Revisa el caso antes de aplicar o devolver el pago.", "error");
      } else if (resultado.verificationWarning) {
        toast(resultado.verificationWarning, "error");
      } else {
        toast("Clip todavía reporta el pago como pendiente.");
      }
      await Promise.all([pintarCola(), pintarTablero()]);
    } catch (error) {
      toast(error, "error");
      boton.disabled = false;
      boton.textContent = texto;
    }
  });

  delegar(contenedor, "click", "[data-confirmar]", async (_ev, boton) => {
    const texto = boton.textContent;
    boton.disabled = true;
    boton.textContent = "Activando…";
    try {
      const resultado = await repo.verificarPago(boton.dataset.confirmar, true, null);
      toast(resultado?.destacado ? "Pago confirmado y espacio destacado asignado." : "Pago confirmado y beneficio aplicado.");
      await Promise.all([pintarCola(), pintarTablero()]);
    } catch (error) {
      toast(error, "error");
      boton.disabled = false;
      boton.textContent = texto;
    }
  });

  delegar(contenedor, "click", "[data-rechazar]", async (_ev, boton) => {
    const motivo = prompt("¿Por qué no se pudo confirmar?\n(el negocio podrá leerlo)", "No encontramos el pago");
    if (motivo === null) return;
    boton.disabled = true;
    try {
      await repo.verificarPago(boton.dataset.rechazar, false, motivo.trim() || "No encontramos el pago");
      toast("Pago manual marcado como no confirmado.");
      await pintarCola();
    } catch (error) {
      toast(error, "error");
      boton.disabled = false;
    }
  });

  delegar(contenedor, "click", "[data-copiar-monto]", async (_ev, boton) => {
    const ok = await copiar(boton.dataset.copiarMonto);
    toast(ok ? "Monto copiado. Pégalo en el buscador de tu banco." : "No se pudo copiar.", ok ? "ok" : "error");
  });

  delegar(contenedor, "click", "[data-activar]", async (_ev, boton) => {
    const plan = boton.dataset.plan;
    const precio = Number(cobro.subscriptionPrices?.[plan]) || (plan === "destacado" ? 200 : 99);
    const nombre = `${plan === "destacado" ? "Destacado" : "Presencia"} (${dinero(precio)})`;
    const meses = Number(prompt(`¿Cuántos meses de ${nombre}?`, "1"));
    if (!Number.isInteger(meses) || meses < 1 || meses > 12) {
      if (meses) toast("Escribe un número de meses entre 1 y 12.", "error");
      return;
    }
    const referencia = prompt("Referencia del pago manual (opcional):", "");
    if (referencia === null) return;
    boton.disabled = true;
    try {
      await repo.activarSuscripcion(boton.dataset.activar, plan, meses, referencia.trim() || null);
      toast(`Activado: ${nombre} por ${meses} mes${meses === 1 ? "" : "es"}.`);
      await pintarTablero();
    } catch (error) {
      toast(error, "error");
    } finally {
      boton.disabled = false;
    }
  });

  delegar(contenedor, "click", "[data-cortesia]", async (_ev, boton) => {
    const negocio = boton.dataset.negocio || "este negocio";
    const valor = prompt(`¿Cuántos meses de cortesía para ${negocio}?`, "1");
    if (valor === null) return;
    const meses = Number(valor);
    if (!Number.isInteger(meses) || meses < 1 || meses > 12) {
      toast("Escribe un número de meses entre 1 y 12.", "error");
      return;
    }
    boton.disabled = true;
    try {
      await repo.darCortesia(boton.dataset.cortesia, meses, "Cortesía desde el panel del operador");
      toast(`${meses} mes${meses === 1 ? "" : "es"} de cortesía agregado${meses === 1 ? "" : "s"}.`);
      await pintarTablero();
    } catch (error) {
      toast(error, "error");
    } finally {
      boton.disabled = false;
    }
  });

  delegar(contenedor, "click", "[data-suspender]", async (_ev, boton) => {
    if (!confirm("¿Suspender esta tienda? Dejará de aparecer, pero no se borrará.")) return;
    boton.disabled = true;
    try {
      await repo.suspenderTienda(boton.dataset.suspender, true);
      toast("Tienda suspendida.");
      await pintarTablero();
    } catch (error) {
      toast(error, "error");
    }
  });

  delegar(contenedor, "click", "[data-reactivar]", async (_ev, boton) => {
    boton.disabled = true;
    try {
      await repo.suspenderTienda(boton.dataset.reactivar, false);
      toast("Suspensión quitada.");
      await pintarTablero();
    } catch (error) {
      toast(error, "error");
    }
  });

  contenedor.querySelector("[data-barrer]")?.addEventListener("click", async (evento) => {
    const boton = evento.currentTarget;
    boton.disabled = true;
    try {
      const total = await repo.barrerVencidas();
      toast(total > 0 ? `${total} tienda${total === 1 ? "" : "s"} marcada${total === 1 ? "" : "s"} como vencida${total === 1 ? "" : "s"}.` : "Todo al día.");
      await pintarTablero();
    } catch (error) {
      toast(error, "error");
    } finally {
      boton.disabled = false;
    }
  });

  contenedor.querySelector("[data-csv]")?.addEventListener("click", async () => {
    try {
      const filas = [["negocio", "categoria", "plan", "estado", "vence"]];
      (await repo.tableroSuscripciones()).forEach((f) => filas.push([f.nombre, f.categoria, f.plan, f.estado, f.vence || ""]));
      descargar(`pueblopedidos-suscripciones-${fechaHora(new Date().toISOString())}.csv`, csv(filas));
      toast("Reporte descargado.");
    } catch (error) {
      toast(error, "error");
    }
  });
}

function esClipAutomatico(f) {
  // El RPC manual también bloquea metodo='clip'. Nunca mostramos acciones
  // manuales aunque un registro histórico esté incompleto.
  return String(f.metodo || "").toLowerCase() === "clip";
}

function tipoCompra(f) {
  const nota = String(f.nota || "");
  const codigo = f.purchase_type ||
    (nota.startsWith("destacar_producto:") ? "product_feature" : nota === "destacar_tienda" ? "store_feature" : "subscription");
  if (codigo === "product_feature") return { codigo, texto: `Producto destacado · ${Number(f.promo_days) || 7} días` };
  if (codigo === "store_feature") return { codigo, texto: `Tienda destacada · ${Number(f.promo_days) || 7} días` };
  const meses = Number(f.meses) || 1;
  const plan = f.plan === "destacado" ? "Destacado" : "Presencia";
  return { codigo: "subscription", texto: `${plan} · ${meses} mes${meses === 1 ? "" : "es"}` };
}

function notaVisible(nota) {
  const texto = String(nota || "").trim();
  if (!texto || texto === "destacar_tienda" || texto.startsWith("destacar_producto:")) return "";
  return texto;
}

function ayudaVerificar(f) {
  if (esClipAutomatico(f)) {
    return html`<a
      class="boton boton--contorno boton--chico"
      href="https://dashboard.clip.mx/transactions"
      target="_blank"
      rel="noopener"
      title="Busca ${dinero(f.monto)}${f.creado_en ? ` del ${fechaCorta(f.creado_en)}` : ""}"
    >Ver en Clip</a>`;
  }
  if (f.metodo === "transferencia") {
    return html`<button class="boton boton--contorno boton--chico" data-copiar-monto="${f.monto}" type="button">Copiar monto</button>`;
  }
  return "";
}

function selloClip(estado) {
  const codigo = String(estado || "PENDIENTE").toUpperCase();
  const mapa = {
    CREATING: "Creando enlace",
    CHECKOUT_CREATED: "Enlace creado",
    CHECKOUT_PENDING: "Pendiente en Clip",
    PENDING: "Pendiente en Clip",
  };
  return html`<span class="sello sello--promo">${mapa[codigo] || "Conciliación automática"}</span>`;
}

function etiquetaMetodoOp(metodo) {
  return { clip: "En línea", transferencia: "Transferencia", efectivo: "Efectivo" }[metodo] || "Otro";
}

function selloEstado(estado) {
  const mapa = {
    activa: ["sello--abierto", "Activa"],
    prueba: ["sello--promo", "Prueba"],
    vencida: ["sello--cerrado", "Vencida"],
    suspendida: ["sello--oferta", "Suspendida"],
  };
  const [clase, texto] = mapa[estado] || ["sello--modo", estado || "Sin estado"];
  return html`<span class="sello ${clase}">${texto}</span>`;
}

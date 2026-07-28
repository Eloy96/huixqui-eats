// Vista de operador (tú). Ruta oculta: #/operador
//
// En nube esta vista la protege una política de RLS + la función
// resumen_plataforma, que solo responde a un perfil con role='admin'.
// La ruta escondida no es seguridad; la seguridad está en la base.

import { html, pintarEn, delegar, copiar } from "./lib-dom.js";
import { vacio, esqueletoLista, toast } from "./lib-ui.js";
import * as repo from "./datos-repo.js";
import { dinero, csv, descargar, fechaHora, fechaCorta } from "./lib-formato.js";

export async function vistaAdmin(contenedor) {
  pintarEn(contenedor, html`<h1>Operación</h1><div style="margin-top:var(--e-4)">${esqueletoLista(2)}</div>`);

  let resumen;
  let tiendas = [];
  try {
    [resumen, tiendas] = await Promise.all([repo.resumenPlataforma(), repo.tiendas()]);
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

  const ingresoTotal =
    Number(resumen.ingresoContactos || 0) +
    Number(resumen.ingresoRecargas || 0) +
    Number(resumen.ingresoPromos || 0);

  pintarEn(
    contenedor,
    html`
      <h1>Operación</h1>
      <p style="color:var(--tinta-60);font-size:var(--t-sm);margin-top:var(--e-1)">
        ${repo.modo() === "demo" ? "Datos del demo local" : "Datos en vivo"}
      </p>

      <div class="metricas" style="margin-top:var(--e-4)">
        <div class="metrica">
          <span>Ingreso</span>
          <strong>${dinero(ingresoTotal)}</strong>
          <small>contactos + recargas + promos</small>
        </div>
        <div class="metrica">
          <span>Contactos</span>
          <strong>${resumen.contactosCobrados || 0}</strong>
          <small>${dinero(resumen.ingresoContactos || 0)}</small>
        </div>
        <div class="metrica">
          <span>Negocios</span>
          <strong>${resumen.tiendas ?? tiendas.length}</strong>
          <small>${resumen.tiendasSinCredito || 0} con saldo bajo</small>
        </div>
        <div class="metrica">
          <span>Pedidos</span>
          <strong>${resumen.pedidos || 0}</strong>
          <small>${dinero(resumen.ventasTotales || 0)} movidos</small>
        </div>
      </div>

      <section style="margin-top:var(--e-6)">
        <div class="seccion-cabeza">
          <div>
            <h2>Pagos por verificar</h2>
            <p>Compara con tu estado de cuenta antes de confirmar</p>
          </div>
        </div>
        <div data-cola></div>
      </section>

      <section style="margin-top:var(--e-6)">
        <div class="seccion-cabeza">
          <div>
            <h2>Suscripciones</h2>
            <p>Las que están por vencer salen primero</p>
          </div>
          <div style="display:flex;gap:var(--e-2)">
            <button class="boton boton--contorno boton--chico" data-barrer type="button">Actualizar estados</button>
            <button class="boton boton--texto" data-csv type="button">CSV</button>
          </div>
        </div>
        <div data-tablero></div>
      </section>
    `,
  );

  const pintarTablero = async () => {
    const zona = contenedor.querySelector("[data-tablero]");
    const filas = await repo.tableroSuscripciones();
    if (!filas.length) {
      pintarEn(zona, html`<p style="color:var(--tinta-60)">Aún no hay negocios registrados.</p>`);
      return;
    }
    pintarEn(
      zona,
      html`
        <div class="tabla-envoltura">
          <table class="tabla">
            <thead>
              <tr><th>Negocio</th><th>Plan</th><th>Estado</th><th>Vence</th><th>Activar pago</th></tr>
            </thead>
            <tbody>
              ${filas.map(
                (f) => html`
                  <tr>
                    <td>
                      <a href="#/tienda/${f.store_id}" style="color:var(--verde-500);font-weight:var(--peso-medio)">${f.nombre}</a>
                      <small style="display:block;color:var(--tinta-60)">${f.categoria}</small>
                    </td>
                    <td>${f.plan === "destacado" ? "Destacado" : "Presencia"}</td>
                    <td>${selloEstado(f.estado)}</td>
                    <td>
                      ${f.vence ? fechaCorta(f.vence) : "—"}
                      ${["activa", "prueba"].includes(f.estado)
                        ? html`<small style="display:block;color:var(--tinta-60)">${f.dias_restantes} días</small>`
                        : ""}
                    </td>
                    <td>
                      <div class="acciones-sub">
                        <button class="boton boton--contorno boton--chico" data-activar="${f.store_id}" data-plan="presencia" type="button">
                          $99 Presencia
                        </button>
                        <button class="boton boton--contorno boton--chico" data-activar="${f.store_id}" data-plan="destacado" type="button">
                          $200 Destacado
                        </button>
                        <button class="boton boton--texto" data-cortesia="${f.store_id}" data-negocio="${f.negocio}" type="button">
                          Regalar mes
                        </button>
                        ${f.estado === "suspendida"
                          ? html`<button class="boton boton--texto" data-reactivar="${f.store_id}" type="button">Quitar suspensión</button>`
                          : html`<button class="boton boton--texto" data-suspender="${f.store_id}" type="button">Suspender</button>`}
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
  };
  // ── La cola de pagos ──
  // Lo primero que ves al entrar: alguien está esperando que le
  // confirmes su pago para poder vender.
  // El link de Clip y demás datos, para armar los accesos de verificación.
  let cobro = {};
  try {
    cobro = await repo.configCobro();
  } catch {
    cobro = {};
  }

  const pintarCola = async () => {
    const zona = contenedor.querySelector("[data-cola]");
    let filas = [];
    try {
      filas = await repo.colaPagos();
    } catch (error) {
      pintarEn(zona, html`<p style="color:var(--tinta-60)">
        No se pudo cargar la cola: ${error.message} ¿Corriste 09-cobros.sql?
      </p>`);
      return;
    }

    const pendientes = filas.filter((f) => f.estado === "por_verificar");
    if (!pendientes.length) {
      pintarEn(zona, html`<p style="color:var(--tinta-60)">
        Nada pendiente. Los pagos nuevos aparecen aquí.
      </p>`);
      return;
    }

    pintarEn(
      zona,
      html`${pendientes.map(
        (f) => html`
          <div class="pago-fila">
            <div class="pago-fila-info">
              <strong>${f.negocio}</strong>
              <div class="pago-fila-datos">
                <span class="cifra">${dinero(f.monto)}</span>
                <span>${f.plan === "destacado" ? "Destacado" : "Presencia"} · ${f.meses} mes${f.meses === 1 ? "" : "es"}</span>
                <span>${etiquetaMetodoOp(f.metodo)}</span>
                ${f.referencia ? html`<code>${f.referencia}</code>` : ""}
              </div>
              ${f.nota ? html`<small class="pago-fila-nota">"${f.nota}"</small>` : ""}
              ${f.plan === "destacado" && !f.categoria_libre
                ? html`<small class="pago-fila-alerta">
                    ⚠️ Otro negocio ya tiene el destacado de ${f.categoria}. Si confirmas, va a fallar.
                  </small>`
                : ""}
            </div>
            <div class="pago-fila-acciones">
              ${ayudaVerificar(f, cobro)}
              <button class="boton boton--principal boton--chico" data-confirmar="${f.id}" type="button">
                Confirmar
              </button>
              <button class="boton boton--texto" data-rechazar="${f.id}" type="button">Rechazar</button>
            </div>
          </div>
        `,
      )}`,
    );
  };
  await pintarCola();

  delegar(contenedor, "click", "[data-confirmar]", async (_ev, boton) => {
    // Un clic. Ya ves negocio, monto y referencia en la fila; no hace falta
    // un popup que confirme lo que ya estás viendo. Si te equivocas,
    // "suspender" en el tablero de abajo lo revierte.
    boton.disabled = true;
    boton.textContent = "Activando...";
    try {
      const r = await repo.verificarPago(boton.dataset.confirmar, true, null);
      toast(r?.destacado ? "Listo. Plan activo y espacio destacado asignado." : "Listo. Plan activo.");
      await pintarCola();
      await pintarTablero();
    } catch (error) {
      toast(error, "error");
      boton.disabled = false;
      boton.textContent = "Confirmar";
    }
  });

  delegar(contenedor, "click", "[data-copiar-monto]", async (_ev, boton) => {
    const ok = await copiar(boton.dataset.copiarMonto);
    toast(ok ? "Monto copiado. Pégalo en el buscador de tu banco." : "No se pudo copiar.", ok ? "ok" : "error");
  });

  delegar(contenedor, "click", "[data-rechazar]", async (_ev, boton) => {
    const motivo = prompt("¿Por qué no se pudo confirmar?\n(el negocio lo va a leer)", "No encontramos el pago");
    if (motivo === null) return;
    try {
      await repo.verificarPago(boton.dataset.rechazar, false, motivo);
      toast("Marcado como no confirmado.");
      await pintarCola();
    } catch (error) {
      toast(error, "error");
    }
  });

  await pintarTablero();

  // Activar un pago (lo que haces tras ver el cobro en Clip).
  delegar(contenedor, "click", "[data-activar]", async (_ev, boton) => {
    const plan = boton.dataset.plan;
    const nombre = plan === "destacado" ? "Destacado ($200)" : "Presencia ($99)";
    const meses = Number(prompt(`¿Cuántos meses de ${nombre}?\n(escribe un número; normalmente 1)`, "1"));
    if (!meses || meses < 1) return;
    const ref = prompt("Referencia del pago en Clip (opcional, para tu control):", "") || null;
    boton.disabled = true;
    try {
      await repo.activarSuscripcion(boton.dataset.activar, plan, meses, ref);
      toast(`Activado: ${nombre} × ${meses} mes(es).`);
      // ── La cola de pagos ──
  // Lo primero que ves al entrar: alguien está esperando que le
  // confirmes su pago para poder vender.
  // El link de Clip y demás datos, para armar los accesos de verificación.
  let cobro = {};
  try {
    cobro = await repo.configCobro();
  } catch {
    cobro = {};
  }

  const pintarCola = async () => {
    const zona = contenedor.querySelector("[data-cola]");
    let filas = [];
    try {
      filas = await repo.colaPagos();
    } catch (error) {
      pintarEn(zona, html`<p style="color:var(--tinta-60)">
        No se pudo cargar la cola: ${error.message} ¿Corriste 09-cobros.sql?
      </p>`);
      return;
    }

    const pendientes = filas.filter((f) => f.estado === "por_verificar");
    if (!pendientes.length) {
      pintarEn(zona, html`<p style="color:var(--tinta-60)">
        Nada pendiente. Los pagos nuevos aparecen aquí.
      </p>`);
      return;
    }

    pintarEn(
      zona,
      html`${pendientes.map(
        (f) => html`
          <div class="pago-fila">
            <div class="pago-fila-info">
              <strong>${f.negocio}</strong>
              <div class="pago-fila-datos">
                <span class="cifra">${dinero(f.monto)}</span>
                <span>${f.plan === "destacado" ? "Destacado" : "Presencia"} · ${f.meses} mes${f.meses === 1 ? "" : "es"}</span>
                <span>${etiquetaMetodoOp(f.metodo)}</span>
                ${f.referencia ? html`<code>${f.referencia}</code>` : ""}
              </div>
              ${f.nota ? html`<small class="pago-fila-nota">"${f.nota}"</small>` : ""}
              ${f.plan === "destacado" && !f.categoria_libre
                ? html`<small class="pago-fila-alerta">
                    ⚠️ Otro negocio ya tiene el destacado de ${f.categoria}. Si confirmas, va a fallar.
                  </small>`
                : ""}
            </div>
            <div class="pago-fila-acciones">
              ${ayudaVerificar(f, cobro)}
              <button class="boton boton--principal boton--chico" data-confirmar="${f.id}" type="button">
                Confirmar
              </button>
              <button class="boton boton--texto" data-rechazar="${f.id}" type="button">Rechazar</button>
            </div>
          </div>
        `,
      )}`,
    );
  };
  await pintarCola();

  delegar(contenedor, "click", "[data-confirmar]", async (_ev, boton) => {
    // Un clic. Ya ves negocio, monto y referencia en la fila; no hace falta
    // un popup que confirme lo que ya estás viendo. Si te equivocas,
    // "suspender" en el tablero de abajo lo revierte.
    boton.disabled = true;
    boton.textContent = "Activando...";
    try {
      const r = await repo.verificarPago(boton.dataset.confirmar, true, null);
      toast(r?.destacado ? "Listo. Plan activo y espacio destacado asignado." : "Listo. Plan activo.");
      await pintarCola();
      await pintarTablero();
    } catch (error) {
      toast(error, "error");
      boton.disabled = false;
      boton.textContent = "Confirmar";
    }
  });

  delegar(contenedor, "click", "[data-copiar-monto]", async (_ev, boton) => {
    const ok = await copiar(boton.dataset.copiarMonto);
    toast(ok ? "Monto copiado. Pégalo en el buscador de tu banco." : "No se pudo copiar.", ok ? "ok" : "error");
  });

  delegar(contenedor, "click", "[data-rechazar]", async (_ev, boton) => {
    const motivo = prompt("¿Por qué no se pudo confirmar?\n(el negocio lo va a leer)", "No encontramos el pago");
    if (motivo === null) return;
    try {
      await repo.verificarPago(boton.dataset.rechazar, false, motivo);
      toast("Marcado como no confirmado.");
      await pintarCola();
    } catch (error) {
      toast(error, "error");
    }
  });

  await pintarTablero();
    } catch (error) {
      toast(error, "error");
      boton.disabled = false;
    }
  });

  delegar(contenedor, "click", "[data-cortesia]", async (_ev, boton) => {
    const negocio = boton.dataset.negocio || "este negocio";
    const meses = prompt(`¿Cuántos meses de cortesía para ${negocio}?\n(sin cobro — queda registrado como cortesía)`, "1");
    if (meses === null) return;
    const n = Math.max(1, Math.min(12, parseInt(meses, 10) || 1));
    try {
      await repo.darCortesia(boton.dataset.cortesia, n, "cortesía desde el panel");
      toast(`Listo. ${n} mes${n === 1 ? "" : "es"} de cortesía para ${negocio}.`);
      await pintarTablero();
    } catch (error) {
      toast(error, "error");
    }
  });

  delegar(contenedor, "click", "[data-suspender]", async (_ev, boton) => {
    if (!confirm("¿Suspender esta tienda? Dejará de aparecer, pero no se borra.")) return;
    try {
      await repo.suspenderTienda(boton.dataset.suspender, true);
      toast("Tienda suspendida.");
      // ── La cola de pagos ──
  // Lo primero que ves al entrar: alguien está esperando que le
  // confirmes su pago para poder vender.
  // El link de Clip y demás datos, para armar los accesos de verificación.
  let cobro = {};
  try {
    cobro = await repo.configCobro();
  } catch {
    cobro = {};
  }

  const pintarCola = async () => {
    const zona = contenedor.querySelector("[data-cola]");
    let filas = [];
    try {
      filas = await repo.colaPagos();
    } catch (error) {
      pintarEn(zona, html`<p style="color:var(--tinta-60)">
        No se pudo cargar la cola: ${error.message} ¿Corriste 09-cobros.sql?
      </p>`);
      return;
    }

    const pendientes = filas.filter((f) => f.estado === "por_verificar");
    if (!pendientes.length) {
      pintarEn(zona, html`<p style="color:var(--tinta-60)">
        Nada pendiente. Los pagos nuevos aparecen aquí.
      </p>`);
      return;
    }

    pintarEn(
      zona,
      html`${pendientes.map(
        (f) => html`
          <div class="pago-fila">
            <div class="pago-fila-info">
              <strong>${f.negocio}</strong>
              <div class="pago-fila-datos">
                <span class="cifra">${dinero(f.monto)}</span>
                <span>${f.plan === "destacado" ? "Destacado" : "Presencia"} · ${f.meses} mes${f.meses === 1 ? "" : "es"}</span>
                <span>${etiquetaMetodoOp(f.metodo)}</span>
                ${f.referencia ? html`<code>${f.referencia}</code>` : ""}
              </div>
              ${f.nota ? html`<small class="pago-fila-nota">"${f.nota}"</small>` : ""}
              ${f.plan === "destacado" && !f.categoria_libre
                ? html`<small class="pago-fila-alerta">
                    ⚠️ Otro negocio ya tiene el destacado de ${f.categoria}. Si confirmas, va a fallar.
                  </small>`
                : ""}
            </div>
            <div class="pago-fila-acciones">
              ${ayudaVerificar(f, cobro)}
              <button class="boton boton--principal boton--chico" data-confirmar="${f.id}" type="button">
                Confirmar
              </button>
              <button class="boton boton--texto" data-rechazar="${f.id}" type="button">Rechazar</button>
            </div>
          </div>
        `,
      )}`,
    );
  };
  await pintarCola();

  delegar(contenedor, "click", "[data-confirmar]", async (_ev, boton) => {
    // Un clic. Ya ves negocio, monto y referencia en la fila; no hace falta
    // un popup que confirme lo que ya estás viendo. Si te equivocas,
    // "suspender" en el tablero de abajo lo revierte.
    boton.disabled = true;
    boton.textContent = "Activando...";
    try {
      const r = await repo.verificarPago(boton.dataset.confirmar, true, null);
      toast(r?.destacado ? "Listo. Plan activo y espacio destacado asignado." : "Listo. Plan activo.");
      await pintarCola();
      await pintarTablero();
    } catch (error) {
      toast(error, "error");
      boton.disabled = false;
      boton.textContent = "Confirmar";
    }
  });

  delegar(contenedor, "click", "[data-copiar-monto]", async (_ev, boton) => {
    const ok = await copiar(boton.dataset.copiarMonto);
    toast(ok ? "Monto copiado. Pégalo en el buscador de tu banco." : "No se pudo copiar.", ok ? "ok" : "error");
  });

  delegar(contenedor, "click", "[data-rechazar]", async (_ev, boton) => {
    const motivo = prompt("¿Por qué no se pudo confirmar?\n(el negocio lo va a leer)", "No encontramos el pago");
    if (motivo === null) return;
    try {
      await repo.verificarPago(boton.dataset.rechazar, false, motivo);
      toast("Marcado como no confirmado.");
      await pintarCola();
    } catch (error) {
      toast(error, "error");
    }
  });

  await pintarTablero();
    } catch (error) {
      toast(error, "error");
    }
  });

  delegar(contenedor, "click", "[data-reactivar]", async (_ev, boton) => {
    try {
      await repo.suspenderTienda(boton.dataset.reactivar, false);
      toast("Suspensión quitada.");
      // ── La cola de pagos ──
  // Lo primero que ves al entrar: alguien está esperando que le
  // confirmes su pago para poder vender.
  // El link de Clip y demás datos, para armar los accesos de verificación.
  let cobro = {};
  try {
    cobro = await repo.configCobro();
  } catch {
    cobro = {};
  }

  const pintarCola = async () => {
    const zona = contenedor.querySelector("[data-cola]");
    let filas = [];
    try {
      filas = await repo.colaPagos();
    } catch (error) {
      pintarEn(zona, html`<p style="color:var(--tinta-60)">
        No se pudo cargar la cola: ${error.message} ¿Corriste 09-cobros.sql?
      </p>`);
      return;
    }

    const pendientes = filas.filter((f) => f.estado === "por_verificar");
    if (!pendientes.length) {
      pintarEn(zona, html`<p style="color:var(--tinta-60)">
        Nada pendiente. Los pagos nuevos aparecen aquí.
      </p>`);
      return;
    }

    pintarEn(
      zona,
      html`${pendientes.map(
        (f) => html`
          <div class="pago-fila">
            <div class="pago-fila-info">
              <strong>${f.negocio}</strong>
              <div class="pago-fila-datos">
                <span class="cifra">${dinero(f.monto)}</span>
                <span>${f.plan === "destacado" ? "Destacado" : "Presencia"} · ${f.meses} mes${f.meses === 1 ? "" : "es"}</span>
                <span>${etiquetaMetodoOp(f.metodo)}</span>
                ${f.referencia ? html`<code>${f.referencia}</code>` : ""}
              </div>
              ${f.nota ? html`<small class="pago-fila-nota">"${f.nota}"</small>` : ""}
              ${f.plan === "destacado" && !f.categoria_libre
                ? html`<small class="pago-fila-alerta">
                    ⚠️ Otro negocio ya tiene el destacado de ${f.categoria}. Si confirmas, va a fallar.
                  </small>`
                : ""}
            </div>
            <div class="pago-fila-acciones">
              ${ayudaVerificar(f, cobro)}
              <button class="boton boton--principal boton--chico" data-confirmar="${f.id}" type="button">
                Confirmar
              </button>
              <button class="boton boton--texto" data-rechazar="${f.id}" type="button">Rechazar</button>
            </div>
          </div>
        `,
      )}`,
    );
  };
  await pintarCola();

  delegar(contenedor, "click", "[data-confirmar]", async (_ev, boton) => {
    // Un clic. Ya ves negocio, monto y referencia en la fila; no hace falta
    // un popup que confirme lo que ya estás viendo. Si te equivocas,
    // "suspender" en el tablero de abajo lo revierte.
    boton.disabled = true;
    boton.textContent = "Activando...";
    try {
      const r = await repo.verificarPago(boton.dataset.confirmar, true, null);
      toast(r?.destacado ? "Listo. Plan activo y espacio destacado asignado." : "Listo. Plan activo.");
      await pintarCola();
      await pintarTablero();
    } catch (error) {
      toast(error, "error");
      boton.disabled = false;
      boton.textContent = "Confirmar";
    }
  });

  delegar(contenedor, "click", "[data-copiar-monto]", async (_ev, boton) => {
    const ok = await copiar(boton.dataset.copiarMonto);
    toast(ok ? "Monto copiado. Pégalo en el buscador de tu banco." : "No se pudo copiar.", ok ? "ok" : "error");
  });

  delegar(contenedor, "click", "[data-rechazar]", async (_ev, boton) => {
    const motivo = prompt("¿Por qué no se pudo confirmar?\n(el negocio lo va a leer)", "No encontramos el pago");
    if (motivo === null) return;
    try {
      await repo.verificarPago(boton.dataset.rechazar, false, motivo);
      toast("Marcado como no confirmado.");
      await pintarCola();
    } catch (error) {
      toast(error, "error");
    }
  });

  await pintarTablero();
    } catch (error) {
      toast(error, "error");
    }
  });

  contenedor.querySelector("[data-barrer]").addEventListener("click", async (ev) => {
    ev.currentTarget.disabled = true;
    const n = await repo.barrerVencidas();
    toast(n > 0 ? `${n} tienda(s) marcadas como vencidas.` : "Todo al día.");
    // ── La cola de pagos ──
  // Lo primero que ves al entrar: alguien está esperando que le
  // confirmes su pago para poder vender.
  // El link de Clip y demás datos, para armar los accesos de verificación.
  let cobro = {};
  try {
    cobro = await repo.configCobro();
  } catch {
    cobro = {};
  }

  const pintarCola = async () => {
    const zona = contenedor.querySelector("[data-cola]");
    let filas = [];
    try {
      filas = await repo.colaPagos();
    } catch (error) {
      pintarEn(zona, html`<p style="color:var(--tinta-60)">
        No se pudo cargar la cola: ${error.message} ¿Corriste 09-cobros.sql?
      </p>`);
      return;
    }

    const pendientes = filas.filter((f) => f.estado === "por_verificar");
    if (!pendientes.length) {
      pintarEn(zona, html`<p style="color:var(--tinta-60)">
        Nada pendiente. Los pagos nuevos aparecen aquí.
      </p>`);
      return;
    }

    pintarEn(
      zona,
      html`${pendientes.map(
        (f) => html`
          <div class="pago-fila">
            <div class="pago-fila-info">
              <strong>${f.negocio}</strong>
              <div class="pago-fila-datos">
                <span class="cifra">${dinero(f.monto)}</span>
                <span>${f.plan === "destacado" ? "Destacado" : "Presencia"} · ${f.meses} mes${f.meses === 1 ? "" : "es"}</span>
                <span>${etiquetaMetodoOp(f.metodo)}</span>
                ${f.referencia ? html`<code>${f.referencia}</code>` : ""}
              </div>
              ${f.nota ? html`<small class="pago-fila-nota">"${f.nota}"</small>` : ""}
              ${f.plan === "destacado" && !f.categoria_libre
                ? html`<small class="pago-fila-alerta">
                    ⚠️ Otro negocio ya tiene el destacado de ${f.categoria}. Si confirmas, va a fallar.
                  </small>`
                : ""}
            </div>
            <div class="pago-fila-acciones">
              ${ayudaVerificar(f, cobro)}
              <button class="boton boton--principal boton--chico" data-confirmar="${f.id}" type="button">
                Confirmar
              </button>
              <button class="boton boton--texto" data-rechazar="${f.id}" type="button">Rechazar</button>
            </div>
          </div>
        `,
      )}`,
    );
  };
  await pintarCola();

  delegar(contenedor, "click", "[data-confirmar]", async (_ev, boton) => {
    // Un clic. Ya ves negocio, monto y referencia en la fila; no hace falta
    // un popup que confirme lo que ya estás viendo. Si te equivocas,
    // "suspender" en el tablero de abajo lo revierte.
    boton.disabled = true;
    boton.textContent = "Activando...";
    try {
      const r = await repo.verificarPago(boton.dataset.confirmar, true, null);
      toast(r?.destacado ? "Listo. Plan activo y espacio destacado asignado." : "Listo. Plan activo.");
      await pintarCola();
      await pintarTablero();
    } catch (error) {
      toast(error, "error");
      boton.disabled = false;
      boton.textContent = "Confirmar";
    }
  });

  delegar(contenedor, "click", "[data-copiar-monto]", async (_ev, boton) => {
    const ok = await copiar(boton.dataset.copiarMonto);
    toast(ok ? "Monto copiado. Pégalo en el buscador de tu banco." : "No se pudo copiar.", ok ? "ok" : "error");
  });

  delegar(contenedor, "click", "[data-rechazar]", async (_ev, boton) => {
    const motivo = prompt("¿Por qué no se pudo confirmar?\n(el negocio lo va a leer)", "No encontramos el pago");
    if (motivo === null) return;
    try {
      await repo.verificarPago(boton.dataset.rechazar, false, motivo);
      toast("Marcado como no confirmado.");
      await pintarCola();
    } catch (error) {
      toast(error, "error");
    }
  });

  await pintarTablero();
    ev.currentTarget.disabled = false;
  });

  contenedor.querySelector("[data-csv]").addEventListener("click", async () => {
    const filas = [["negocio", "categoria", "plan", "estado", "vence"]];
    (await repo.tableroSuscripciones()).forEach((f) =>
      filas.push([f.nombre, f.categoria, f.plan, f.estado, f.vence || ""]),
    );
    descargar(`pueblopedidos-suscripciones-${fechaHora(new Date().toISOString())}.csv`, csv(filas));
    toast("Reporte descargado.");
  });
}

/**
 * El acceso de verificación, distinto según cómo pagó:
 *   · Clip          → botón que abre tu panel de Clip para buscar el cobro.
 *   · Transferencia → botón que copia el monto exacto, para pegarlo en el
 *                     buscador de tu app del banco.
 *   · Efectivo      → nada que verificar en pantalla; lo tienes en la mano.
 *
 * No automatiza (eso es el webhook, más adelante), pero convierte el
 * "déjame revisar" en un clic.
 */
function ayudaVerificar(f, cobro) {
  if (f.metodo === "clip" && cobro.clipLink) {
    // El panel de transacciones de Clip; el operador busca por monto/fecha.
    return html`<a
      class="boton boton--contorno boton--chico"
      href="https://dashboard.clip.mx/transactions"
      target="_blank"
      rel="noopener"
      title="Busca ${dinero(f.monto)} del ${fechaCorta(f.creado_en)}"
    >
      Ver en Clip
    </a>`;
  }
  if (f.metodo === "transferencia") {
    return html`<button
      class="boton boton--contorno boton--chico"
      data-copiar-monto="${f.monto}"
      type="button"
      title="Copia el monto para buscarlo en tu banco"
    >
      Copiar monto
    </button>`;
  }
  return "";
}

function etiquetaMetodoOp(m) {
  return { clip: "En línea", transferencia: "Transferencia", efectivo: "Efectivo" }[m] || "Otro";
}

function selloEstado(estado) {
  const mapa = {
    activa: ["sello--abierto", "Activa"],
    prueba: ["sello--promo", "Prueba"],
    vencida: ["sello--cerrado", "Vencida"],
    suspendida: ["sello--oferta", "Suspendida"],
  };
  const [clase, texto] = mapa[estado] || ["sello--modo", estado];
  return html`<span class="sello ${clase}">${texto}</span>`;
}

// Vista de operador (tú). Ruta oculta: #/operador
//
// En nube esta vista la protege una política de RLS + la función
// resumen_plataforma, que solo responde a un perfil con role='admin'.
// La ruta escondida no es seguridad; la seguridad está en la base.

import { html, pintarEn } from "./lib-dom.js";
import { vacio, esqueletoLista, toast } from "./lib-ui.js";
import * as repo from "./datos-repo.js";
import { dinero, csv, descargar, fechaHora } from "./lib-formato.js";

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
            <h2>Negocios</h2>
            <p>Ordenados por saldo de contactos</p>
          </div>
          <button class="boton boton--texto" data-csv type="button">Descargar CSV</button>
        </div>
        <div class="tabla-envoltura">
          <table class="tabla">
            <thead>
              <tr><th>Negocio</th><th>Categoría</th><th>Contactos</th><th>Gasto</th></tr>
            </thead>
            <tbody>
              ${tiendas
                .slice()
                .sort((a, b) => Number(a.credits) - Number(b.credits))
                .map(
                  (t) => html`
                    <tr>
                      <td>
                        <a href="#/tienda/${t.slug || t.id}" style="color:var(--verde-700);font-weight:var(--peso-medio)">
                          ${t.name}
                        </a>
                      </td>
                      <td>${t.category}</td>
                      <td style="${Number(t.credits) <= 5 ? "color:var(--error-500);font-weight:var(--peso-fuerte)" : ""}">
                        ${t.credits}
                      </td>
                      <td>${dinero(Number(t.creditSpend || 0) + Number(t.marketingSpend || 0))}</td>
                    </tr>
                  `,
                )}
            </tbody>
          </table>
        </div>
      </section>
    `,
  );

  contenedor.querySelector("[data-csv]").addEventListener("click", () => {
    const filas = [["negocio", "categoria", "contactos", "gasto_recargas", "gasto_promos", "whatsapp"]];
    tiendas.forEach((t) =>
      filas.push([t.name, t.category, t.credits, t.creditSpend || 0, t.marketingSpend || 0, t.phone]),
    );
    descargar(`pueblopedidos-negocios-${fechaHora(new Date().toISOString())}.csv`, csv(filas));
    toast("Reporte descargado.");
  });
}

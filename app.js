// Arranque. Este archivo solo conecta cosas: no tiene lógica de negocio.

import { html, pintarEn, $ } from "./lib-dom.js";
import { icono, cerrarHoja, toast } from "./lib-ui.js";
import * as router from "./lib-router.js";
import * as repo from "./datos-repo.js";
import { estado, alCambiar as alCambiarEstado, piezas, totalCarrito } from "./estado.js";
import { dinero } from "./lib-formato.js";
import { CONFIG_SUPABASE } from "./config.js";

import { vistaInicio } from "./vista-inicio.js";
import { vistaBuscar } from "./vista-buscar.js";
import { vistaTienda } from "./vista-tienda.js";
import { vistaCarrito } from "./vista-carrito.js";
import { vistaPedidos } from "./vista-pedidos.js";
import { vistaCuenta } from "./vista-cuenta.js";
import { vistaPanel } from "./vista-panel.js";
import { vistaAdmin } from "./vista-admin.js";
import { vistaPrivacidad, vistaTerminos } from "./vista-legal.js";
import { abrirSelectorUbicacion } from "./vista-ubicacion.js";

const contenido = $("#contenido");

// ---------- Rutas ----------

router.definir("/", vistaInicio);
router.definir("/buscar", vistaBuscar);
router.definir("/tienda/:slug", vistaTienda);
router.definir("/carrito", vistaCarrito);
router.definir("/pedidos", vistaPedidos);
router.definir("/cuenta", vistaCuenta);
router.definir("/panel", vistaPanel);
router.definir("/operador", vistaAdmin);
router.definir("/privacidad", vistaPrivacidad);
router.definir("/terminos", vistaTerminos);

router.alNavegar(async ({ ruta, params, manejador }) => {
  cerrarHoja();
  window.scrollTo({ top: 0, behavior: "instant" });
  pintarNav(ruta);

  if (!manejador) {
    pintarEn(
      contenido,
      html`
        <div class="vacio" style="margin-top:var(--e-8)">
          <strong>Esa página no existe</strong>
          <p>El link puede estar mal escrito o el negocio ya no está publicado.</p>
          <a class="boton boton--principal" href="#/">Ir al inicio</a>
        </div>
      `,
    );
    return;
  }

  try {
    await manejador(contenido, params);
  } catch (error) {
    console.error(error);
    pintarEn(
      contenido,
      html`
        <div class="vacio" style="margin-top:var(--e-8)">
          <strong>Algo se rompió al cargar</strong>
          <p>${error.message}</p>
          <button class="boton boton--contorno" onclick="location.reload()" type="button">Reintentar</button>
        </div>
      `,
    );
  }
  pintarBarraCarrito();
});

// ---------- Chasis ----------

const NAV = [
  { ruta: "/", texto: "Inicio", icono: "inicio" },
  { ruta: "/buscar", texto: "Buscar", icono: "buscar" },
  { ruta: "/carrito", texto: "Carrito", icono: "carrito" },
  { ruta: "/pedidos", texto: "Pedidos", icono: "pedidos" },
  { ruta: "/cuenta", texto: "Cuenta", icono: "cuenta" },
];

function pintarNav(rutaActual = router.rutaActual()) {
  const sesion = repo.sesion();
  // "Pedidos" solo tiene sentido con sesión: sin cuenta no hay historial
  // que mostrar, y una pestaña que siempre lleva a una pantalla vacía
  // gasta espacio en la barra de un teléfono.
  const items =
    sesion?.role === "store"
      ? [
          { ruta: "/", texto: "Inicio", icono: "inicio" },
          { ruta: "/panel", texto: "Mi panel", icono: "tienda" },
          { ruta: "/buscar", texto: "Buscar", icono: "buscar" },
          { ruta: "/cuenta", texto: "Cuenta", icono: "cuenta" },
        ]
      : sesion
        ? NAV
        : NAV.filter((i) => i.ruta !== "/pedidos");

  pintarEn(
    $("#nav"),
    items.map((item) => {
      const activo = rutaActual === item.ruta || (item.ruta !== "/" && rutaActual.startsWith(item.ruta));
      const n = item.ruta === "/carrito" ? piezas() : 0;
      return html`
        <a class="nav-item" href="#${item.ruta}" ${activo ? 'aria-current="page"' : ""}>
          ${icono[item.icono]()}
          <span>${item.texto}</span>
          ${n ? html`<span class="nav-globo">${n}</span>` : ""}
        </a>
      `;
    }),
  );
}

function pintarCabecera() {
  const sesion = repo.sesion();
  const etiqueta =
    estado.etiquetaUbicacion ||
    (estado.ubicacion ? "Cerca de ti" : "") ||
    (sesion?.role === "client" && sesion.perfil.address) ||
    "Todo el pueblo";

  pintarEn(
    $("#header-fila"),
    html`
      <a class="marca" href="#/" aria-label="PuebloPedidos, inicio">
        <span class="marca-sello" aria-hidden="true">PP</span>
        <span class="solo-lectores">PuebloPedidos</span>
      </a>
      <button class="header-direccion" data-ubicacion type="button" title="${etiqueta}">
        <span>${estado.modoPedido === "Recoger" ? "Recoger cerca de" : "Entregar en"}</span>
        <strong>${etiqueta}</strong>
      </button>
      <div class="header-acciones">
        ${sesion
          ? html`<a class="header-cuenta" href="#/cuenta" aria-label="Mi cuenta">
              ${icono.cuenta()}
              <span class="header-cuenta-nombre">${nombreCorto(sesion)}</span>
            </a>`
          : html`<a class="boton boton--chico boton--principal" href="#/cuenta">Entrar</a>`}
      </div>
    `,
  );

  $("[data-ubicacion]").addEventListener("click", () => {
    // Abre el selector de dirección. Antes esto empujaba a otra pantalla,
    // que no es lo que promete un botón que dice "Entregar en".
    abrirSelectorUbicacion(() => {
      pintarCabecera();
      // Si estamos en el inicio, se repinta para reordenar por cercanía.
      if (router.rutaActual() === "/") vistaInicio(contenido);
    });
  });
}

/**
 * El nombre que va junto al icono de perfil.
 *
 * Corto a propósito: en un teléfono compite con la dirección por el mismo
 * renglón. "Tacos Don Luis" cabe; "Taquería y Cenaduría Don Luis" no, así
 * que se toma la primera palabra larga.
 */
function nombreCorto(sesion) {
  const nombre = String(sesion?.perfil?.name || "").trim();
  if (!nombre) return sesion?.role === "store" ? "Mi negocio" : "Mi cuenta";
  if (nombre.length <= 14) return nombre;
  const primera = nombre.split(/\s+/)[0];
  return primera.length <= 14 ? primera : `${nombre.slice(0, 12)}…`;
}

function pintarPie() {
  const zona = $("#pie");
  if (!zona) return;
  pintarEn(
    zona,
    html`
      <footer class="pie">
        <span>PuebloPedidos · los negocios de tu pueblo</span>
        <a href="#/terminos">Términos y Condiciones</a>
        <a href="#/privacidad">Aviso de Privacidad</a>
      </footer>
    `,
  );
}

function pintarCintaDemo() {
  const zona = $("#cinta");
  if (repo.modo() !== "demo") {
    pintarEn(zona, "");
    return;
  }
  pintarEn(
    zona,
    html`<div class="cinta-demo">
      Modo demo: los datos viven solo en este navegador. ${repo.motivoDemo()}
    </div>`,
  );
}

function pintarBarraCarrito() {
  const existente = $(".barra-carrito");
  const n = piezas();
  const enCarrito = router.rutaActual().startsWith("/carrito");

  if (!n || enCarrito || repo.sesion()?.role === "store") {
    existente?.remove();
    return;
  }
  if (existente) {
    pintarEn(existente, contenidoBarra(n));
    return;
  }
  const barra = document.createElement("a");
  barra.className = "barra-carrito";
  barra.href = "#/carrito";
  pintarEn(barra, contenidoBarra(n));
  document.body.appendChild(barra);
}

function contenidoBarra(n) {
  return html`
    <div>
      <strong>Ver carrito</strong>
      <small>${n} artículo${n === 1 ? "" : "s"} · ${dinero(totalCarrito())}</small>
    </div>
    <span class="boton boton--chico" style="background:var(--verde-500);color:#fff;pointer-events:none">
      ${dinero(totalCarrito())}
    </span>
  `;
}

// ---------- Reacciones ----------

alCambiarEstado(() => {
  pintarNav();
  pintarBarraCarrito();
});

repo.alCambiar((que) => {
  if (que === "sesion") {
    pintarCabecera();
    pintarNav();
  }
});

// ---------- Encendido ----------

async function arrancar() {
  try {
    await repo.iniciar({ config: CONFIG_SUPABASE, fabrica: window.supabase });
  } catch (error) {
    toast(`Arrancamos en modo demo: ${error.message}`, "error");
  }
  pintarCabecera();
  pintarCintaDemo();
  pintarPie();
  pintarNav();
  router.iniciar();
  pintarBarraCarrito();
}

arrancar();

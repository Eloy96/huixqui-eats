// Universidad PuebloPedidos: ejemplos visuales que se pueden practicar sin
// crear una cuenta ni guardar información.

import { html, pintarEn, delegar } from "./lib-dom.js";

const PASOS_REGISTRO = [
  {
    titulo: "Tu negocio",
    bajada: "Así sabrán quién eres y qué vendes.",
    campos: [
      ["Nombre del negocio", "Tacos Don Luis", "Obligatorio"],
      ["Categoría", "Tacos", ""],
      ["Descripción", "Tacos al pastor preparados al momento.", "Opcional"],
    ],
    consejo: "Usa un nombre fácil de reconocer y explica en una frase qué te hace diferente.",
  },
  {
    titulo: "WhatsApp y cuenta",
    bajada: "En este número recibirás los pedidos que envíen tus clientes.",
    campos: [
      ["Quién atiende", "Luis Hernández", "Obligatorio"],
      ["WhatsApp del negocio", "55 1234 5678", "Obligatorio"],
      ["Confirmación", "Este número tiene WhatsApp activo", "Obligatorio"],
      ["Correo", "luis@ejemplo.com", "Obligatorio"],
      ["Contraseña", "Mínimo 8 caracteres", "Obligatorio"],
    ],
    consejo: "En el registro real usa tus propios datos. El correo del ejemplo no es una cuenta real.",
  },
  {
    titulo: "Ubicación y entrega",
    bajada: "Indica dónde está tu negocio y cómo puede recibir el cliente.",
    campos: [
      ["Dirección", "Av. principal 24, Centro, Huixquilucan", "Obligatorio"],
      ["Cómo entregas", "Entrega a domicilio y recoger", ""],
      ["Punto en el mapa", "Ubicación confirmada", "Opcional"],
    ],
    consejo: "El GPS o un enlace de Google Maps ayuda a fijar el punto exacto y ordenar por cercanía.",
  },
  {
    titulo: "Tu horario",
    bajada: "Fuera de este horario tu tienda aparecerá como Cerrada.",
    campos: [
      ["Abre", "09:00", "Obligatorio"],
      ["Cierra", "20:00", "Obligatorio"],
      ["Días", "Lun, Mar, Mié, Jue, Vie y Sáb", "Obligatorio"],
    ],
    consejo: "Marca por lo menos un día. La hora de apertura y cierre no pueden ser iguales.",
  },
  {
    titulo: "Fotos y confirmación",
    bajada: "Las imágenes ayudan a que las personas reconozcan tu negocio.",
    campos: [
      ["Logo", "Cuadrado · recomendado 400 × 400 px", "Opcional"],
      ["Portada", "Horizontal · recomendado 1200 × 675 px", "Opcional"],
      ["Términos y privacidad", "Leídos y aceptados", "Obligatorio"],
    ],
    consejo: "Puedes registrarte sin fotos y agregarlas después desde Perfil. La página las ajusta sin deformarlas.",
  },
];

const PASOS_CLIENTE = [
  {
    titulo: "Busca un negocio",
    texto: "Elige Entrega o Recoger y revisa los negocios disponibles.",
    vista: "buscar",
  },
  {
    titulo: "Arma tu pedido",
    texto: "Agrega productos, cantidades, opciones y una nota si la necesitas.",
    vista: "pedido",
  },
  {
    titulo: "Envíalo por WhatsApp",
    texto: "PuebloPedidos prepara el mensaje; tú lo envías y el negocio confirma tiempo y pago.",
    vista: "whatsapp",
  },
];

export function vistaUniversidad(contenedor, params = {}) {
  const guiaNegocio = params.seccion !== "clientes";

  pintarEn(
    contenedor,
    html`
      <article class="universidad">
        ${portada(guiaNegocio)}
        ${guiaNegocio ? bloqueNegocio() : bloqueCliente()}
        ${ayudaCuenta()}
      </article>
    `,
  );

  if (guiaNegocio) activarGuiaNegocio(contenedor);
  else activarGuiaCliente(contenedor);
}

function portada(guiaNegocio) {
  return html`
    <header class="universidad-portada">
      <div class="universidad-portada-grid">
        <div class="universidad-portada-texto">
          <span class="universidad-etiqueta">Universidad PuebloPedidos</span>
          <h1>${guiaNegocio ? "Abre tu tienda y recibe pedidos" : "Pide a los negocios del pueblo"}</h1>
          <p>
            ${guiaNegocio
              ? "Practica el registro, mira cómo publicar un producto y conoce qué datos debes preparar."
              : "Aprende a encontrar un negocio, armar tu pedido y enviarlo por WhatsApp."}
          </p>
          ${guiaNegocio
            ? html`
                <ul class="universidad-ventajas" aria-label="Beneficios del plan">
                  <li>30 días sin costo</li>
                  <li>0% comisión</li>
                  <li>Sin renovación automática</li>
                </ul>
                <a class="boton boton--conversion" href="#/cuenta/negocio">Registrar mi negocio gratis</a>
              `
            : html`<a class="boton boton--principal" href="#/">Ver negocios disponibles</a>`}
        </div>
        <figure class="universidad-ilustracion">
          <img
            src="./${guiaNegocio ? "universidad-negocios.png" : "universidad-clientes.png"}"
            width="1448"
            height="1086"
            alt="${guiaNegocio
              ? "Comerciante preparando su catálogo y recibiendo pedidos desde el teléfono"
              : "Cliente descubriendo negocios locales desde su teléfono"}"
            decoding="async"
          />
          <figcaption>${guiaNegocio ? "Ejemplos sencillos, paso a paso." : "Comprar es gratis para el cliente."}</figcaption>
        </figure>
      </div>
      <nav class="universidad-selector" aria-label="Elegir guía">
        <a
          class="boton ${guiaNegocio ? "boton--conversion" : "boton--contorno"}"
          href="#/universidad/negocios"
          aria-current="${guiaNegocio ? "page" : "false"}"
        >Tengo un negocio</a>
        <a
          class="boton ${guiaNegocio ? "boton--contorno" : "boton--principal"}"
          href="#/universidad/clientes"
          aria-current="${guiaNegocio ? "false" : "page"}"
        >Quiero comprar</a>
      </nav>
    </header>
  `;
}

function bloqueNegocio() {
  return html`
    <section class="universidad-bloque" id="registro-guiado">
      <div class="universidad-bloque-cabeza">
        <span>Ejemplo interactivo</span>
        <h2>Practica el registro de tu tienda</h2>
        <p>
          Toca cada paso para conocer lo que necesitarás. Esta demostración no guarda ni publica información.
        </p>
      </div>

      <div class="universidad-demo">
        <div class="universidad-progreso-cabeza">
          <strong data-progreso-registro-texto>Paso 1 de 5</strong>
          <span>Registro de negocio</span>
        </div>
        <div class="universidad-progreso" role="progressbar" aria-label="Progreso del ejemplo" aria-valuemin="1" aria-valuemax="5" aria-valuenow="1" data-progreso-registro>
          <span style="width:20%"></span>
        </div>
        <div class="universidad-demo-tabs" role="tablist" aria-label="Pasos del registro">
          ${PASOS_REGISTRO.map(
            (paso, indice) => html`
              <button
                type="button"
                role="tab"
                data-paso-negocio="${indice}"
                aria-selected="${indice === 0}"
                aria-controls="panel-registro"
                tabindex="${indice === 0 ? "0" : "-1"}"
              >
                <span>${indice + 1}</span>
                ${paso.titulo}
              </button>
            `,
          )}
        </div>
        <div id="panel-registro" data-panel-registro tabindex="-1">
          ${panelRegistro(0)}
        </div>
      </div>
    </section>

    <section class="universidad-bloque" id="ejemplo-producto">
      <div class="universidad-bloque-cabeza">
        <span>Simulador de producto</span>
        <h2>Mira cómo quedaría en tu tienda</h2>
        <p>Edita el ejemplo y observa la tarjeta. No agrega nada al carrito ni modifica una tienda.</p>
      </div>
      <div class="universidad-simulador">
        <div class="universidad-simulador-campos" aria-label="Datos de ejemplo">
          <label>
            Nombre del negocio
            <input type="text" maxlength="40" value="Tacos Don Luis" data-simula-nombre />
          </label>
          <label>
            Categoría
            <select data-simula-categoria>
              <option>Tacos</option>
              <option>Comida</option>
              <option>Abarrotes</option>
              <option>Postres</option>
              <option>Servicios</option>
            </select>
          </label>
          <label>
            Primer producto
            <input type="text" maxlength="50" value="Orden de pastor" data-simula-producto />
          </label>
          <label>
            Precio en pesos
            <input type="number" min="0" max="99999" step="1" value="68" inputmode="decimal" data-simula-precio />
          </label>
          <button class="boton boton--contorno" type="button" data-restaurar-simulador>Restaurar ejemplo</button>
          <small>En el formulario real solo son obligatorios nombre, precio y descripción del producto.</small>
        </div>

        <div class="universidad-tienda-demo" aria-live="polite">
          <div class="universidad-tienda-demo-foto">
            <img src="./tacos.png" width="512" height="512" alt="Ejemplo de un producto de tacos" loading="lazy" />
            <span>● Abierto</span>
          </div>
          <div class="universidad-tienda-demo-info">
            <small>Así lo verá el cliente</small>
            <h3 data-demo-nombre>Tacos Don Luis</h3>
            <p><span data-demo-categoria>Tacos</span> · Entrega y recoger</p>
            <div class="universidad-producto-demo">
              <span data-demo-producto>Orden de pastor</span>
              <strong data-demo-precio>$68</strong>
            </div>
          </div>
        </div>
      </div>
      <p class="universidad-ruta"><strong>Ruta real:</strong> Mi panel → Productos → Nuevo.</p>
    </section>

    <section class="universidad-bloque universidad-preparar" id="lista-preparar">
      <div class="universidad-bloque-cabeza">
        <span>Antes de comenzar</span>
        <h2>¿Qué tienes preparado?</h2>
        <p>Marca tu avance. Esta lista vive solo en tu pantalla y se borra al salir.</p>
      </div>
      <div class="universidad-checklist-progreso">
        <strong data-checklist-texto>0 de 5 preparados</strong>
        <div class="universidad-progreso" role="progressbar" aria-label="Preparación para el registro" aria-valuemin="0" aria-valuemax="5" aria-valuenow="0" data-checklist-progreso>
          <span style="width:0%"></span>
        </div>
      </div>
      <div class="universidad-checklist">
        ${[
          "Nombre y una descripción breve",
          "Número con WhatsApp activo",
          "Dirección y forma de entrega",
          "Días y horario de atención",
          "Logo o portada (opcionales)",
        ].map(
          (texto) => html`
            <label><input type="checkbox" data-preparado /> <span>${texto}</span></label>
          `,
        )}
      </div>
      <div class="universidad-cierre">
        <div>
          <strong>Tu primer mes no tiene costo.</strong>
          <p>Después eliges un plan desde $99 MXN al mes, sin comisión por ventas.</p>
        </div>
        <a class="boton boton--conversion" href="#/cuenta/negocio">Abrir el registro real</a>
      </div>
      <p class="universidad-aviso">
        Si Supabase solicita confirmar tu correo, abre el enlace recibido e inicia sesión. Después entra a Mi panel
        y publica al menos un producto para que las personas puedan pedirte.
      </p>
    </section>
  `;
}

function panelRegistro(indice) {
  const paso = PASOS_REGISTRO[indice];
  return html`
    <article class="universidad-demo-panel" role="tabpanel" aria-label="Paso ${indice + 1}: ${paso.titulo}">
      <div class="universidad-demo-panel-cabeza">
        <span>Paso ${indice + 1}</span>
        <h3>${paso.titulo}</h3>
        <p>${paso.bajada}</p>
      </div>
      <div class="universidad-formulario-ejemplo">
        ${paso.campos.map(
          ([etiqueta, valor, estado]) => html`
            <div class="universidad-campo-ejemplo">
              <div><strong>${etiqueta}</strong>${estado ? html`<small>${estado}</small>` : ""}</div>
              <span>${valor}</span>
            </div>
          `,
        )}
      </div>
      <p class="universidad-consejo"><strong>Consejo:</strong> ${paso.consejo}</p>
      <div class="universidad-demo-controles">
        <button class="boton boton--contorno" type="button" data-paso-negocio="${indice - 1}" ${indice === 0 ? "disabled" : ""}>Anterior</button>
        ${indice < PASOS_REGISTRO.length - 1
          ? html`<button class="boton boton--principal" type="button" data-paso-negocio="${indice + 1}">Siguiente</button>`
          : html`<a class="boton boton--conversion" href="#/cuenta/negocio">Empezar mi registro</a>`}
      </div>
    </article>
  `;
}

function bloqueCliente() {
  return html`
    <section class="universidad-bloque" id="pedido-guiado">
      <div class="universidad-bloque-cabeza">
        <span>Demostración para clientes</span>
        <h2>Haz una prueba en tres pasos</h2>
        <p>Toca cada opción. No se crea un pedido real y no se abre WhatsApp.</p>
      </div>
      <div class="universidad-demo universidad-demo--cliente">
        <div class="universidad-demo-tabs universidad-demo-tabs--cliente" role="tablist" aria-label="Pasos para pedir">
          ${PASOS_CLIENTE.map(
            (paso, indice) => html`
              <button
                type="button"
                role="tab"
                data-paso-cliente="${indice}"
                aria-selected="${indice === 0}"
                aria-controls="panel-cliente"
                tabindex="${indice === 0 ? "0" : "-1"}"
              ><span>${indice + 1}</span>${paso.titulo}</button>
            `,
          )}
        </div>
        <div id="panel-cliente" data-panel-cliente tabindex="-1">${panelCliente(0)}</div>
      </div>
      <div class="universidad-cierre">
        <p>Crear una cuenta y pedir en PuebloPedidos es gratis para el cliente.</p>
        <a class="boton boton--principal" href="#/cuenta/cliente">Crear cuenta de cliente</a>
      </div>
    </section>
  `;
}

function panelCliente(indice) {
  const paso = PASOS_CLIENTE[indice];
  const ejemplo =
    paso.vista === "buscar"
      ? html`
          <div class="universidad-cliente-busqueda">⌕ Buscar tacos, pastel, plomero...</div>
          <div class="universidad-cliente-tarjeta"><img src="./tacos.png" width="80" height="80" alt="" /><div><strong>Tacos Don Luis</strong><span>Abierto · Entrega y recoger</span></div></div>
        `
      : paso.vista === "pedido"
        ? html`
            <div class="universidad-pedido-ejemplo">
              <strong>Orden de pastor <span>$68</span></strong>
              <p>Sin cebolla · Salsa verde · 1 pieza</p>
              <button type="button" disabled>Agregado al carrito ✓</button>
            </div>
          `
        : html`
            <div class="universidad-whatsapp-ejemplo">
              <span>WhatsApp</span>
              <p>Hola, quiero pedir 1 Orden de pastor. Total estimado: $68.</p>
              <small>El negocio confirma disponibilidad, tiempo y forma de pago.</small>
            </div>
          `;

  return html`
    <article class="universidad-demo-panel universidad-demo-panel--cliente" role="tabpanel" aria-label="Paso ${indice + 1}: ${paso.titulo}">
      <div class="universidad-demo-panel-cabeza">
        <span>Paso ${indice + 1} de 3</span>
        <h3>${paso.titulo}</h3>
        <p>${paso.texto}</p>
      </div>
      <div class="universidad-cliente-ejemplo">${ejemplo}</div>
      <div class="universidad-demo-controles">
        <button class="boton boton--contorno" type="button" data-paso-cliente="${indice - 1}" ${indice === 0 ? "disabled" : ""}>Anterior</button>
        ${indice < PASOS_CLIENTE.length - 1
          ? html`<button class="boton boton--principal" type="button" data-paso-cliente="${indice + 1}">Siguiente</button>`
          : html`<a class="boton boton--principal" href="#/">Ver negocios</a>`}
      </div>
    </article>
  `;
}

function ayudaCuenta() {
  return html`
    <details class="universidad-ayuda">
      <summary>¿Olvidaste tu contraseña? <span>Ver ayuda</span></summary>
      <div>
        <p>
          Escribe tu correo en Iniciar sesión y toca “Olvidé mi contraseña”. Recibirás un enlace para crear una
          nueva. Si no llega, revisa correo no deseado o solicita otro enlace.
        </p>
        <a class="boton boton--contorno" href="#/cuenta/entrar">Ir a iniciar sesión</a>
      </div>
    </details>
  `;
}

function activarGuiaNegocio(contenedor) {
  const cambiarPaso = (valor, enfocar = false) => {
    const indice = Math.max(0, Math.min(PASOS_REGISTRO.length - 1, Number(valor) || 0));
    contenedor.querySelectorAll('[role="tab"][data-paso-negocio]').forEach((boton) => {
      const activo = Number(boton.dataset.pasoNegocio) === indice;
      boton.setAttribute("aria-selected", String(activo));
      boton.tabIndex = activo ? 0 : -1;
    });
    const texto = contenedor.querySelector("[data-progreso-registro-texto]");
    const progreso = contenedor.querySelector("[data-progreso-registro]");
    if (texto) texto.textContent = `Paso ${indice + 1} de ${PASOS_REGISTRO.length}`;
    if (progreso) {
      progreso.setAttribute("aria-valuenow", String(indice + 1));
      progreso.querySelector("span").style.width = `${((indice + 1) / PASOS_REGISTRO.length) * 100}%`;
    }
    const panel = contenedor.querySelector("[data-panel-registro]");
    pintarEn(panel, panelRegistro(indice));
    if (enfocar) panel?.focus({ preventScroll: true });
  };

  delegar(contenedor, "click", "[data-paso-negocio]", (_ev, boton) => {
    if (!boton.disabled) cambiarPaso(boton.dataset.pasoNegocio, boton.getAttribute("role") !== "tab");
  });

  delegar(contenedor, "keydown", '[role="tab"][data-paso-negocio]', (ev, boton) => {
    if (!["ArrowLeft", "ArrowRight"].includes(ev.key)) return;
    ev.preventDefault();
    const direccion = ev.key === "ArrowRight" ? 1 : -1;
    const siguiente = (Number(boton.dataset.pasoNegocio) + direccion + PASOS_REGISTRO.length) % PASOS_REGISTRO.length;
    cambiarPaso(siguiente);
    contenedor.querySelector(`[role="tab"][data-paso-negocio="${siguiente}"]`)?.focus();
  });

  const actualizarSimulador = () => {
    const nombre = contenedor.querySelector("[data-simula-nombre]")?.value.trim() || "Mi negocio";
    const categoria = contenedor.querySelector("[data-simula-categoria]")?.value || "Otros";
    const producto = contenedor.querySelector("[data-simula-producto]")?.value.trim() || "Mi producto";
    const numero = Math.max(0, Number(contenedor.querySelector("[data-simula-precio]")?.value) || 0);
    contenedor.querySelector("[data-demo-nombre]").textContent = nombre;
    contenedor.querySelector("[data-demo-categoria]").textContent = categoria;
    contenedor.querySelector("[data-demo-producto]").textContent = producto;
    contenedor.querySelector("[data-demo-precio]").textContent = new Intl.NumberFormat("es-MX", {
      style: "currency",
      currency: "MXN",
      maximumFractionDigits: 2,
    }).format(numero);
  };

  delegar(contenedor, "input", "[data-simula-nombre], [data-simula-producto], [data-simula-precio]", actualizarSimulador);
  delegar(contenedor, "change", "[data-simula-categoria]", actualizarSimulador);
  delegar(contenedor, "click", "[data-restaurar-simulador]", () => {
    contenedor.querySelector("[data-simula-nombre]").value = "Tacos Don Luis";
    contenedor.querySelector("[data-simula-categoria]").value = "Tacos";
    contenedor.querySelector("[data-simula-producto]").value = "Orden de pastor";
    contenedor.querySelector("[data-simula-precio]").value = "68";
    actualizarSimulador();
  });

  delegar(contenedor, "change", "[data-preparado]", () => {
    const total = contenedor.querySelectorAll("[data-preparado]").length;
    const listos = contenedor.querySelectorAll("[data-preparado]:checked").length;
    const texto = contenedor.querySelector("[data-checklist-texto]");
    const progreso = contenedor.querySelector("[data-checklist-progreso]");
    if (texto) texto.textContent = listos === total ? "¡Todo listo para registrarte!" : `${listos} de ${total} preparados`;
    if (progreso) {
      progreso.setAttribute("aria-valuenow", String(listos));
      progreso.querySelector("span").style.width = `${(listos / total) * 100}%`;
    }
  });
}

function activarGuiaCliente(contenedor) {
  const cambiarPaso = (valor, enfocar = false) => {
    const indice = Math.max(0, Math.min(PASOS_CLIENTE.length - 1, Number(valor) || 0));
    contenedor.querySelectorAll('[role="tab"][data-paso-cliente]').forEach((boton) => {
      const activo = Number(boton.dataset.pasoCliente) === indice;
      boton.setAttribute("aria-selected", String(activo));
      boton.tabIndex = activo ? 0 : -1;
    });
    const panel = contenedor.querySelector("[data-panel-cliente]");
    pintarEn(panel, panelCliente(indice));
    if (enfocar) panel?.focus({ preventScroll: true });
  };

  delegar(contenedor, "click", "[data-paso-cliente]", (_ev, boton) => {
    if (!boton.disabled) cambiarPaso(boton.dataset.pasoCliente, boton.getAttribute("role") !== "tab");
  });

  delegar(contenedor, "keydown", '[role="tab"][data-paso-cliente]', (ev, boton) => {
    if (!["ArrowLeft", "ArrowRight"].includes(ev.key)) return;
    ev.preventDefault();
    const direccion = ev.key === "ArrowRight" ? 1 : -1;
    const siguiente = (Number(boton.dataset.pasoCliente) + direccion + PASOS_CLIENTE.length) % PASOS_CLIENTE.length;
    cambiarPaso(siguiente);
    contenedor.querySelector(`[role="tab"][data-paso-cliente="${siguiente}"]`)?.focus();
  });
}

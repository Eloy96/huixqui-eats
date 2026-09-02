// Guía pública y breve para aprender a comprar y vender en PuebloPedidos.

import { html, pintarEn } from "./lib-dom.js";

const PASOS_CLIENTE = [
  ["Crea tu cuenta", "Guarda tu nombre, dirección y un número activo de WhatsApp para enviar tus pedidos."],
  ["Elige cómo quieres recibir", "Selecciona Entrega o Recoger y busca un negocio disponible."],
  ["Arma tu pedido", "Agrega productos, cantidades, opciones y una nota si la necesitas."],
  ["Confirma por WhatsApp", "La página prepara el mensaje; tú lo envías y el negocio confirma tiempo y pago."],
];

const PASOS_NEGOCIO = [
  ["Registra tu negocio", "Completa nombre, ubicación, horario, fotos y el WhatsApp donde recibirás pedidos."],
  ["Publica tu primer producto", "Entra a Mi panel → Productos → Publicar producto."],
  ["Completa la información", "Agrega nombre, precio, foto, disponibilidad, extras y opciones cuando correspondan."],
  ["Revisa tu tienda", "Usa “Ver mi tienda” para comprobar cómo la verá el cliente."],
  ["Comparte y recibe pedidos", "Copia tu enlace y compártelo; los pedidos llegan directamente a tu WhatsApp."],
];

function pasos(lista) {
  return html`<ol class="universidad-pasos">
    ${lista.map(
      ([titulo, texto], indice) => html`
        <li>
          <span class="universidad-numero">${indice + 1}</span>
          <div>
            <strong>${titulo}</strong>
            <p>${texto}</p>
          </div>
        </li>
      `,
    )}
  </ol>`;
}

export function vistaUniversidad(contenedor, params = {}) {
  const primeroNegocio = params.seccion === "negocios";
  const bloques = primeroNegocio
    ? [bloqueNegocio(), bloqueCliente()]
    : [bloqueCliente(), bloqueNegocio()];

  pintarEn(
    contenedor,
    html`
      <article class="universidad">
        <header class="universidad-portada">
          <span class="universidad-etiqueta">Guía rápida · 3 minutos</span>
          <h1>Universidad PuebloPedidos</h1>
          <p>
            Aprende lo necesario para pedir o publicar tu negocio. Sin palabras técnicas y sin cursos largos.
          </p>
          <nav class="universidad-selector" aria-label="Elegir guía">
            <a class="boton ${primeroNegocio ? "boton--contorno" : "boton--principal"}" href="#/universidad/clientes" aria-current="${primeroNegocio ? "false" : "page"}">Quiero comprar</a>
            <a class="boton ${primeroNegocio ? "boton--conversion" : "boton--contorno"}" href="#/universidad/negocios" aria-current="${primeroNegocio ? "page" : "false"}">Quiero vender</a>
          </nav>
        </header>

        ${bloques}

        <section class="universidad-bloque" id="cuenta-segura">
          <div class="universidad-bloque-cabeza">
            <span>Cuenta</span>
            <h2>Contraseña y acceso</h2>
            <p>
              Si olvidas tu contraseña, escribe tu correo en Iniciar sesión y toca “Olvidé mi contraseña”.
              Recibirás un enlace para crear una nueva. La contraseña se guarda únicamente en Supabase.
            </p>
          </div>
          <div class="universidad-aviso">
            Revisa también la carpeta de correo no deseado. Si el enlace vence, solicita uno nuevo.
          </div>
          <a class="boton boton--contorno" href="#/cuenta/entrar">Ir a iniciar sesión</a>
        </section>
      </article>
    `,
  );
}

function bloqueCliente() {
  return html`
    <section class="universidad-bloque" id="clientes">
      <div class="universidad-bloque-cabeza">
        <span>Para clientes</span>
        <h2>Cómo hacer un pedido</h2>
        <p>La cuenta es gratuita. PuebloPedidos organiza tu pedido y lo entrega al negocio por WhatsApp.</p>
      </div>
      ${pasos(PASOS_CLIENTE)}
      <a class="boton boton--principal" href="#/cuenta/cliente">Crear cuenta de cliente</a>
    </section>
  `;
}

function bloqueNegocio() {
  return html`
    <section class="universidad-bloque" id="negocios">
      <div class="universidad-bloque-cabeza">
        <span>Para negocios</span>
        <h2>Cómo publicar y vender</h2>
        <p>
          Tu catálogo, perfil, horarios y promociones se administran desde Mi panel. Los pedidos llegan a tu
          WhatsApp.
        </p>
      </div>
      ${pasos(PASOS_NEGOCIO)}
      <div class="universidad-modulos">
        <div><strong>Productos</strong><span>Alta, precio, fotos, extras y disponibilidad.</span></div>
        <div><strong>Perfil</strong><span>Horario, dirección, logo, portada y forma de entrega.</span></div>
        <div><strong>Contactos</strong><span>Pedidos y personas que solicitaron información.</span></div>
        <div><strong>Plan y promoción</strong><span>Suscripción y espacios destacados.</span></div>
      </div>
      <p class="universidad-nota">
        Tienes 30 días sin costo y sin renovación automática. Después eliges un plan desde $99 MXN al mes:
        publica hasta 300 productos, recibe contactos sin límite y paga 0% de comisión por venta. Los pagos de
        suscripción o promoción hechos con Clip se activan automáticamente cuando Clip los confirma.
      </p>
      <div class="universidad-aviso">
        Necesitas un número activo de WhatsApp. El negocio cobra y acuerda la entrega directamente con el cliente;
        PuebloPedidos funciona como intermediario, no realiza la entrega ni cobra el pedido.
      </div>
      <a class="boton boton--conversion" href="#/cuenta/negocio">Registrar mi negocio gratis</a>
    </section>
  `;
}

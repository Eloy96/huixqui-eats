// Las dos páginas legales. Una sola vista para ambas: son el mismo formato.

import { html, pintarEn } from "./lib-dom.js";
import { icono } from "./lib-ui.js";
import { AVISO_PRIVACIDAD, TERMINOS, VERSION_LEGAL, faltanDatos } from "./legal-textos.js";

const DOCS = {
  privacidad: {
    titulo: "Aviso de Privacidad",
    entrada: "Cómo tratamos tus datos personales y qué derechos tienes sobre ellos.",
    secciones: AVISO_PRIVACIDAD,
    otro: { ruta: "#/terminos", texto: "Ver los Términos y Condiciones" },
  },
  terminos: {
    titulo: "Términos y Condiciones",
    entrada: "Las reglas de uso de PuebloPedidos, para clientes y para negocios.",
    secciones: TERMINOS,
    otro: { ruta: "#/privacidad", texto: "Ver el Aviso de Privacidad" },
  },
};

export function vistaPrivacidad(contenedor) {
  pintarDoc(contenedor, DOCS.privacidad);
}

export function vistaTerminos(contenedor) {
  pintarDoc(contenedor, DOCS.terminos);
}

function pintarDoc(contenedor, doc) {
  const faltan = faltanDatos();

  pintarEn(
    contenedor,
    html`
      <article class="documento">
        <a class="boton boton--texto" href="#/">${icono.atras()} Volver</a>

        <h1 style="margin-top:var(--e-3)">${doc.titulo}</h1>
        <p class="documento-entrada">${doc.entrada}</p>
        <p class="documento-version">Versión vigente: ${VERSION_LEGAL}</p>

        ${faltan.length
          ? html`
              <div class="documento-pendiente">
                <strong>Este documento aún no está listo para publicarse.</strong>
                <p>
                  Faltan por definir: ${faltan.join(", ")}. Se llenan en el archivo
                  <code>legal-textos.js</code>. Mientras tanto aparecen como
                  <em>[FALTA LLENAR]</em> en el texto.
                </p>
              </div>
            `
          : ""}

        ${doc.secciones.map(
          (seccion, i) => html`
            <section class="documento-seccion">
              <h2>${i + 1}. ${seccion.titulo}</h2>
              ${(seccion.parrafos || []).map((p) => html`<p>${p}</p>`)}
              ${seccion.lista
                ? html`<ul class="documento-lista">
                    ${seccion.lista.map((li) => html`<li>${li}</li>`)}
                  </ul>`
                : ""}
            </section>
          `,
        )}

        <footer class="documento-pie">
          <a class="boton boton--contorno" href="${doc.otro.ruta}">${doc.otro.texto}</a>
          <a class="boton boton--principal" href="#/">Volver al inicio</a>
        </footer>
      </article>
    `,
  );
}

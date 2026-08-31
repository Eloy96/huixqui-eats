// ============================================================
// Plantillas seguras.
//
// El problema del código anterior: `innerHTML = `<h3>${p.title}</h3>``.
// Si una tienda se registra como  <img src=x onerror=alert(1)>  ese
// código corre en el navegador de TODOS los clientes.
//
// Aquí `html` escapa CADA interpolación por defecto. Para insertar
// marcado ya construido se usa `raw(...)` de forma explícita, así el
// escape deja de ser algo que se te puede olvidar.
// ============================================================

const MAPA = {
  "&": "&amp;",
  "<": "&lt;",
  ">": "&gt;",
  '"': "&quot;",
  "'": "&#39;",
};

export function esc(valor) {
  if (valor === null || valor === undefined) return "";
  return String(valor).replace(/[&<>"']/g, (c) => MAPA[c]);
}

class Crudo {
  constructor(valor) {
    this.valor = valor;
  }
  toString() {
    return this.valor;
  }
}

/** Marca un texto como HTML ya seguro. Úsalo solo con marcado propio. */
export function raw(valor) {
  return new Crudo(String(valor));
}

function pintar(valor) {
  if (valor === null || valor === undefined || valor === false) return "";
  if (valor instanceof Crudo) return valor.valor;
  if (Array.isArray(valor)) return valor.map(pintar).join("");
  return esc(valor);
}

/** html`<h3>${titulo}</h3>` → siempre escapado. */
export function html(partes, ...valores) {
  let salida = partes[0];
  for (let i = 0; i < valores.length; i += 1) {
    salida += pintar(valores[i]) + partes[i + 1];
  }
  return new Crudo(salida);
}

// Los contenedores principales de la SPA se reutilizan al navegar. Sin un
// registro, cada visita deja listeners delegados vivos y un solo clic termina
// ejecutando la misma petición varias veces.
const DELEGADOS = new WeakMap();

function limpiarDelegados(raiz) {
  const registros = DELEGADOS.get(raiz);
  if (!registros) return;
  registros.forEach(({ evento, listener }) => raiz.removeEventListener(evento, listener));
  DELEGADOS.delete(raiz);
}

/**
 * URLs seguras: bloquea javascript:, data: y vbscript: en href/src.
 * Deja pasar rutas relativas, http(s), blob: y las data:image que
 * genera FileReader para las previas de foto.
 */
export function urlSegura(valor) {
  const texto = String(valor || "").trim();
  if (!texto) return "";
  if (/^data:image\//i.test(texto)) return texto;
  if (/^(https?:|blob:|mailto:|tel:|#|\/|\.)/i.test(texto)) return texto;
  return "";
}

/** Escribe HTML en un nodo. Único punto del proyecto que toca innerHTML. */
export function pintarEn(nodo, contenido) {
  if (!nodo) return;
  // Si se reemplaza todo el contenido de una vista, sus controles anteriores
  // ya no existen y sus listeners tampoco deben sobrevivir.
  limpiarDelegados(nodo);
  nodo.innerHTML = pintar(contenido);
}

export const $ = (sel, raiz = document) => raiz.querySelector(sel);
export const $$ = (sel, raiz = document) => Array.from(raiz.querySelectorAll(sel));

/** Delegación de eventos: un listener por vista, no uno por tarjeta. */
export function delegar(raiz, evento, selector, manejador) {
  const clave = `${evento}\u0000${selector}`;
  const registros = DELEGADOS.get(raiz) || new Map();
  const anterior = registros.get(clave);
  if (anterior) raiz.removeEventListener(anterior.evento, anterior.listener);

  const listener = (ev) => {
    const objetivo = ev.target.closest(selector);
    if (objetivo && raiz.contains(objetivo)) manejador(ev, objetivo);
  };
  raiz.addEventListener(evento, listener);
  registros.set(clave, { evento, listener });
  DELEGADOS.set(raiz, registros);
}

/** Lee un input file y devuelve { dataUrl, file } para previa + subida. */
export function leerImagen(file) {
  return new Promise((resolver, rechazar) => {
    if (!file) {
      resolver({ dataUrl: "", file: null });
      return;
    }
    if (!file.type.startsWith("image/")) {
      rechazar(new Error("El archivo debe ser una imagen."));
      return;
    }
    if (file.size > 5 * 1024 * 1024) {
      rechazar(new Error("La imagen pesa más de 5 MB. Usa una más ligera."));
      return;
    }
    const lector = new FileReader();
    lector.onload = () => resolver({ dataUrl: lector.result, file });
    lector.onerror = () => rechazar(new Error("No se pudo leer la imagen."));
    lector.readAsDataURL(file);
  });
}

export function copiar(texto) {
  if (navigator.clipboard?.writeText) return navigator.clipboard.writeText(texto);
  return new Promise((resolver, rechazar) => {
    const campo = document.createElement("textarea");
    campo.value = texto;
    campo.setAttribute("readonly", "");
    campo.style.position = "fixed";
    campo.style.opacity = "0";
    document.body.appendChild(campo);
    campo.select();
    try {
      document.execCommand("copy");
      resolver();
    } catch (error) {
      rechazar(error);
    } finally {
      campo.remove();
    }
  });
}

/**
 * Red de seguridad para imágenes que no cargan.
 *
 * Si una foto falla (se borró del storage, se subió mal, la red se cayó),
 * el navegador deja el icono de imagen rota Y CONSERVA EL ESPACIO que
 * reserva aspect-ratio: un hueco enorme en medio de la pantalla. Peor aún,
 * el usuario no sabe si es su internet o el producto.
 *
 * Con esto, cualquier <img data-respaldo="..."> que falle cambia sola a su
 * imagen de respaldo. Un solo listener cubre toda la app, incluidas las
 * imágenes que se pinten después.
 *
 * Va en captura porque el evento `error` de <img> NO burbujea.
 */
export function activarRespaldoDeImagenes() {
  document.addEventListener(
    "error",
    (ev) => {
      const img = ev.target;
      if (!(img instanceof HTMLImageElement)) return;
      const respaldo = img.dataset.respaldo;
      // El marcador evita un bucle si el respaldo también falla.
      if (!respaldo || img.dataset.respaldoUsado === "si") {
        img.dataset.respaldoUsado = "si";
        img.classList.add("img-sin-foto");
        return;
      }
      img.dataset.respaldoUsado = "si";
      img.src = respaldo;
    },
    true,
  );
}

// ============================================================
// Plantillas seguras.
//
// El problema del código anterior: `innerHTML = \`<h3>${p.title}</h3>\``.
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
  nodo.innerHTML = pintar(contenido);
}

export const $ = (sel, raiz = document) => raiz.querySelector(sel);
export const $$ = (sel, raiz = document) => Array.from(raiz.querySelectorAll(sel));

/** Delegación de eventos: un listener por vista, no uno por tarjeta. */
export function delegar(raiz, evento, selector, manejador) {
  raiz.addEventListener(evento, (ev) => {
    const objetivo = ev.target.closest(selector);
    if (objetivo && raiz.contains(objetivo)) manejador(ev, objetivo);
  });
}

/**
 * Lee un input file y devuelve { dataUrl, file, ancho, alto, aviso }.
 *
 * Además de leerla, la MIDE. Decirle al negocio "sube 1200×675" no basta:
 * la mitad va a subir la foto como le salga. Medirla y avisar cuando se va
 * a ver mal es la diferencia entre un catálogo decente y uno borroso.
 */
export function leerImagen(file, requisitos = null) {
  return new Promise((resolver, rechazar) => {
    if (!file) {
      resolver({ dataUrl: "", file: null });
      return;
    }
    if (!file.type.startsWith("image/")) {
      rechazar(new Error("El archivo debe ser una imagen (JPG, PNG o WEBP)."));
      return;
    }
    if (file.size > 5 * 1024 * 1024) {
      const mb = (file.size / 1048576).toFixed(1);
      rechazar(new Error(`La imagen pesa ${mb} MB y el máximo son 5 MB. Usa una más ligera.`));
      return;
    }
    const lector = new FileReader();
    lector.onerror = () => rechazar(new Error("No se pudo leer la imagen."));
    lector.onload = () => {
      const dataUrl = lector.result;
      const img = new Image();
      img.onload = () => {
        resolver({
          dataUrl,
          file,
          ancho: img.naturalWidth,
          alto: img.naturalHeight,
          aviso: revisarMedidas(img.naturalWidth, img.naturalHeight, requisitos),
        });
      };
      // Si no se puede medir (formato raro), no bloqueamos: se sube igual.
      img.onerror = () => resolver({ dataUrl, file, ancho: 0, alto: 0, aviso: "" });
      img.src = dataUrl;
    };
    lector.readAsDataURL(file);
  });
}

/** Devuelve un aviso en español, o "" si la imagen está bien. */
function revisarMedidas(ancho, alto, req) {
  if (!req || !ancho || !alto) return "";
  if (ancho < req.minAncho || alto < req.minAlto) {
    return `Se va a ver borrosa: tu imagen mide ${ancho}×${alto} y lo mínimo son ${req.minAncho}×${req.minAlto} px.`;
  }
  const proporcion = ancho / alto;
  const objetivo = req.proporcion;
  // 25% de tolerancia: más que eso y el recorte se come algo importante.
  if (objetivo && Math.abs(proporcion - objetivo) / objetivo > 0.25) {
    return req.avisoProporcion;
  }
  return "";
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

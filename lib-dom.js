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

const TIPOS_IMAGEN = new Set(["image/jpeg", "image/png", "image/webp"]);
const MAX_IMAGEN_ENTRADA = 12 * 1024 * 1024;
const MAX_LADO_IMAGEN = 12000;
const MAX_PIXELES_IMAGEN = 50_000_000;

/**
 * Ajusta una foto antes de subirla.
 *
 * - portada y producto: recorte centrado, sin deformar;
 * - logo: se centra completo dentro del cuadro, sin cortar;
 * - todas: tamaño final predecible y WEBP liviano para datos móviles.
 *
 * `medidas` viene de MEDIDAS_IMAGEN. Si se omite se conserva la lectura
 * simple por compatibilidad con llamadas antiguas.
 */
export async function leerImagen(file, medidas = null) {
  if (!file) return { dataUrl: "", file: null };
  if (!TIPOS_IMAGEN.has(String(file.type || "").toLowerCase())) {
    throw new Error("Usa una imagen JPG, PNG o WEBP.");
  }
  if (file.size > MAX_IMAGEN_ENTRADA) {
    throw new Error("La imagen pesa más de 12 MB. Elige una más ligera.");
  }

  const recurso = await decodificarImagen(file);
  const anchoOriginal = Number(recurso.width || recurso.naturalWidth || 0);
  const altoOriginal = Number(recurso.height || recurso.naturalHeight || 0);
  if (!anchoOriginal || !altoOriginal) {
    recurso.close?.();
    throw new Error("No pudimos leer las dimensiones de la imagen.");
  }
  if (
    anchoOriginal > MAX_LADO_IMAGEN ||
    altoOriginal > MAX_LADO_IMAGEN ||
    anchoOriginal * altoOriginal > MAX_PIXELES_IMAGEN
  ) {
    recurso.close?.();
    throw new Error("La imagen es demasiado grande. Usa una de menos de 12,000 px por lado.");
  }

  if (!medidas?.idealAncho || !medidas?.idealAlto) {
    recurso.close?.();
    return {
      dataUrl: await archivoADataUrl(file),
      file,
      ancho: anchoOriginal,
      alto: altoOriginal,
      aviso: "",
    };
  }

  const anchoFinal = Math.round(medidas.idealAncho);
  const altoFinal = Math.round(medidas.idealAlto);
  const lienzo = document.createElement("canvas");
  lienzo.width = anchoFinal;
  lienzo.height = altoFinal;
  const contexto = lienzo.getContext("2d", { alpha: true });
  if (!contexto) {
    recurso.close?.();
    throw new Error("Este navegador no pudo preparar la imagen.");
  }

  const ajuste = medidas.ajuste === "contain" ? "contain" : "cover";
  const escala = ajuste === "contain"
    ? Math.min(anchoFinal / anchoOriginal, altoFinal / altoOriginal)
    : Math.max(anchoFinal / anchoOriginal, altoFinal / altoOriginal);
  const anchoDibujo = anchoOriginal * escala;
  const altoDibujo = altoOriginal * escala;
  contexto.imageSmoothingEnabled = true;
  contexto.imageSmoothingQuality = "high";
  contexto.drawImage(
    recurso,
    (anchoFinal - anchoDibujo) / 2,
    (altoFinal - altoDibujo) / 2,
    anchoDibujo,
    altoDibujo,
  );
  recurso.close?.();

  const blob = await lienzoABlob(lienzo, "image/webp", 0.86);
  const extension = blob.type === "image/png" ? "png" : blob.type === "image/jpeg" ? "jpg" : "webp";
  const nombreBase = String(file.name || "imagen").replace(/\.[^.]+$/, "").replace(/[^a-z0-9_-]+/gi, "-") || "imagen";
  const optimizada = new File([blob], `${nombreBase}.${extension}`, {
    type: blob.type || "image/webp",
    lastModified: Date.now(),
  });
  const proporcionOriginal = anchoOriginal / altoOriginal;
  const proporcionFinal = anchoFinal / altoFinal;
  const seAjusto = Math.abs(proporcionOriginal - proporcionFinal) / proporcionFinal > 0.04;
  const pequena = anchoOriginal < Number(medidas.minAncho || 0) || altoOriginal < Number(medidas.minAlto || 0);
  const avisos = [];
  if (seAjusto) {
    avisos.push(ajuste === "contain"
      ? "La centramos completa sin recortarla."
      : "La recortamos al centro para que encaje sin deformarse.");
  }
  if (pequena) avisos.push("La imagen original es pequeña y puede perder nitidez.");

  return {
    dataUrl: await archivoADataUrl(optimizada),
    file: optimizada,
    ancho: anchoFinal,
    alto: altoFinal,
    aviso: avisos.join(" "),
  };
}

async function decodificarImagen(file) {
  if (typeof createImageBitmap === "function") {
    try {
      return await createImageBitmap(file, { imageOrientation: "from-image" });
    } catch {
      try {
        return await createImageBitmap(file);
      } catch {
        // Continúa con el decodificador compatible de <img>.
      }
    }
  }
  return new Promise((resolver, rechazar) => {
    const imagen = new Image();
    const url = URL.createObjectURL(file);
    imagen.onload = () => {
      URL.revokeObjectURL(url);
      resolver(imagen);
    };
    imagen.onerror = () => {
      URL.revokeObjectURL(url);
      rechazar(new Error("No pudimos abrir la imagen. Usa JPG, PNG o WEBP."));
    };
    imagen.src = url;
  });
}

function lienzoABlob(lienzo, tipo, calidad) {
  return new Promise((resolver, rechazar) => {
    lienzo.toBlob((blob) => {
      if (blob) resolver(blob);
      else rechazar(new Error("No pudimos optimizar la imagen."));
    }, tipo, calidad);
  });
}

function archivoADataUrl(file) {
  return new Promise((resolver, rechazar) => {
    const lector = new FileReader();
    lector.onload = () => resolver(lector.result);
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

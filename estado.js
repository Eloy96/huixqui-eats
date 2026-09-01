// Estado de interfaz (no de datos): carrito, filtros, modo de pedido.
// Los datos viven en repo.js; aquí solo lo que el usuario está haciendo
// en este momento.

const LLAVE = "pueblopedidos-ui-v1";
const VIGENCIA_COLA_WHATSAPP = 48 * 60 * 60 * 1000;

const oyentes = new Set();

const inicial = {
  modoPedido: "Entrega", // Entrega | Recoger
  categoria: "Todos",
  busqueda: "",
  carrito: [], // [{lineaId, productoId, storeId, qty, nota, precio, titulo, imagen}]
  ubicacion: null, // {lat, lng}
  etiquetaUbicacion: "", // lo que se ve en el header: "Centro", "Cerca de ti"
  ordenCercania: true, // el home ordena por distancia cuando hay ubicación
  envios: [], // cola de WhatsApp tras confirmar
};

export const estado = { ...inicial, ...cargar() };

function cargar() {
  try {
    const guardado = JSON.parse(localStorage.getItem(LLAVE) || "null");
    if (!guardado) return {};
    // La cola sobrevive cierres y recargas, pero solo por 48 horas para no
    // conservar indefinidamente mensajes que incluyen dirección y teléfono.
    const ahora = Date.now();
    const envios = Array.isArray(guardado.envios)
      ? guardado.envios
          .filter((envio) => ahora - Number(envio.creadoEn || ahora) < VIGENCIA_COLA_WHATSAPP)
          .slice(0, 12)
      : [];
    return { ...guardado, envios };
  } catch {
    return {};
  }
}

function guardar() {
  try {
    localStorage.setItem(
      LLAVE,
      JSON.stringify({
        modoPedido: estado.modoPedido,
        carrito: estado.carrito,
        ubicacion: estado.ubicacion,
        etiquetaUbicacion: estado.etiquetaUbicacion,
        ordenCercania: estado.ordenCercania,
        envios: Array.isArray(estado.envios) ? estado.envios.slice(0, 12) : [],
      }),
    );
  } catch (error) {
    console.warn("No se pudo guardar el estado de la interfaz.", error);
  }
}

export function alCambiar(fn) {
  oyentes.add(fn);
  return () => oyentes.delete(fn);
}

export function fijar(parche) {
  Object.assign(estado, parche);
  guardar();
  oyentes.forEach((fn) => fn(estado));
}

export function codigoModoPedido(modoPedido = estado.modoPedido) {
  return modoPedido === "Recoger" ? "pickup" : "delivery";
}

export function disponibleEnModo(valor, modoPedido = estado.modoPedido) {
  const modo = codigoModoPedido(modoPedido);
  return valor === "both" || valor === modo;
}

export function productoCompatibleConModo(
  producto,
  tienda = producto?.tienda,
  modoPedido = estado.modoPedido,
) {
  return Boolean(
    producto &&
      tienda &&
      disponibleEnModo(producto.availability, modoPedido) &&
      disponibleEnModo(tienda.serviceModes, modoPedido),
  );
}

// ---------- Carrito ----------

export function agregarAlCarrito({
  producto,
  tienda = producto?.tienda,
  cantidad = 1,
  nota = "",
  precio,
  sinQue = [],
  extras = [],
  selectedOptions = [],
}) {
  if (!productoCompatibleConModo(producto, tienda)) return false;
  // Mismo producto + misma nota + misma configuración = suma cantidad.
  // Cualquier diferencia es línea nueva, porque "sin cebolla" y "con
  // todo" son dos platos distintos en la cocina.
  const firmaOpciones = selectedOptions
    .map((o) => `${o.groupId || o.group_id || ""}:${o.optionId || o.option_id || o.name || ""}`)
    .sort()
    .join(",");
  const firma = `${nota.trim()}|${[...sinQue].sort().join(",")}|${extras
    .map((e) => e.nombre)
    .sort()
    .join(",")}|${firmaOpciones}`;
  const igual = estado.carrito.find(
    (l) => l.productoId === producto.id && l.firma === firma,
  );
  if (igual) {
    igual.qty += cantidad;
  } else {
    estado.carrito.push({
      lineaId: `l-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
      productoId: producto.id,
      storeId: producto.storeId,
      titulo: producto.title,
      imagen: producto.image,
      disponibilidad: producto.availability,
      modosTienda: tienda?.serviceModes || producto.tienda?.serviceModes || "both",
      precio,
      qty: cantidad,
      nota: nota.trim(),
      sinQue: [...sinQue],
      extras: extras.map((e) => ({ ...e })),
      selectedOptions: selectedOptions.map((o) => ({ ...o })),
      firma,
    });
  }
  fijar({ carrito: estado.carrito });
  return true;
}

export function cambiarCantidad(lineaId, delta) {
  const linea = estado.carrito.find((l) => l.lineaId === lineaId);
  if (!linea) return;
  linea.qty += delta;
  const carrito = estado.carrito.filter((l) => l.qty > 0);
  fijar({ carrito });
}

export function quitarLinea(lineaId) {
  fijar({ carrito: estado.carrito.filter((l) => l.lineaId !== lineaId) });
}

export function vaciarCarrito() {
  fijar({ carrito: [] });
}

export function piezas() {
  return estado.carrito.reduce((s, l) => s + l.qty, 0);
}

export function totalCarrito() {
  return estado.carrito.reduce((s, l) => s + l.qty * l.precio, 0);
}

/** El carrito agrupado por tienda: así se cobra y así se envía. */
export function grupos(tiendasPorId) {
  const mapa = new Map();
  estado.carrito.forEach((linea) => {
    if (!mapa.has(linea.storeId)) {
      mapa.set(linea.storeId, {
        storeId: linea.storeId,
        tienda: tiendasPorId.get(linea.storeId) || null,
        lineas: [],
        total: 0,
        piezas: 0,
      });
    }
    const grupo = mapa.get(linea.storeId);
    grupo.lineas.push(linea);
    grupo.total += linea.qty * linea.precio;
    grupo.piezas += linea.qty;
  });
  return Array.from(mapa.values());
}

/** Formato que espera el servidor: sin ruido de interfaz. */
export function itemsParaServidor(grupo) {
  return grupo.lineas.map((l) => ({
    product_id: l.productoId,
    title: l.titulo,
    qty: l.qty,
    price: l.precio,
    note: l.nota || "",
    selected_options: [
      ...(Array.isArray(l.sinQue) ? l.sinQue : []).map((name) => ({
        kind: "remove",
        name,
        price: 0,
      })),
      ...(Array.isArray(l.extras) ? l.extras : []).map((extra) => ({
        kind: "extra",
        name: extra.nombre,
        price: Number(extra.precio) || 0,
      })),
      ...(Array.isArray(l.selectedOptions) ? l.selectedOptions : []).map((opcion) => ({
        kind: "group",
        group_id: opcion.groupId || opcion.group_id,
        group_name: opcion.groupName || opcion.group_name,
        option_id: opcion.optionId || opcion.option_id,
        name: opcion.name,
        price: Number(opcion.price) || 0,
      })),
    ],
  }));
}

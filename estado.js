// Estado de interfaz (no de datos): carrito, filtros, modo de pedido.
// Los datos viven en repo.js; aquí solo lo que el usuario está haciendo
// en este momento.

const LLAVE = "pueblopedidos-ui-v1";

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
    // La cola de envíos es de un solo uso: no sobrevive a un refresh.
    return { ...guardado, envios: [] };
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

// ---------- Carrito ----------

export function agregarAlCarrito({
  producto,
  cantidad = 1,
  nota = "",
  precio,
  sinQue = [],
  extras = [],
}) {
  // Mismo producto + misma nota + misma configuración = suma cantidad.
  // Cualquier diferencia es línea nueva, porque "sin cebolla" y "con
  // todo" son dos platos distintos en la cocina.
  const firma = `${nota.trim()}|${[...sinQue].sort().join(",")}|${extras
    .map((e) => e.nombre)
    .sort()
    .join(",")}`;
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
      precio,
      qty: cantidad,
      nota: nota.trim(),
      sinQue: [...sinQue],
      extras: extras.map((e) => ({ ...e })),
      firma,
    });
  }
  fijar({ carrito: estado.carrito });
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
  }));
}

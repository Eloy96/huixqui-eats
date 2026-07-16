// Driver LOCAL = modo demo, para enseñar la app sin backend.
//
// Implementa exactamente el mismo contrato que el driver de nube. Nadie
// fuera de esta carpeta sabe si los datos vienen de localStorage o de
// Supabase: ese era el problema #1 del código anterior (dos fuentes de
// verdad mezcladas en las mismas funciones).
//
// IMPORTANTE: aquí los créditos SÍ se descuentan en el navegador, porque
// es una demo y no hay servidor. Por eso el modo demo se anuncia con una
// cinta amarilla arriba y NO debe usarse para cobrar de verdad.

import { TIENDAS_DEMO, PRODUCTOS_DEMO, PRECIO_CONTACTO } from "./datos-semillas.js";

const LLAVE = "pueblopedidos-v10";

function inicial() {
  return {
    clients: [],
    stores: structuredClone(TIENDAS_DEMO),
    products: structuredClone(PRODUCTOS_DEMO),
    orders: [],
    leads: [],
    session: null,
    leadPrice: PRECIO_CONTACTO,
  };
}

let db = cargar();

function cargar() {
  try {
    const guardado = JSON.parse(localStorage.getItem(LLAVE) || "null");
    if (guardado?.stores && guardado?.products && guardado?.clients) return guardado;
  } catch (error) {
    console.warn("Storage ilegible, se reinicia el demo.", error);
  }
  return inicial();
}

function guardar() {
  try {
    localStorage.setItem(LLAVE, JSON.stringify(db));
  } catch (error) {
    console.warn("No se pudo guardar en el navegador.", error);
  }
}

const id = (prefijo) => `${prefijo}-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`;

export const driverLocal = {
  modo: "demo",

  async iniciar() {
    return db.session;
  },

  // ---------- Sesión ----------

  async sesion() {
    if (!db.session) return null;
    const { role, id: quien } = db.session;
    const perfil =
      role === "store"
        ? db.stores.find((t) => t.id === quien)
        : db.clients.find((c) => c.id === quien);
    if (!perfil) {
      db.session = null;
      guardar();
      return null;
    }
    return { role, id: quien, perfil };
  },

  async entrar({ identificador, rol }) {
    const lista = rol === "store" ? db.stores : db.clients;
    const buscado = String(identificador || "").trim().toLowerCase();
    const perfil = lista.find(
      (p) =>
        String(p.email || "").toLowerCase() === buscado ||
        String(p.phone || "").replace(/\D/g, "").endsWith(buscado.replace(/\D/g, "")),
    );
    if (!perfil) {
      throw new Error("No encontramos esa cuenta en el demo. Regístrate para crearla.");
    }
    db.session = { role: rol, id: perfil.id };
    guardar();
    return { role: rol, id: perfil.id, perfil };
  },

  async registrarCliente(datos) {
    const cliente = { id: id("cliente"), ...datos, createdAt: new Date().toISOString() };
    db.clients.push(cliente);
    db.session = { role: "client", id: cliente.id };
    guardar();
    return cliente;
  },

  async registrarTienda(datos) {
    const tienda = {
      id: datos.slug || id("tienda"),
      slug: datos.slug,
      credits: 30,
      marketingSpend: 0,
      creditSpend: 0,
      status: "active",
      prepMinutes: 15,
      ...datos,
    };
    db.stores.push(tienda);
    db.session = { role: "store", id: tienda.id };
    guardar();
    return tienda;
  },

  async salir() {
    db.session = null;
    guardar();
  },

  // ---------- Lecturas ----------

  async tiendas() {
    return db.stores.filter((t) => t.status !== "paused");
  },

  async tienda(slugOId) {
    return db.stores.find((t) => t.slug === slugOId || t.id === slugOId) || null;
  },

  async productos(storeId) {
    return db.products.filter((p) => p.storeId === storeId && p.isActive !== false);
  },

  async todosLosProductos() {
    return db.products.filter((p) => p.isActive !== false);
  },

  // ---------- Escrituras ----------

  async actualizarCliente(clienteId, parche) {
    const cliente = db.clients.find((c) => c.id === clienteId);
    if (!cliente) throw new Error("No encontramos tu perfil.");
    Object.assign(cliente, parche);
    guardar();
    return cliente;
  },

  async actualizarTienda(tiendaId, parche) {
    const tienda = db.stores.find((t) => t.id === tiendaId);
    if (!tienda) throw new Error("No encontramos la tienda.");
    Object.assign(tienda, parche);
    guardar();
    return tienda;
  },

  async guardarProducto(producto) {
    if (producto.id) {
      const actual = db.products.find((p) => p.id === producto.id);
      if (actual) {
        Object.assign(actual, producto);
        guardar();
        return actual;
      }
    }
    const nuevo = { ...producto, id: id("producto"), createdAt: new Date().toISOString() };
    db.products.unshift(nuevo);
    guardar();
    return nuevo;
  },

  async borrarProducto(productoId) {
    db.products = db.products.filter((p) => p.id !== productoId);
    guardar();
  },

  async promocionar(productoId, hasta, costo) {
    const producto = db.products.find((p) => p.id === productoId);
    if (!producto) throw new Error("No encontramos el producto.");
    producto.featuredUntil = hasta;
    const tienda = db.stores.find((t) => t.id === producto.storeId);
    if (tienda) tienda.marketingSpend = Number(tienda.marketingSpend || 0) + costo;
    guardar();
    return producto;
  },

  async comprarCreditos(tiendaId, contactos, precio) {
    const tienda = db.stores.find((t) => t.id === tiendaId);
    if (!tienda) throw new Error("No encontramos la tienda.");
    tienda.credits = Number(tienda.credits || 0) + contactos;
    tienda.creditSpend = Number(tienda.creditSpend || 0) + precio;
    guardar();
    return tienda;
  },

  /**
   * Crea un pedido por tienda y descuenta un contacto.
   * En nube esto es una sola llamada atómica al servidor; aquí es una
   * simulación honesta y así se etiqueta.
   */
  async crearPedidos({ clienteId, grupos, modo, direccion, referencia }) {
    const creadoEn = new Date().toISOString();
    const loteId = id("lote");
    const resultado = grupos.map((grupo, indice) => {
      const tienda = db.stores.find((t) => t.id === grupo.storeId);
      const cobrable = Number(tienda?.credits || 0) > 0;
      if (cobrable) tienda.credits -= 1;

      const pedido = {
        id: `${loteId}-${indice + 1}`,
        batchId: loteId,
        clientId: clienteId,
        storeId: grupo.storeId,
        mode: modo,
        items: grupo.items,
        total: grupo.total,
        address: direccion,
        reference: referencia,
        status: "enviado",
        createdAt: creadoEn,
      };
      db.orders.push(pedido);
      db.leads.push({
        id: id("lead"),
        clientId: clienteId,
        storeId: grupo.storeId,
        orderId: pedido.id,
        batchId: loteId,
        total: grupo.total,
        billable: cobrable,
        creditAfter: Number(tienda?.credits || 0),
        createdAt: creadoEn,
      });
      return { pedido, cobrable, creditosRestantes: Number(tienda?.credits || 0) };
    });
    guardar();
    return resultado;
  },

  // ---------- Reportes ----------

  async pedidosDeCliente(clienteId) {
    return db.orders.filter((o) => o.clientId === clienteId).slice().reverse();
  },

  async pedidosDeTienda(tiendaId) {
    return db.orders.filter((o) => o.storeId === tiendaId).slice().reverse();
  },

  async leadsDeTienda(tiendaId) {
    return db.leads.filter((l) => l.storeId === tiendaId).slice().reverse();
  },

  async cliente(clienteId) {
    return db.clients.find((c) => c.id === clienteId) || null;
  },

  async resumenPlataforma() {
    const contactosCobrados = db.leads.filter((l) => l.billable).length;
    return {
      contactosCobrados,
      ingresoContactos: contactosCobrados * Number(db.leadPrice || PRECIO_CONTACTO),
      ingresoRecargas: db.stores.reduce((s, t) => s + Number(t.creditSpend || 0), 0),
      ingresoPromos: db.stores.reduce((s, t) => s + Number(t.marketingSpend || 0), 0),
      ventasTotales: db.orders.reduce((s, o) => s + Number(o.total || 0), 0),
      tiendas: db.stores.length,
      pedidos: db.orders.length,
      tiendasSinCredito: db.stores.filter((t) => Number(t.credits || 0) <= 5).length,
    };
  },

  async todo() {
    return db;
  },

  reiniciar() {
    db = inicial();
    guardar();
  },
};

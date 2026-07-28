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

import { TIENDAS_DEMO, PRODUCTOS_DEMO, PRECIO_CONTACTO, PAQUETES, PLANES_PROMO } from "./datos-semillas.js";

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
    if (role === "admin") {
      return { role: "admin", id: quien, perfil: { name: "Operador" } };
    }
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
    // En el demo, el operador entra con una clave fija para poder ver el
    // panel sin backend. En la nube el rol admin lo da Supabase.
    if (rol === "admin") {
      db.session = { role: "admin", id: "operador-demo" };
      guardar();
      return { role: "admin", id: "operador-demo", perfil: { name: "Operador" } };
    }
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

  async registrarAceptacion(version) {
    if (!db.session) return;
    db.acceptances = db.acceptances || [];
    db.acceptances.push({ id: db.session.id, version, at: new Date().toISOString() });
    guardar();
  },

  async configCobro() {
    return {
      clipLink: "", banco: "Demo", clabe: "000000000000000000",
      titular: "Modo demo", aceptaEfectivo: true,
      instrucciones: "En el demo los pagos no son reales.",
      whatsappSoporte: "",
    };
  },
  async reportarPago({ plan, meses, metodo, referencia, nota }) {
    db.pagos = db.pagos || [];
    const monto = (plan === "destacado" ? 200 : 99) * meses;
    const sol = {
      id: `pr-${Date.now()}`, plan, meses, monto, metodo,
      referencia: referencia || null, nota: nota || null,
      estado: "por_verificar", creado_en: new Date().toISOString(),
      store_id: db.session?.id,
    };
    db.pagos.push(sol);
    guardar();
    return sol;
  },
  async misPagos() {
    return (db.pagos || []).filter((x) => x.store_id === db.session?.id);
  },
  async colaPagos() {
    return (db.pagos || []).map((r) => ({
      ...r,
      negocio: db.stores.find((s) => s.id === r.store_id)?.name || "—",
      categoria: db.stores.find((s) => s.id === r.store_id)?.category || "",
      categoria_libre: true,
    }));
  },
  async verificarPago(id, aprobar, motivo) {
    const sol = (db.pagos || []).find((x) => x.id === id);
    if (!sol) throw new Error("No encontramos ese reporte de pago.");
    sol.estado = aprobar ? "verificado" : "rechazado";
    sol.motivo_rechazo = aprobar ? null : motivo || null;
    if (aprobar) await this.activarSuscripcion(sol.store_id, sol.plan, sol.meses, sol.referencia);
    guardar();
    return { aprobado: aprobar, plan: sol.plan, destacado: sol.plan === "destacado" };
  },

  async darCortesia(storeId, meses) {
    const s = db.stores.find((x) => x.id === storeId);
    if (s) {
      const base = Math.max(Date.parse(s.subscribedUntil || 0) || Date.now(), Date.now());
      s.subscribedUntil = new Date(base + meses * 30 * 86400000).toISOString();
      s.subStatus = "activa";
      guardar();
    }
    return s;
  },
  async altaRapida(storeId, plan, meses, esCortesia) {
    const s = db.stores.find((x) => x.id === storeId);
    if (s) {
      await this.darCortesia(storeId, meses);
      s.plan = plan;
      guardar();
    }
    return s;
  },
  async panelOperador() {
    return db.stores.map((s) => ({
      store_id: s.id, negocio: s.name, categoria: s.category,
      plan: s.plan, estado: s.subStatus, vence: s.subscribedUntil,
      dias_restantes: s.subscribedUntil
        ? Math.ceil((Date.parse(s.subscribedUntil) - Date.now()) / 86400000) : null,
      pagos_pendientes: 0,
    }));
  },

  async tableroSuscripciones() {
    const ahora = Date.now();
    return db.stores.map((s) => ({
      store_id: s.id,
      nombre: s.name,
      categoria: s.category,
      plan: s.plan || "presencia",
      estado: s.subStatus || "prueba",
      vence: s.subscribedUntil || null,
      dias_restantes: s.subscribedUntil
        ? Math.max(0, Math.round((new Date(s.subscribedUntil) - ahora) / 86400000))
        : 30,
    }));
  },
  async activarSuscripcion(tiendaId, plan, meses, referencia) {
    const s = db.stores.find((x) => x.id === tiendaId);
    if (!s) throw new Error("No encontramos la tienda.");
    if (plan === "destacado") {
      const ocupada = db.stores.some(
        (o) => o.id !== tiendaId && o.plan === "destacado" &&
          (o.category || "").toLowerCase() === (s.category || "").toLowerCase() &&
          o.subscribedUntil && new Date(o.subscribedUntil) > new Date() && o.subStatus !== "suspendida",
      );
      if (ocupada) throw new Error("categoria_ocupada");
    }
    const base = Math.max(s.subscribedUntil ? new Date(s.subscribedUntil).getTime() : 0, Date.now());
    s.plan = plan;
    s.subStatus = "activa";
    s.subscribedUntil = new Date(base + meses * 30 * 86400000).toISOString();
    guardar();
    return s;
  },
  async suspenderTienda(tiendaId, suspender) {
    const s = db.stores.find((x) => x.id === tiendaId);
    if (!s) throw new Error("No encontramos la tienda.");
    s.subStatus = suspender ? "suspendida"
      : (s.subscribedUntil && new Date(s.subscribedUntil) > new Date() ? "activa" : "vencida");
    guardar();
    return s;
  },
  async barrerVencidas() {
    let n = 0;
    db.stores.forEach((s) => {
      if (["activa", "prueba"].includes(s.subStatus) && s.subscribedUntil &&
          new Date(s.subscribedUntil) <= new Date()) { s.subStatus = "vencida"; n++; }
    });
    guardar();
    return n;
  },
  async categoriaDestacadaLibre(categoria, exceptoId) {
    return !db.stores.some(
      (o) => o.id !== exceptoId && o.plan === "destacado" &&
        (o.category || "").toLowerCase() === (categoria || "").toLowerCase() &&
        o.subscribedUntil && new Date(o.subscribedUntil) > new Date() && o.subStatus !== "suspendida",
    );
  },

  async eliminarCuenta() {
    const s = db.session;
    if (!s) throw new Error("No hay sesión.");
    if (s.role === "store") {
      db.products = db.products.filter((p) => p.storeId !== s.id);
      db.stores = db.stores.filter((t) => t.id !== s.id);
    } else {
      db.clients = db.clients.filter((c) => c.id !== s.id);
    }
    db.orders.forEach((o) => {
      if (o.clientId === s.id) {
        o.clientId = null;
        o.address = null;
        o.reference = null;
      }
    });
    db.session = null;
    guardar();
    return { eliminado: true, tenia_tienda: s.role === "store" };
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

  /** Mismo contrato que la nube: aquí el catálogo son las semillas. */
  async catalogoPrecios() {
    return {
      paquetes: PAQUETES.map((p) => ({ ...p, id: `p${p.contactos}` })),
      planes: PLANES_PROMO.map((p) => ({ ...p, id: `d${p.dias}` })),
    };
  },

  async promocionar(productoId, planId) {
    const producto = db.products.find((p) => p.id === productoId);
    if (!producto) throw new Error("No encontramos el producto.");
    const plan = PLANES_PROMO.find((p) => `d${p.dias}` === planId);
    if (!plan) throw new Error("Ese plan no existe.");
    const desde = Math.max(
      producto.featuredUntil ? new Date(producto.featuredUntil).getTime() : 0,
      Date.now(),
    );
    producto.featuredUntil = new Date(desde + plan.dias * 86400000).toISOString();
    const tienda = db.stores.find((t) => t.id === producto.storeId);
    if (tienda) tienda.marketingSpend = Number(tienda.marketingSpend || 0) + plan.precio;
    guardar();
    return producto;
  },

  async comprarCreditos(tiendaId, paqueteId) {
    const tienda = db.stores.find((t) => t.id === tiendaId);
    if (!tienda) throw new Error("No encontramos la tienda.");
    const paquete = PAQUETES.find((p) => `p${p.contactos}` === paqueteId);
    if (!paquete) throw new Error("Ese paquete no existe.");
    tienda.credits = Number(tienda.credits || 0) + paquete.contactos;
    tienda.creditSpend = Number(tienda.creditSpend || 0) + paquete.precio;
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

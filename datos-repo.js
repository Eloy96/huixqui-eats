// EL REPOSITORIO.
//
// Regla de oro del proyecto: ninguna vista habla con localStorage ni con
// Supabase. Todas hablan con `repo`. Cuando termines de migrar, borras el
// driver local y no cambias una sola línea de las vistas.
//
// Antes: `db` global mutable + llamadas sueltas a Supabase mezcladas en
// las mismas funciones. Cada feature nacía duplicada. Eso se acabó aquí.

import { driverLocal } from "./datos-local.js";
import { driverNube, conectar } from "./datos-nube.js";
import { FORZAR_DEMO } from "./config.js";

let driver = driverLocal;
let razonDemo = "";
const oyentes = new Set();

const cache = {
  tiendas: null,
  productosPorTienda: new Map(),
  sesion: null,
};

export function alCambiar(fn) {
  oyentes.add(fn);
  return () => oyentes.delete(fn);
}

function avisar(que) {
  oyentes.forEach((fn) => fn(que));
}

export function modo() {
  return driver.modo;
}

export function motivoDemo() {
  return razonDemo;
}

/** Arranca con nube si hay config y librería; si no, demo declarado. */
export async function iniciar({ config, fabrica }) {
  if (FORZAR_DEMO) {
    razonDemo = "Demo forzado desde src/config.js (FORZAR_DEMO = true).";
  } else if (!config?.url || !config?.publishableKey) {
    razonDemo = "Falta la configuración de Supabase (src/config.js).";
  } else if (!fabrica?.createClient) {
    razonDemo = "No cargó la librería de Supabase.";
  } else {
    try {
      conectar(config, fabrica);
      await driverNube.iniciar();
      driver = driverNube;
      razonDemo = "";
    } catch (error) {
      razonDemo = `No conectamos con el servidor (${error.message}). Vas en demo local.`;
    }
  }
  cache.sesion = await driver.sesion().catch(() => null);
  return { modo: driver.modo, sesion: cache.sesion };
}

function invalidar() {
  cache.tiendas = null;
  cache.productosPorTienda.clear();
}

// ---------- Sesión ----------

export function sesion() {
  return cache.sesion;
}

export function esCliente() {
  return cache.sesion?.role === "client";
}

export function esTienda() {
  return cache.sesion?.role === "store";
}

async function refrescarSesion() {
  cache.sesion = await driver.sesion();
  avisar("sesion");
  return cache.sesion;
}

export async function entrar(datos) {
  await driver.entrar(datos);
  return refrescarSesion();
}

export async function registrarCliente(datos) {
  await driver.registrarCliente(datos);
  invalidar();
  return refrescarSesion();
}

export async function registrarTienda(datos) {
  await driver.registrarTienda(datos);
  invalidar();
  return refrescarSesion();
}

export async function salir() {
  await driver.salir();
  invalidar();
  return refrescarSesion();
}

export async function recuperarPassword(correo) {
  if (!driver.recuperarPassword) {
    throw new Error("La recuperación de contraseña necesita el modo nube activo.");
  }
  return driver.recuperarPassword(correo);
}

// ---------- Catálogo ----------

export async function tiendas() {
  if (!cache.tiendas) cache.tiendas = await driver.tiendas();
  return cache.tiendas;
}

export async function tienda(slugOId) {
  const lista = cache.tiendas;
  const local = lista?.find((t) => t.slug === slugOId || t.id === slugOId);
  if (local) return local;
  return driver.tienda(slugOId);
}

export async function productos(storeId) {
  if (!cache.productosPorTienda.has(storeId)) {
    cache.productosPorTienda.set(storeId, await driver.productos(storeId));
  }
  return cache.productosPorTienda.get(storeId);
}

export async function catalogo() {
  const [listaTiendas, listaProductos] = await Promise.all([
    tiendas(),
    driver.todosLosProductos(),
  ]);
  const porId = new Map(listaTiendas.map((t) => [t.id, t]));
  return listaProductos
    .map((p) => ({ ...p, tienda: porId.get(p.storeId) }))
    .filter((p) => p.tienda);
}

// ---------- Escrituras ----------

export async function actualizarPerfil(parche) {
  const actual = cache.sesion;
  if (!actual) throw new Error("Necesitas iniciar sesión.");
  if (actual.role === "client") await driver.actualizarCliente(actual.id, parche);
  else await driver.actualizarTienda(actual.id, parche);
  invalidar();
  return refrescarSesion();
}

export async function guardarProducto(producto) {
  const guardado = await driver.guardarProducto(producto);
  cache.productosPorTienda.delete(producto.storeId);
  avisar("productos");
  return guardado;
}

export async function borrarProducto(producto) {
  await driver.borrarProducto(producto.id);
  cache.productosPorTienda.delete(producto.storeId);
  avisar("productos");
}

export async function promocionar(producto, hasta, costo) {
  await driver.promocionar(producto.id, hasta, costo);
  cache.productosPorTienda.delete(producto.storeId);
  await refrescarSesion();
  avisar("productos");
}

export async function comprarCreditos(contactos, precio) {
  const actual = cache.sesion;
  if (actual?.role !== "store") throw new Error("Solo una tienda puede comprar contactos.");
  await driver.comprarCreditos(actual.id, contactos, precio);
  invalidar();
  return refrescarSesion();
}

export async function crearPedidos(datos) {
  const actual = cache.sesion;
  if (actual?.role !== "client") throw new Error("Inicia sesión como cliente para pedir.");
  const resultado = await driver.crearPedidos({ ...datos, clienteId: actual.id });
  invalidar();
  avisar("pedidos");
  return resultado;
}

// ---------- Consultas ----------

export function pedidosDeCliente() {
  const actual = cache.sesion;
  if (actual?.role !== "client") return Promise.resolve([]);
  return driver.pedidosDeCliente(actual.id);
}

export function pedidosDeTienda() {
  const actual = cache.sesion;
  if (actual?.role !== "store") return Promise.resolve([]);
  return driver.pedidosDeTienda(actual.id);
}

export function leadsDeTienda() {
  const actual = cache.sesion;
  if (actual?.role !== "store") return Promise.resolve([]);
  return driver.leadsDeTienda(actual.id);
}

export function clientePorId(id) {
  return driver.cliente(id);
}

export function resumenPlataforma() {
  return driver.resumenPlataforma();
}

export function volcado() {
  return driver.todo();
}

export function reiniciarDemo() {
  if (driver.reiniciar) {
    driver.reiniciar();
    invalidar();
    location.reload();
  }
}

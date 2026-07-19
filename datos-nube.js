// Driver NUBE (Supabase). Mismo contrato que driverLocal.
//
// Dos reglas que no se rompen aquí:
// 1. Las contraseñas nunca tocan nuestro código: son de Supabase Auth.
// 2. Los créditos NUNCA se descuentan en el navegador. `crearPedidos`
//    llama a la función `crear_pedidos` del servidor (sql/01-...sql),
//    que descuenta y registra el lead en una sola transacción. Si el
//    cliente edita algo, el servidor lo ignora.

import { normalizarWhatsApp } from "./lib-formato.js";

let cliente = null;

export function conectar(config, fabrica) {
  if (!config?.url || !config?.publishableKey || !fabrica?.createClient) return null;
  cliente = fabrica.createClient(config.url, config.publishableKey, {
    auth: { persistSession: true, autoRefreshToken: true, detectSessionInUrl: true },
  });
  return cliente;
}

function urlPublica(bucket, ruta) {
  if (!ruta) return "";
  if (/^https?:/.test(ruta)) return ruta;
  return cliente.storage.from(bucket).getPublicUrl(ruta).data.publicUrl;
}

async function subir(bucket, ruta, file) {
  const { error } = await cliente.storage.from(bucket).upload(ruta, file, {
    cacheControl: "3600",
    upsert: true,
  });
  if (error) {
    const msg = String(error.message || "");
    if (/bucket.*not.*found/i.test(msg)) {
      throw new Error(
        `Falta el espacio de imágenes "${bucket}" en Supabase. Corre 04-storage.sql en el SQL Editor (o créalo en Storage → New bucket, público).`,
      );
    }
    if (/row-level security|not authorized|403/i.test(msg)) {
      throw new Error(
        "Supabase rechazó la subida de la imagen por permisos. Corre 04-storage.sql para poner las reglas de Storage.",
      );
    }
    if (/payload too large|maximum size|413/i.test(msg)) {
      throw new Error("La imagen pesa demasiado para el servidor. Usa una más ligera.");
    }
    throw new Error(`No se pudo subir la imagen: ${msg}`);
  }
  return ruta;
}

function revisar({ data, error }) {
  if (error) throw new Error(traducir(error));
  return data;
}

/** Los errores de Supabase vienen en inglés. El pueblo no lee inglés. */
function traducir(error) {
  const mensaje = String(error?.message ?? "").trim();
  const estado = Number(error?.status || error?.statusCode || 0);

  // Un 500 de Auth llega con el cuerpo vacío: supabase-js pone "{}" como
  // mensaje y eso es lo que acababa pintado en pantalla. Sin ayuda para
  // nadie.
  if (!mensaje || mensaje === "{}" || mensaje === "[object Object]") {
    if (estado >= 500) {
      return "Supabase falló al crear la cuenta (error 500). Casi siempre es el trigger de perfiles: corre 02-probar-registro.sql en el SQL Editor para ver el motivo real.";
    }
    return "Algo falló y el servidor no dijo qué. Revisa la consola del navegador.";
  }

  if (/Database error saving new user|unexpected_failure/i.test(mensaje)) {
    return "Supabase no pudo guardar el usuario. Corre 02-probar-registro.sql para ver qué lo impide.";
  }
  // 429: pegaste el límite anti-abuso de Supabase por intentar muchas veces
  // seguidas. NO es un error de la app. Casi siempre es el tope de correos
  // de confirmación (2 por hora en el plan gratis).
  if (estado === 429 || /rate limit|too many|over_email_send/i.test(mensaje)) {
    return "Demasiados intentos seguidos. Supabase te frena un rato (protección anti-abuso). Espera ~1 hora, o apaga 'Confirm email' en Authentication → Providers → Email para probar sin límite.";
  }
  if (/Invalid API key|JWSError|apikey|No API key/i.test(mensaje)) {
    return "La llave de Supabase no sirve. Revísala en config.js contra Project Settings → API Keys.";
  }
  if (/relation .* does not exist|schema cache/i.test(mensaje)) {
    return "Faltan las tablas. Corre 01-esquema.sql en el SQL Editor.";
  }
  if (/Invalid login credentials/i.test(mensaje)) return "Correo o contraseña incorrectos.";
  if (/Email not confirmed/i.test(mensaje)) return "Falta confirmar tu correo. Revisa tu bandeja.";
  if (/User already registered/i.test(mensaje)) return "Ese correo ya tiene cuenta. Inicia sesión.";
  if (/duplicate key/i.test(mensaje)) return "Ese nombre de tienda ya existe. Prueba con otro.";
  if (/creditos_insuficientes/i.test(mensaje)) return "La tienda se quedó sin contactos disponibles.";
  if (/JWT|session/i.test(mensaje)) return "Tu sesión expiró. Vuelve a entrar.";
  if (/Failed to fetch|NetworkError/i.test(mensaje)) return "Sin conexión. Revisa tus datos móviles.";
  if (estado >= 500) return `Supabase respondió con error ${estado}. ${mensaje}`;
  return mensaje;
}

// ---------- Mapeos: la base habla snake_case, la app camelCase ----------

function aTienda(fila) {
  if (!fila) return null;
  return {
    id: fila.id,
    slug: fila.slug,
    name: fila.name,
    owner: fila.owner_name || "",
    phone: fila.whatsapp || "",
    email: fila.email || "",
    category: fila.category || "Otros",
    description: fila.description || "",
    address: fila.address || "",
    coords: fila.lat && fila.lng ? { lat: Number(fila.lat), lng: Number(fila.lng) } : null,
    serviceModes: deModos(fila.service_modes),
    image: urlPublica("logos", fila.logo_path),
    cover: urlPublica("portadas", fila.cover_path) || urlPublica("logos", fila.logo_path),
    schedule: fila.schedule || null,
    prepMinutes: fila.prep_minutes || 15,
    credits: Number(fila.credits || 0),
    marketingSpend: Number(fila.marketing_spend || 0),
    creditSpend: Number(fila.credit_spend || 0),
    status: fila.status || "active",
    remoto: true,
  };
}

function aProducto(fila) {
  if (!fila) return null;
  const detalle = fila.details || {};
  return {
    id: fila.id,
    storeId: fila.store_id,
    type: fila.type || "food",
    title: fila.title,
    productCategory: fila.category || "",
    description: fila.description || "",
    price: Number(fila.price || 0),
    image: urlPublica("productos", fila.image_path),
    discountType: fila.discount_type || "none",
    discountValue: Number(fila.discount_value || 0),
    availability: deModos(fila.availability_modes),
    featuredUntil: fila.featured_until || "",
    isActive: fila.is_active !== false,
    ingredients: detalle.ingredients || "",
    allergens: detalle.allergens || "",
    portion: detalle.portion || "",
    brand: detalle.brand || "",
    stock: detalle.stock ?? "",
    specs: detalle.specs || "",
    duration: detalle.duration || "",
    serviceArea: detalle.service_area || "",
    requirements: detalle.requirements || "",
    options: detalle.options || "",
    remoto: true,
  };
}

function aModos(valor) {
  if (valor === "delivery") return ["delivery"];
  if (valor === "pickup") return ["pickup"];
  return ["delivery", "pickup"];
}

function deModos(modos) {
  const lista = Array.isArray(modos) ? modos : [];
  if (lista.length === 1) return lista[0];
  return "both";
}

// ---------- Driver ----------

export const driverNube = {
  modo: "nube",

  async iniciar() {
    return revisar(await cliente.auth.getSession());
  },

  /**
   * ¿De verdad hay servidor del otro lado?
   *
   * `auth.getSession()` NO sirve para saberlo: lee el token de
   * localStorage y contesta que sí aunque la llave sea basura o las
   * tablas no existan. Por eso la app se creía conectada y luego moría
   * con "Invalid API key" en pantalla en vez de caerse a demo.
   *
   * Esto pega una consulta de verdad, la más barata posible.
   */
  async comprobar() {
    const { error } = await cliente.from("stores").select("id").limit(1);
    if (error) throw new Error(traducir(error));
    return true;
  },

  async sesion() {
    const { data } = await cliente.auth.getUser();
    const usuario = data?.user;
    if (!usuario) return null;

    let perfilFila = revisar(
      await cliente.from("profiles").select("*").eq("id", usuario.id).maybeSingle(),
    );

    // Red de seguridad: si el trigger no pudo crear el perfil, lo creamos
    // aquí. Antes esto devolvía null y la sesión quedaba en el limbo: el
    // usuario existía en Auth pero la app se comportaba como si no.
    if (!perfilFila) {
      perfilFila = revisar(
        await cliente
          .from("profiles")
          .upsert({
            id: usuario.id,
            role: usuario.user_metadata?.role || "customer",
            full_name: usuario.user_metadata?.full_name || "",
            phone: usuario.user_metadata?.phone || "",
          })
          .select()
          .single(),
      );
    }

    if (perfilFila.role === "store_owner") {
      const tienda = revisar(
        await cliente.from("stores").select("*").eq("owner_id", usuario.id).maybeSingle(),
      );
      if (!tienda) return { role: "client", id: usuario.id, perfil: perfilFila, sinTienda: true };
      return { role: "store", id: tienda.id, perfil: aTienda(tienda) };
    }

    return {
      role: "client",
      id: usuario.id,
      perfil: {
        id: usuario.id,
        name: perfilFila.full_name || "",
        phone: perfilFila.phone || "",
        email: usuario.email || "",
        address: perfilFila.address || "",
        reference: perfilFila.reference || "",
        coords:
          perfilFila.lat && perfilFila.lng
            ? { lat: Number(perfilFila.lat), lng: Number(perfilFila.lng) }
            : null,
      },
    };
  },

  async entrar({ identificador, password }) {
    revisar(await cliente.auth.signInWithPassword({ email: identificador, password }));
    return this.sesion();
  },

  async registrarCliente(datos) {
    revisar(
      await cliente.auth.signUp({
        email: datos.email,
        password: datos.password,
        options: {
          data: { role: "customer", full_name: datos.name, phone: normalizarWhatsApp(datos.phone) },
        },
      }),
    );
    // El trigger de after-install crea el profile; aquí completamos dirección.
    const usuario = revisar(await cliente.auth.getUser())?.user;
    if (usuario) {
      revisar(
        await cliente
          .from("profiles")
          .upsert({
            id: usuario.id,
            full_name: datos.name,
            phone: normalizarWhatsApp(datos.phone),
            address: datos.address,
            reference: datos.reference,
            lat: datos.coords?.lat ?? null,
            lng: datos.coords?.lng ?? null,
          })
          .select()
          .single(),
      );
    }
    return this.sesion();
  },

  async registrarTienda(datos) {
    revisar(
      await cliente.auth.signUp({
        email: datos.email,
        password: datos.password,
        options: {
          data: { role: "store_owner", full_name: datos.owner, phone: normalizarWhatsApp(datos.phone) },
        },
      }),
    );
    const usuario = revisar(await cliente.auth.getUser())?.user;
    if (!usuario) throw new Error("Confirma tu correo y vuelve a entrar para terminar el registro.");

    let logoRuta = "";
    let portadaRuta = "";
    if (datos.logoFile) {
      logoRuta = await subir("logos", `${usuario.id}/logo-${Date.now()}`, datos.logoFile);
    }
    if (datos.coverFile) {
      portadaRuta = await subir("portadas", `${usuario.id}/portada-${Date.now()}`, datos.coverFile);
    }

    revisar(
      await cliente
        .from("stores")
        .insert({
          owner_id: usuario.id,
          slug: datos.slug,
          name: datos.name,
          owner_name: datos.owner,
          whatsapp: normalizarWhatsApp(datos.phone),
          email: datos.email,
          category: datos.category,
          description: datos.description,
          address: datos.address,
          lat: datos.coords?.lat ?? null,
          lng: datos.coords?.lng ?? null,
          service_modes: aModos(datos.serviceModes),
          schedule: datos.schedule || null,
          logo_path: logoRuta,
          cover_path: portadaRuta,
          status: "active",
        })
        .select()
        .single(),
    );
    return this.sesion();
  },

  async salir() {
    revisar(await cliente.auth.signOut());
  },

  async recuperarPassword(correo) {
    revisar(
      await cliente.auth.resetPasswordForEmail(correo, {
        redirectTo: `${location.origin}${location.pathname}#/cuenta`,
      }),
    );
  },

  async tiendas() {
    const filas = revisar(
      await cliente
        .from("stores")
        .select("*")
        .eq("status", "active")
        .order("created_at", { ascending: false }),
    );
    return (filas || []).map(aTienda);
  },

  async tienda(slugOId) {
    const filas = revisar(
      await cliente.from("stores").select("*").or(`slug.eq.${slugOId},id.eq.${slugOId}`).limit(1),
    );
    return aTienda(filas?.[0]);
  },

  async productos(storeId) {
    const filas = revisar(
      await cliente
        .from("products")
        .select("*, details:product_details(*)")
        .eq("store_id", storeId)
        .eq("is_active", true)
        .order("created_at", { ascending: false }),
    );
    return (filas || []).map((f) => aProducto({ ...f, details: f.details?.[0] || f.details }));
  },

  async todosLosProductos() {
    const filas = revisar(
      await cliente
        .from("products")
        .select("*, details:product_details(*)")
        .eq("is_active", true)
        .order("created_at", { ascending: false })
        .limit(500),
    );
    return (filas || []).map((f) => aProducto({ ...f, details: f.details?.[0] || f.details }));
  },

  async actualizarCliente(clienteId, parche) {
    return revisar(
      await cliente
        .from("profiles")
        .update({
          full_name: parche.name,
          phone: parche.phone ? normalizarWhatsApp(parche.phone) : undefined,
          address: parche.address,
          reference: parche.reference,
          lat: parche.coords?.lat ?? undefined,
          lng: parche.coords?.lng ?? undefined,
        })
        .eq("id", clienteId)
        .select()
        .single(),
    );
  },

  async actualizarTienda(tiendaId, parche) {
    const payload = {
      name: parche.name,
      owner_name: parche.owner,
      whatsapp: parche.phone ? normalizarWhatsApp(parche.phone) : undefined,
      category: parche.category,
      description: parche.description,
      address: parche.address,
      service_modes: parche.serviceModes ? aModos(parche.serviceModes) : undefined,
      schedule: parche.schedule,
      prep_minutes: parche.prepMinutes,
    };
    if (parche.logoFile) {
      payload.logo_path = await subir("logos", `${tiendaId}/logo-${Date.now()}`, parche.logoFile);
    }
    if (parche.coverFile) {
      payload.cover_path = await subir("portadas", `${tiendaId}/portada-${Date.now()}`, parche.coverFile);
    }
    return aTienda(
      revisar(await cliente.from("stores").update(payload).eq("id", tiendaId).select().single()),
    );
  },

  async guardarProducto(producto) {
    const payload = {
      store_id: producto.storeId,
      type: producto.type,
      title: producto.title,
      category: producto.productCategory,
      description: producto.description,
      price: producto.price,
      discount_type: producto.discountType,
      discount_value: producto.discountValue,
      availability_modes: aModos(producto.availability),
      is_active: producto.isActive !== false,
    };
    if (producto.imageFile) {
      payload.image_path = await subir(
        "productos",
        `${producto.storeId}/${Date.now()}`,
        producto.imageFile,
      );
    }

    const fila = producto.id
      ? revisar(await cliente.from("products").update(payload).eq("id", producto.id).select().single())
      : revisar(await cliente.from("products").insert(payload).select().single());

    revisar(
      await cliente
        .from("product_details")
        .upsert({
          product_id: fila.id,
          ingredients: producto.ingredients || null,
          allergens: producto.allergens || null,
          portion: producto.portion || null,
          brand: producto.brand || null,
          stock: producto.stock === "" ? null : Number(producto.stock),
          specs: producto.specs || null,
          duration: producto.duration || null,
          service_area: producto.serviceArea || null,
          requirements: producto.requirements || null,
          options: producto.options || null,
        })
        .select()
        .single(),
    );

    return aProducto(fila);
  },

  async borrarProducto(productoId) {
    revisar(await cliente.from("products").update({ is_active: false }).eq("id", productoId));
  },

  /** Promoción cobrada: también la valida el servidor, no el navegador. */
  async promocionar(productoId, hasta, costo) {
    return revisar(
      await cliente.rpc("promocionar_producto", {
        p_product_id: productoId,
        p_hasta: hasta,
        p_costo: costo,
      }),
    );
  },

  async comprarCreditos(tiendaId, contactos, precio) {
    return revisar(
      await cliente.rpc("comprar_creditos", {
        p_store_id: tiendaId,
        p_contactos: contactos,
        p_precio: precio,
      }),
    );
  },

  /** Una llamada, una transacción, el servidor manda. */
  async crearPedidos({ grupos, modo, direccion, referencia }) {
    const data = revisar(
      await cliente.rpc("crear_pedidos", {
        p_grupos: grupos.map((g) => ({
          store_id: g.storeId,
          items: g.items,
          total: g.total,
        })),
        p_modo: modo,
        p_direccion: direccion,
        p_referencia: referencia,
      }),
    );
    return (data || []).map((fila) => ({
      pedido: {
        id: fila.order_id,
        storeId: fila.store_id,
        items: fila.items,
        total: fila.total,
        mode: modo,
        address: direccion,
        reference: referencia,
        status: "enviado",
        createdAt: fila.created_at,
      },
      cobrable: fila.billable,
      creditosRestantes: fila.credits_left,
    }));
  },

  async pedidosDeCliente(clienteId) {
    const filas = revisar(
      await cliente
        .from("orders")
        .select("*")
        .eq("client_id", clienteId)
        .order("created_at", { ascending: false })
        .limit(50),
    );
    return (filas || []).map(aPedido);
  },

  async pedidosDeTienda(tiendaId) {
    const filas = revisar(
      await cliente
        .from("orders")
        .select("*")
        .eq("store_id", tiendaId)
        .order("created_at", { ascending: false })
        .limit(200),
    );
    return (filas || []).map(aPedido);
  },

  async leadsDeTienda(tiendaId) {
    const filas = revisar(
      await cliente
        .from("leads")
        .select("*")
        .eq("store_id", tiendaId)
        .order("created_at", { ascending: false })
        .limit(200),
    );
    return (filas || []).map((f) => ({
      id: f.id,
      clientId: f.client_id,
      storeId: f.store_id,
      orderId: f.order_id,
      total: Number(f.total || 0),
      billable: f.billable,
      creditAfter: f.credit_after,
      createdAt: f.created_at,
    }));
  },

  async cliente(clienteId) {
    const fila = revisar(
      await cliente.from("profiles").select("*").eq("id", clienteId).maybeSingle(),
    );
    return fila ? { id: fila.id, name: fila.full_name, phone: fila.phone } : null;
  },

  async resumenPlataforma() {
    return revisar(await cliente.rpc("resumen_plataforma"));
  },

  async todo() {
    return null;
  },
};

function aPedido(fila) {
  return {
    id: fila.id,
    clientId: fila.client_id,
    storeId: fila.store_id,
    mode: fila.mode,
    items: fila.items || [],
    total: Number(fila.total || 0),
    address: fila.address,
    reference: fila.reference,
    status: fila.status || "enviado",
    createdAt: fila.created_at,
  };
}

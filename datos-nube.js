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

/**
 * Extensión correcta según el tipo real del archivo.
 *
 * Por qué importa: Supabase Storage decide el Content-Type por la
 * extensión del objeto. Si el nombre no la trae, sirve el archivo como
 * binario genérico y el navegador NO lo dibuja: la foto sube sin error y
 * luego aparece rota. Nos pasó exactamente eso.
 */
function extensionDe(file) {
  const porTipo = {
    "image/jpeg": "jpg",
    "image/jpg": "jpg",
    "image/png": "png",
    "image/webp": "webp",
    "image/gif": "gif",
    "image/avif": "avif",
  };
  const porNombre = String(file?.name || "").match(/\.([a-z0-9]{2,5})$/i);
  return porTipo[file?.type] || (porNombre ? porNombre[1].toLowerCase() : "jpg");
}

async function subir(bucket, ruta, file) {
  // La ruta llega SIN extensión; se la ponemos aquí para que no se nos
  // olvide en ninguna de las tres subidas (logo, portada, producto).
  const rutaFinal = /\.[a-z0-9]{2,5}$/i.test(ruta) ? ruta : `${ruta}.${extensionDe(file)}`;
  const { error } = await cliente.storage.from(bucket).upload(rutaFinal, file, {
    cacheControl: "3600",
    upsert: true,
    contentType: file?.type || "image/jpeg",
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
        "Supabase rechazó la subida por permisos. Corre 04-storage.sql para poner las reglas de Storage.",
      );
    }
    if (/mime|content.?type/i.test(msg)) {
      throw new Error(
        `Ese tipo de imagen no está permitido en el bucket "${bucket}". Usa JPG, PNG o WEBP. (${msg})`,
      );
    }
    // Cualquier otro caso: el mensaje crudo de Supabase vale más que una
    // suposición mía. Sin él, un 400 es indistinguible de otro.
    if (msg) {
      throw new Error(
        `No se pudo subir la imagen. Supabase respondió: "${msg}". Corre 04b-diagnostico-storage.sql para ver qué falta.`,
      );
    }
    if (/payload too large|maximum size|413/i.test(msg)) {
      throw new Error("La imagen pesa demasiado para el servidor. Usa una más ligera.");
    }
    throw new Error(`No se pudo subir la imagen: ${msg}`);
  }
  return rutaFinal;
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
  if (/paquete_invalido|plan_invalido/i.test(mensaje)) return "Ese paquete ya no está disponible. Recarga la página.";
  if (/extra_sin_nombre/i.test(mensaje)) return "Un extra se quedó sin nombre. Escríbelo o quítalo.";
  if (/extra_precio_invalido/i.test(mensaje)) return "Revisa el precio de los extras: debe ser un número de 0 en adelante.";
  if (/extra_nombre_largo|quitable_invalido/i.test(mensaje)) return "Algún nombre de extra o ingrediente es demasiado largo.";
  if (/categoria_ocupada/i.test(mensaje)) return "Ya hay un destacado en esa categoría. Espera a que se libere o elige el plan Presencia.";
  if (/solo_operador/i.test(mensaje)) return "Solo el operador puede hacer esto.";
  if (/meses_invalido/i.test(mensaje)) return "El número de meses no es válido.";
  if (/demasiadas_recargas/i.test(mensaje)) return "Demasiadas recargas seguidas. Espera un momento.";
  if (/limite_productos/i.test(mensaje)) return "Llegaste al máximo de 300 productos publicados.";
  if (/textos_razonables|orders_razonable/i.test(mensaje)) return "Algún texto es demasiado largo. Acórtalo e inténtalo de nuevo.";
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
    plan: fila.plan || "presencia",
    subStatus: fila.sub_status || "prueba",
    subscribedUntil: fila.subscribed_until,
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
    quitables: Array.isArray(fila.removable_items) ? fila.removable_items : [],
    extras: Array.isArray(fila.extras) ? fila.extras : [],
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

  /** Deja constancia de que este usuario aceptó los documentos vigentes. */
  async registrarAceptacion(version) {
    const { data } = await cliente.auth.getUser();
    const usuario = data?.user;
    if (!usuario) return;
    // Si esto falla no tumbamos el registro: el usuario ya se dio de alta y
    // culparlo por un fallo nuestro de bitácora sería absurdo. Queda en
    // consola para que se pueda revisar.
    const { error } = await cliente.from("terms_acceptances").insert([
      { user_id: usuario.id, doc: "terminos", version },
      { user_id: usuario.id, doc: "privacidad", version },
    ]);
    if (error) console.warn("No se registró la aceptación de términos:", error.message);
  },

  // ---- Suscripciones (operador) ----
  async tableroSuscripciones() {
    return revisar(await cliente.rpc("tablero_suscripciones")) || [];
  },
  async activarSuscripcion(tiendaId, plan, meses, referencia) {
    return revisar(
      await cliente.rpc("activar_suscripcion", {
        p_store_id: tiendaId,
        p_plan: plan,
        p_meses: meses,
        p_referencia: referencia || null,
      }),
    );
  },
  async suspenderTienda(tiendaId, suspender) {
    return revisar(
      await cliente.rpc("suspender_tienda", { p_store_id: tiendaId, p_suspender: suspender }),
    );
  },
  async barrerVencidas() {
    return revisar(await cliente.rpc("barrer_vencidas"));
  },
  async categoriaDestacadaLibre(categoria, exceptoId) {
    return revisar(
      await cliente.rpc("categoria_destacada_libre", {
        p_categoria: categoria,
        p_excepto: exceptoId || null,
      }),
    );
  },

  async eliminarCuenta() {
    const resultado = revisar(await cliente.rpc("eliminar_mi_cuenta"));
    await cliente.auth.signOut();
    return resultado;
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
    // La columna id es UUID. Si aquí llega un slug ("tacos-don-luis") y lo
    // metemos en id.eq, Postgres rechaza la CONSULTA ENTERA por "invalid
    // input syntax for type uuid" y la app decía "no existe ese negocio".
    // Por eso el link compartido fallaba en un navegador limpio pero
    // funcionaba en el del dueño (ahí la tienda ya estaba en caché y ni se
    // consultaba). Solo comparamos contra id cuando DE VERDAD es un UUID.
    const esUuid =
      /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(slugOId);
    const consulta = esUuid
      ? cliente.from("stores").select("*").or(`slug.eq.${slugOId},id.eq.${slugOId}`)
      : cliente.from("stores").select("*").eq("slug", slugOId);
    const filas = revisar(await consulta.limit(1));
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
    // Si la foto no se puede subir (buckets sin crear, permisos), el
    // producto se publica de todas formas y avisamos. Perder el formulario
    // completo por una foto es castigar al negocio por un problema nuestro.
    let avisoFoto = "";
    if (producto.imageFile) {
      try {
        payload.image_path = await subir(
          "productos",
          `${producto.storeId}/${Date.now()}`,
          producto.imageFile,
        );
      } catch (errorFoto) {
        avisoFoto = errorFoto.message;
      }
    }

    const fila = producto.id
      ? revisar(await cliente.from("products").update(payload).eq("id", producto.id).select().single())
      : revisar(await cliente.from("products").insert(payload).select().single());
    if (avisoFoto) fila.__avisoFoto = avisoFoto;

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
      removable_items: Array.isArray(producto.quitables) ? producto.quitables : [],
      extras: Array.isArray(producto.extras) ? producto.extras : [],
        })
        .select()
        .single(),
    );

    const resultado = aProducto(fila);
    if (fila.__avisoFoto) resultado.avisoFoto = fila.__avisoFoto;
    return resultado;
  },

  async borrarProducto(productoId) {
    revisar(await cliente.from("products").update({ is_active: false }).eq("id", productoId));
  },

  /**
   * El catálogo de precios vive en el SERVIDOR (tablas packages y
   * promo_plans). Si no responde, no inventamos precios: mejor no mostrar
   * nada que mostrar uno que el servidor va a ignorar.
   */
  async catalogoPrecios() {
    const [paquetes, planes] = await Promise.all([
      cliente.from("packages").select("*").eq("active", true).order("sort_order"),
      cliente.from("promo_plans").select("*").eq("active", true).order("sort_order"),
    ]);
    return {
      paquetes: (revisar(paquetes) || []).map((f) => ({
        id: f.id,
        contactos: f.contacts,
        precio: Number(f.price),
        etiqueta: f.label,
        mejor: f.best,
      })),
      planes: (revisar(planes) || []).map((f) => ({
        id: f.id,
        dias: f.days,
        precio: Number(f.price),
        etiqueta: f.label,
      })),
    };
  },

  /** Solo mandamos QUÉ plan. Cuánto cuesta lo decide el servidor. */
  async promocionar(productoId, planId) {
    return revisar(
      await cliente.rpc("promocionar_producto", {
        p_product_id: productoId,
        p_plan_id: planId,
      }),
    );
  },

  async comprarCreditos(tiendaId, paqueteId) {
    return revisar(
      await cliente.rpc("comprar_creditos", {
        p_store_id: tiendaId,
        p_paquete_id: paqueteId,
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

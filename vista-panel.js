// Panel del negocio.
//
// Antes esto era la mitad de app.js con ~40 getElementById. Ahora es una
// vista con pestañas que solo habla con `repo`. El saldo de contactos que
// se ve aquí es el que dice el servidor: si alguien lo edita en DevTools,
// el número cambia en su pantalla y en ningún otro lado.

import { html, pintarEn, delegar, leerImagen, urlSegura, copiar } from "./lib-dom.js";
import { icono, toast, vacio, abrirHoja, esqueletoLista } from "./lib-ui.js";
import * as repo from "./datos-repo.js";
import { CATEGORIAS, imagenPorCategoria, MEDIDAS_IMAGEN } from "./datos-semillas.js";
import {
  dinero,
  fechaHora,
  fechaCorta,
  haceRato,
  precioFinal,
  estaPromocionado,
  etiquetaModo,
  etiquetaTipo,
  csv,
  descargar,
} from "./lib-formato.js";
import { campoDireccion } from "./lib-campo-direccion.js";
import { ubicacionActual, direccionDesdeCoords, linkMapa } from "./lib-ubicacion.js";

let pestana = "resumen";
let editando = null;
let imagen = { dataUrl: "", file: null };

export async function vistaPanel(contenedor) {
  const sesion = repo.sesion();
  if (sesion?.role !== "store") {
    pintarEn(
      contenedor,
      vacio({
        titulo: "Este panel es para negocios",
        texto: "Entra con la cuenta de tu negocio o regístralo. Es gratis.",
        accion: html`<a class="boton boton--principal" href="#/cuenta">Ir a mi cuenta</a>`,
      }),
    );
    return;
  }

  const tienda = sesion.perfil;

  pintarEn(
    contenedor,
    html`
      <div class="home-cabeza">
        <div>
          <h1>${tienda.name}</h1>
          <p style="color:var(--tinta-60);font-size:var(--t-sm)">
            ${tienda.category} · ${etiquetaModo(tienda.serviceModes)}
          </p>
        </div>
        <a class="boton boton--contorno boton--chico" href="#/tienda/${tienda.slug || tienda.id}">Ver mi tienda</a>
      </div>

      <div class="pestanas" role="tablist">
        ${tabPanel("resumen", "Resumen")}
        ${tabPanel("productos", "Productos")}
        ${tabPanel("contactos", "Contactos recibidos")}
        ${tabPanel("promocion", "Plan y promoción")}
        ${tabPanel("perfil", "Perfil")}
      </div>

      <div data-panel id="panel-negocio" role="tabpanel" aria-labelledby="tab-${pestana}">${esqueletoLista(2)}</div>
    `,
  );

  delegar(contenedor, "click", "[data-tab]", (_ev, boton) => {
    pestana = boton.dataset.tab;
    vistaPanel(contenedor);
  });

  const panel = contenedor.querySelector("[data-panel]");
  const [productos, pedidos, leads] = await Promise.all([
    repo.productos(tienda.id),
    repo.pedidosDeTienda(),
    repo.leadsDeTienda(),
  ]);
  const ctx = { contenedor, panel, tienda, productos, pedidos, leads };

  if (pestana === "resumen") pintarResumen(ctx);
  else if (pestana === "productos") pintarProductos(ctx);
  else if (pestana === "contactos") pintarContactos(ctx);
  else if (pestana === "promocion") pintarPromocion(ctx);
  else pintarPerfil(ctx);
}

function tabPanel(clave, texto) {
  const activa = pestana === clave;
  return html`<button
    class="pestana"
    id="tab-${clave}"
    role="tab"
    data-tab="${clave}"
    aria-controls="panel-negocio"
    aria-selected="${activa}"
    tabindex="${activa ? "0" : "-1"}"
    type="button"
  >${texto}</button>`;
}

// ---------- Resumen ----------

/**
 * Banner según el estado de pago de la tienda. "" si está todo al día.
 *
 * Esta función se perdió una vez al reescribir el archivo y tumbó el
 * panel entero. Ahora hay una prueba que carga el panel con cada estado
 * de suscripción para que no vuelva a pasar en silencio.
 */
function avisoSuscripcion(tienda) {
  const dias = tienda.subscribedUntil
    ? Math.ceil((new Date(tienda.subscribedUntil) - Date.now()) / 86400000)
    : null;

  if (tienda.subStatus === "suspendida") {
    return html`<div class="banner banner--error">
      Tu tienda está suspendida y no aparece en el directorio. Contáctanos para reactivarla.
    </div>`;
  }
  if (tienda.subStatus === "vencida" || (dias !== null && dias <= 0)) {
    return html`<div class="banner banner--error">
      <strong>Tu tienda no está visible.</strong> Tu plan venció. En cuanto registres tu pago
      vuelve a aparecer tal como estaba.
    </div>`;
  }
  if (tienda.subStatus === "prueba") {
    return html`<div class="banner banner--info">
      Estás en tu <strong>prueba gratis</strong>: te ${dias === 1 ? "queda" : "quedan"} ${dias}
      día${dias === 1 ? "" : "s"}. Después son $99 al mes para seguir apareciendo.
    </div>`;
  }
  if (dias !== null && dias <= 5) {
    return html`<div class="banner banner--aviso">
      Tu plan vence en ${dias} día${dias === 1 ? "" : "s"}. Renueva para no dejar de aparecer.
    </div>`;
  }
  return "";
}

function pintarResumen({ panel, tienda, productos, pedidos, leads, contenedor }) {
  const cobrados = leads.filter((l) => l.billable).length;
  const conversion = cobrados ? Math.round((pedidos.length / cobrados) * 100) : 0;
  const ventas = pedidos.reduce((s, p) => s + Number(p.total || 0), 0);
  const enlace = `${location.origin}${location.pathname}#/tienda/${tienda.slug || tienda.id}`;

  pintarEn(
    panel,
    html`
      ${avisoSuscripcion(tienda)}
      ${avisoVisibilidad(tienda, productos)}

      <div class="metricas">
        <div class="metrica">
          <span>Saldo de contactos</span>
          <strong>${tienda.credits}</strong>
          <small>disponibles</small>
        </div>
        <div class="metrica">
          <span>Pedidos</span>
          <strong>${pedidos.length}</strong>
          <small>recibidos</small>
        </div>
        <div class="metrica">
          <span>Ventas</span>
          <strong>${dinero(ventas)}</strong>
          <small>reportadas</small>
        </div>
        <div class="metrica">
          <span>Conversión</span>
          <strong>${conversion}%</strong>
          <small>${pedidos.length} de ${cobrados} contactos</small>
        </div>
      </div>

      <section class="tarjeta" style="margin-top:var(--e-4)">
        <h2 style="font-size:var(--t-lg)">Tu link</h2>
        <p style="font-size:var(--t-sm);color:var(--tinta-60);margin-top:var(--e-1)">
          Pégalo en tu estado de WhatsApp, en tu rótulo o en una calcomanía. Es tu tienda completa.
        </p>
        <code style="display:block;margin:var(--e-2) 0;padding:var(--e-2);background:var(--superficie-2);border-radius:var(--r-sm);font-size:var(--t-xs);overflow-wrap:anywhere">
          ${enlace}
        </code>
        <button class="boton boton--contorno boton--chico" data-copiar type="button">${icono.copiar()} Copiar link</button>
      </section>

      <section style="margin-top:var(--e-4)">
        <div class="seccion-cabeza">
          <h2>Últimos pedidos</h2>
          ${pedidos.length ? html`<button class="boton boton--texto" data-csv type="button">Descargar CSV</button>` : ""}
        </div>
        ${pedidos.length
          ? html`
              <div>
                ${pedidos.slice(0, 5).map(
                  (pedido) => html`
                    <article class="pedido">
                      <header class="pedido-cabeza">
                        <div>
                          <strong>${pedido.mode}</strong>
                          <small>${haceRato(pedido.createdAt)} · ${pedido.address || "recoge en tienda"}</small>
                        </div>
                        <strong>${dinero(pedido.total)}</strong>
                      </header>
                      <ul>
                        ${(pedido.items || []).map((i) => html`<li>${i.qty} × ${i.title}${i.note ? ` (${i.note})` : ""}</li>`)}
                      </ul>
                    </article>
                  `,
                )}
              </div>
            `
          : vacio({
              titulo: "Aún no llegan pedidos",
              texto: productos.length
                ? "Comparte el link de tu tienda para empezar a recibir pedidos."
                : "Publica tu primer producto para aparecer en Inicio y empezar a recibir pedidos.",
              accion: html`<button class="boton boton--principal" data-tab="productos" type="button">Publicar un producto</button>`,
            })}
      </section>
    `,
  );

  const copiarBtn = panel.querySelector("[data-copiar]");
  copiarBtn?.addEventListener("click", async () => {
    await copiar(enlace);
    toast("Link copiado.");
  });

  panel.querySelector("[data-csv]")?.addEventListener("click", () => {
    const filas = [["fecha", "modo", "total", "direccion", "productos"]];
    pedidos.forEach((p) =>
      filas.push([
        fechaHora(p.createdAt),
        p.mode,
        p.total,
        p.address || "",
        (p.items || []).map((i) => `${i.qty}x ${i.title}`).join(" | "),
      ]),
    );
    descargar(`pedidos-${tienda.slug || tienda.id}.csv`, csv(filas));
  });
}

function avisoVisibilidad(tienda, productos) {
  if (["suspendida", "vencida"].includes(tienda.subStatus)) return "";
  const activos = productos.filter((producto) => producto.active !== false);
  const ofreceEntrega = tienda.serviceModes === "both" || tienda.serviceModes === "delivery";
  const ofreceRecoger = tienda.serviceModes === "both" || tienda.serviceModes === "pickup";
  const paraEntrega = activos.some((producto) => producto.availability === "both" || producto.availability === "delivery");
  const paraRecoger = activos.some((producto) => producto.availability === "both" || producto.availability === "pickup");
  const modosVisibles = [
    ofreceEntrega && paraEntrega ? "Entrega" : "",
    ofreceRecoger && paraRecoger ? "Recoger" : "",
  ].filter(Boolean);

  if (!activos.length) {
    return html`<div class="banner banner--aviso publicacion-estado">
      <strong>Tu tienda está creada y aparece en Buscar.</strong>
      <span>Publica tu primer producto para que también aparezca en Inicio y los clientes puedan pedir.</span>
      <button class="banner-accion" data-tab="productos" type="button">Publicar mi primer producto</button>
    </div>`;
  }
  if (!modosVisibles.length) {
    return html`<div class="banner banner--aviso publicacion-estado">
      <strong>Tus productos no coinciden con tu forma de entrega.</strong>
      <span>Revisa si están disponibles para Entrega, Recoger o ambas opciones.</span>
      <button class="banner-accion" data-tab="productos" type="button">Revisar productos</button>
    </div>`;
  }
  return html`<div class="banner banner--info publicacion-estado">
    <strong>Tu tienda está publicada.</strong>
    <span>Aparece en Inicio para ${modosVisibles.join(" y ")} y también puede encontrarse en Buscar.</span>
    <a class="banner-accion" href="#/tienda/${tienda.slug || tienda.id}">Ver como cliente</a>
  </div>`;
}

// ---------- Productos ----------

function pintarProductos({ panel, tienda, productos, contenedor }) {
  pintarEn(
    panel,
    html`
      <div class="seccion-cabeza">
        <div>
          <h2>Mis productos</h2>
          <p>${productos.length} publicado${productos.length === 1 ? "" : "s"}</p>
        </div>
        <button class="boton boton--principal boton--chico" data-nuevo type="button">${icono.mas()} Nuevo</button>
      </div>

      ${productos.length
        ? html`
            <div class="menu-lista">
              ${productos.map(
                (producto) => html`
                  <div class="menu-fila" style="cursor:default">
                    <div>
                      <h3>${producto.title}</h3>
                      <p>${producto.description}</p>
                      <div class="menu-fila-etiquetas">
                        <span class="sello sello--modo">${etiquetaTipo(producto.type)}</span>
                        ${estaPromocionado(producto)
                          ? html`<span class="sello sello--promo">Hasta ${fechaCorta(producto.featuredUntil)}</span>`
                          : ""}
                      </div>
                      <div class="precio"><strong>${dinero(precioFinal(producto))}</strong></div>
                      <div style="display:flex;gap:var(--e-2);margin-top:var(--e-2);flex-wrap:wrap">
                        <button class="boton boton--contorno boton--chico" data-editar="${producto.id}" type="button">Editar</button>
                        ${estaPromocionado(producto)
                          ? html`<button class="boton boton--texto boton--chico" data-quitar-destacado="${producto.id}" type="button">Quitar destacado</button>`
                          : html`<button class="boton boton--contorno boton--chico" data-destacar="${producto.id}" data-nombre="${producto.title}" type="button">${icono.estrella()} ${tienda.plan === "destacado" ? "Destacar" : "Destacar · $20"}</button>`}
                        <button class="boton boton--peligro boton--chico" data-borrar="${producto.id}" type="button" aria-label="Eliminar ${producto.title}">
                          ${icono.basura()}
                        </button>
                      </div>
                    </div>
                    <img class="menu-fila-foto" src="${urlSegura(producto.image)}" alt="" loading="lazy" />
                  </div>
                `,
              )}
            </div>
          `
        : vacio({
            titulo: "Publica tu primer producto",
            texto: "Con foto, precio y descripción. Los negocios con foto reciben más del doble de contactos.",
            accion: html`<button class="boton boton--principal" data-nuevo type="button">Publicar producto</button>`,
          })}
    `,
  );

  delegar(panel, "click", "[data-nuevo]", () => {
    editando = null;
    imagen = { dataUrl: "", file: null };
    hojaProducto(tienda, contenedor);
  });

  delegar(panel, "click", "[data-editar]", (_ev, boton) => {
    editando = productos.find((p) => p.id === boton.dataset.editar) || null;
    imagen = { dataUrl: editando?.image || "", file: null };
    hojaProducto(tienda, contenedor);
  });

  delegar(panel, "click", "[data-borrar]", async (_ev, boton) => {
    const producto = productos.find((p) => p.id === boton.dataset.borrar);
    if (!producto) return;
    if (!confirm(`¿Quitar “${producto.title}” de tu tienda?`)) return;
    try {
      await repo.borrarProducto(producto);
      toast("Producto quitado.");
      vistaPanel(contenedor);
    } catch (error) {
      toast(error.message, "error");
    }
  });

  // El plan Destacado usa su cupo. En Presencia se crea un Checkout nuevo
  // y el producto solo cambia cuando Clip confirma el pago.
  delegar(panel, "click", "[data-destacar]", async (_ev, boton) => {
    const id = boton.dataset.destacar;
    const nombre = boton.dataset.nombre || "este producto";
    try {
      if (tienda.plan === "destacado") {
        await repo.destacarMiProducto(id, true);
        toast(`“${nombre}” quedó destacado.`);
        vistaPanel(contenedor);
      } else {
        const config = await repo.configCobro();
        abrirPagoDestacado({
          purchaseType: "product_feature",
          productId: id,
          contenedor,
          titulo: `Destacar “${nombre}”`,
          descripcion: `Tu producto aparecerá como promocionado durante ${config.productFeatureDays || 7} días.`,
          monto: config.productFeaturePrice || 20,
        });
      }
    } catch (error) {
      toast(error.message, "error");
    }
  });

  delegar(panel, "click", "[data-quitar-destacado]", async (_ev, boton) => {
    try {
      await repo.destacarMiProducto(boton.dataset.quitarDestacado, false);
      toast("Se quitó el destacado.");
      vistaPanel(contenedor);
    } catch (error) {
      toast(error.message, "error");
    }
  });
}

function hojaProducto(tienda, contenedor) {
  const p = editando || {};

  const { nodo, cerrar } = abrirHoja({
    titulo: editando ? "Editar producto" : "Nuevo producto",
    cuerpo: html`
      <form data-form novalidate>
        <section class="bloque" style="padding-top:0">
          <div class="bloque-titulo">
            <span class="bloque-num">1</span>
            <h3>Lo básico</h3>
          </div>
          <label class="campo">
            <span>¿Qué vendes?</span>
            <select name="type" data-tipo>
              <option value="food" ${p.type === "food" || !p.type ? "selected" : ""}>Comida o bebida</option>
              <option value="retail" ${p.type === "retail" ? "selected" : ""}>Un producto (papelería, abarrotes...)</option>
              <option value="service" ${p.type === "service" ? "selected" : ""}>Un servicio (plomería, clases...)</option>
            </select>
          </label>
          <div class="campos-2">
            <label class="campo">
              <span>Nombre</span>
              <input name="title" value="${p.title || ""}" placeholder="Orden de pastor" required />
            </label>
            <label class="campo">
              <span>Precio (pesos)</span>
              <input name="price" type="number" min="1" step="1" inputmode="numeric" value="${p.price || ""}" placeholder="68" required />
            </label>
          </div>
          <label class="campo">
            <span>Categoría</span>
            <input name="productCategory" value="${p.productCategory || tienda.category}" list="cats" />
            <datalist id="cats">${CATEGORIAS.map((c) => html`<option value="${c}"></option>`)}</datalist>
          </label>
          <label class="campo">
            <span>Descripción</span>
            <textarea name="description" placeholder="Qué lleva, para cuántos alcanza" required>${p.description || ""}</textarea>
            <small>Es lo que el cliente lee antes de decidir. Sé concreto.</small>
          </label>
        </section>

        <section class="bloque">
          <div class="bloque-titulo">
            <span class="bloque-num">2</span>
            <h3>Foto</h3>
            <small>los productos con foto venden más</small>
          </div>
          <label class="campo">
            <input type="file" accept="image/jpeg,image/png,image/webp" data-imagen />
            <small>${MEDIDAS_IMAGEN.producto.texto} Máx. 12 MB; la ajustamos y comprimimos automáticamente.</small>
          </label>
          <div data-previa></div>
          <div data-aviso-foto></div>
        </section>

        <section class="bloque">
          <div class="bloque-titulo">
            <span class="bloque-num">3</span>
            <h3>Cómo se vende</h3>
          </div>
          <label class="campo">
            <span>Disponible para</span>
            <select name="availability">
              <option value="both" ${p.availability === "both" || !p.availability ? "selected" : ""}>Entrega y recoger</option>
              <option value="delivery" ${p.availability === "delivery" ? "selected" : ""}>Solo entrega</option>
              <option value="pickup" ${p.availability === "pickup" ? "selected" : ""}>Solo recoger</option>
            </select>
          </label>
          <label class="campo">
            <span>¿Tiene descuento?</span>
            <select name="discountType" data-descuento>
              <option value="none" ${p.discountType === "none" || !p.discountType ? "selected" : ""}>No, precio normal</option>
              <option value="percent" ${p.discountType === "percent" ? "selected" : ""}>Sí, un porcentaje (%)</option>
              <option value="amount" ${p.discountType === "amount" ? "selected" : ""}>Sí, pesos de rebaja ($)</option>
            </select>
          </label>
          <label class="campo" data-descuento-valor hidden>
            <span data-descuento-etiqueta>¿De cuánto?</span>
            <input name="discountValue" type="number" min="1" step="1" inputmode="numeric" value="${p.discountValue || ""}" placeholder="10" />
            <small data-descuento-ayuda></small>
          </label>
        </section>

        <section class="bloque" style="border-bottom:0">
          <div class="bloque-titulo">
            <span class="bloque-num">4</span>
            <h3 data-titulo-detalles>Detalles</h3>
            <small>opcional</small>
          </div>

          <fieldset data-campos="food" style="border:0;padding:0;margin:0">
            <label class="campo">
              <span>Ingredientes</span>
              <input name="ingredients" value="${p.ingredients || ""}" placeholder="Cerdo, piña, cilantro" />
            </label>
            <div class="campos-2">
              <label class="campo">
                <span>Alérgenos</span>
                <input name="allergens" value="${p.allergens || ""}" placeholder="Gluten, lácteos" />
              </label>
              <label class="campo">
                <span>Porción</span>
                <input name="portion" value="${p.portion || ""}" placeholder="5 piezas" />
              </label>
            </div>
          </fieldset>

          <fieldset data-campos="retail" style="border:0;padding:0;margin:0">
            <div class="campos-2">
              <label class="campo">
                <span>Marca</span>
                <input name="brand" value="${p.brand || ""}" />
              </label>
              <label class="campo">
                <span>Existencias</span>
                <input name="stock" type="number" min="0" step="1" inputmode="numeric" value="${p.stock ?? ""}" />
                <small>Si se acaba, el producto se marca solo como agotado.</small>
              </label>
            </div>
            <label class="campo">
              <span>Especificaciones</span>
              <input name="specs" value="${p.specs || ""}" placeholder="Medidas, color, material" />
            </label>
          </fieldset>

          <fieldset data-campos="service" style="border:0;padding:0;margin:0">
            <div class="campos-2">
              <label class="campo">
                <span>Duración</span>
                <input name="duration" value="${p.duration || ""}" placeholder="2 horas" />
              </label>
              <label class="campo">
                <span>Zona de servicio</span>
                <input name="serviceArea" value="${p.serviceArea || ""}" placeholder="Centro y colonias cercanas" />
              </label>
            </div>
            <label class="campo">
              <span>Requisitos</span>
              <input name="requirements" value="${p.requirements || ""}" placeholder="Qué necesitas del cliente" />
            </label>
          </fieldset>

        </section>

        <section class="bloque" style="border-bottom:0">
          <div class="bloque-titulo">
            <span class="bloque-num">5</span>
            <h3>Qué puede cambiar el cliente</h3>
            <small>opcional</small>
          </div>

          <div class="opciones-grupo">
            <h4>Ingredientes que puede quitar</h4>
            <p class="opciones-ayuda">
              Lo que el platillo ya lleva y alguien puede pedir sin: cilantro, cebolla, salsa.
              No cambia el precio.
            </p>
            <div data-quitables></div>
            <button class="boton boton--contorno boton--chico" data-agregar-quitable type="button">
              ${icono.mas()} Agregar ingrediente
            </button>
          </div>

          <div class="opciones-grupo">
            <h4>Extras que cuestan</h4>
            <p class="opciones-ayuda">
              Lo que se agrega y se cobra aparte: queso $10, doble carne $25.
              Se suma al total del pedido.
            </p>
            <div data-extras></div>
            <button class="boton boton--contorno boton--chico" data-agregar-extra type="button">
              ${icono.mas()} Agregar extra
            </button>
          </div>

          <div class="opciones-grupo">
            <h4>Opciones para elegir</h4>
            <p class="opciones-ayuda">
              Para tamaño, salsa, sabor o tipo de tortilla. Puedes hacer una elección obligatoria
              y cobrar cantidades diferentes por cada opción.
            </p>
            <div data-grupos-opciones></div>
            <button class="boton boton--contorno boton--chico" data-agregar-grupo type="button">
              ${icono.mas()} Agregar grupo
            </button>
          </div>
        </section>
      </form>
    `,
    pie: html`<button class="boton boton--principal boton--ancho" data-guardar type="button">
      ${editando ? "Guardar cambios" : "Publicar producto"}
    </button>`,
  });

  const form = nodo.querySelector("[data-form]");
  const previa = nodo.querySelector("[data-previa]");

  const avisoFoto = nodo.querySelector("[data-aviso-foto]");
  const pintaPrevia = () => {
    pintarEn(
      previa,
      imagen.dataUrl
        ? html`<img class="previa" src="${urlSegura(imagen.dataUrl)}" alt="Vista previa" style="aspect-ratio:1" />
            <small style="display:block;color:var(--tinta-60);font-size:var(--t-xs)">
              ${imagen.ancho ? `${imagen.ancho}×${imagen.alto} px` : ""}
            </small>`
        : "",
    );
    if (avisoFoto) {
      pintarEn(avisoFoto, imagen.aviso ? html`<p class="foto-aviso">${imagen.aviso}</p>` : "");
    }
  };
  pintaPrevia();

  const sincronizaTipo = () => {
    const tipo = form.querySelector("[data-tipo]").value;
    form.querySelectorAll("[data-campos]").forEach((grupo) => {
      grupo.hidden = grupo.dataset.campos !== tipo;
    });
    const titulos = { food: "Detalles del platillo", retail: "Detalles del producto", service: "Detalles del servicio" };
    const titulo = form.querySelector("[data-titulo-detalles]");
    if (titulo) titulo.textContent = titulos[tipo] || "Detalles";
  };
  // ── Listas de quitables y extras ──
  // Se manejan en memoria y se repintan solas. Cada fila tiene su
  // botón de quitar; el estado vive aquí, no en el DOM, para que
  // repintar no pierda lo escrito.
  let quitables = Array.isArray(editando?.quitables) ? [...editando.quitables] : [];
  let extras = Array.isArray(editando?.extras)
    ? editando.extras.map((e) => ({ ...e }))
    : [];
  const idOpcion = () =>
    globalThis.crypto?.randomUUID?.() || `op-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
  let gruposOpciones = (Array.isArray(editando?.optionGroups) ? editando.optionGroups : []).map(
    (grupo) => ({
      id: grupo.id || idOpcion(),
      name: grupo.name || "",
      required: grupo.required === true,
      minSelected: Number(grupo.minSelected || 0),
      maxSelected: Math.max(1, Number(grupo.maxSelected || 1)),
      options: (Array.isArray(grupo.options) ? grupo.options : []).map((opcion) => ({
        id: opcion.id || idOpcion(),
        name: opcion.name || "",
        price: Math.max(0, Number(opcion.price) || 0),
      })),
    }),
  );

  const pintarQuitables = () => {
    const zona = form.querySelector("[data-quitables]");
    if (!zona) return;
    pintarEn(
      zona,
      quitables.length
        ? html`${quitables.map(
            (nombre, i) => html`
              <div class="opcion-fila">
                <input
                  class="opcion-nombre"
                  value="${nombre}"
                  data-quitable-idx="${i}"
                  placeholder="Cebolla"
                  maxlength="60"
                  aria-label="Ingrediente ${i + 1}"
                />
                <button class="boton boton--texto" data-quitar-quitable="${i}" type="button" aria-label="Quitar">
                  Quitar
                </button>
              </div>
            `,
          )}`
        : html`<p class="opciones-vacio">Ninguno todavía.</p>`,
    );
  };

  const pintarExtras = () => {
    const zona = form.querySelector("[data-extras]");
    if (!zona) return;
    pintarEn(
      zona,
      extras.length
        ? html`${extras.map(
            (extra, i) => html`
              <div class="opcion-fila opcion-fila--extra">
                <input
                  class="opcion-nombre"
                  value="${extra.nombre || ""}"
                  data-extra-nombre="${i}"
                  placeholder="Queso"
                  maxlength="60"
                  aria-label="Nombre del extra ${i + 1}"
                />
                <div class="opcion-precio">
                  <span>$</span>
                  <input
                    type="number"
                    min="0"
                    step="1"
                    inputmode="numeric"
                    value="${extra.precio ?? ""}"
                    data-extra-precio="${i}"
                    placeholder="10"
                    aria-label="Precio del extra ${i + 1}"
                  />
                </div>
                <button class="boton boton--texto" data-quitar-extra="${i}" type="button" aria-label="Quitar">
                  Quitar
                </button>
              </div>
            `,
          )}`
        : html`<p class="opciones-vacio">Ninguno todavía.</p>`,
    );
  };

  const pintarGruposOpciones = () => {
    const zona = form.querySelector("[data-grupos-opciones]");
    if (!zona) return;
    pintarEn(
      zona,
      gruposOpciones.length
        ? html`${gruposOpciones.map(
            (grupo, indiceGrupo) => html`
              <article class="opcion-grupo-editor">
                <div class="opcion-grupo-editor-cabeza">
                  <input
                    value="${grupo.name || ""}"
                    data-grupo-nombre="${indiceGrupo}"
                    placeholder="Ej. Elige tu salsa"
                    maxlength="60"
                    aria-label="Nombre del grupo ${indiceGrupo + 1}"
                  />
                  <button class="boton boton--texto" data-quitar-grupo="${indiceGrupo}" type="button">
                    Quitar grupo
                  </button>
                </div>
                <div class="opcion-grupo-reglas">
                  <label class="opcion-check opcion-check--extra">
                    <input type="checkbox" data-grupo-obligatorio="${indiceGrupo}" ${grupo.required ? "checked" : ""} />
                    <span>Obligatorio</span>
                  </label>
                  <label class="campo">
                    <span>Mínimo</span>
                    <input type="number" min="0" max="20" value="${grupo.minSelected || 0}" data-grupo-min="${indiceGrupo}" />
                  </label>
                  <label class="campo">
                    <span>Máximo</span>
                    <input type="number" min="1" max="20" value="${grupo.maxSelected || 1}" data-grupo-max="${indiceGrupo}" />
                  </label>
                </div>
                <div class="opcion-grupo-lista">
                  ${grupo.options.length
                    ? grupo.options.map(
                        (opcion, indiceOpcion) => html`
                          <div class="opcion-fila opcion-fila--extra">
                            <input
                              class="opcion-nombre"
                              value="${opcion.name || ""}"
                              data-grupo-opcion-nombre="${indiceGrupo}:${indiceOpcion}"
                              placeholder="Ej. Salsa verde"
                              maxlength="60"
                              aria-label="Opción ${indiceOpcion + 1}"
                            />
                            <div class="opcion-precio">
                              <span>+$</span>
                              <input
                                type="number"
                                min="0"
                                step="1"
                                inputmode="numeric"
                                value="${opcion.price || 0}"
                                data-grupo-opcion-precio="${indiceGrupo}:${indiceOpcion}"
                                aria-label="Precio adicional"
                              />
                            </div>
                            <button
                              class="boton boton--texto"
                              data-quitar-grupo-opcion="${indiceGrupo}:${indiceOpcion}"
                              type="button"
                            >Quitar</button>
                          </div>
                        `,
                      )
                    : html`<p class="opciones-vacio">Agrega al menos una opción.</p>`}
                </div>
                <button class="boton boton--contorno boton--chico" data-agregar-grupo-opcion="${indiceGrupo}" type="button">
                  ${icono.mas()} Agregar opción
                </button>
              </article>
            `,
          )}`
        : html`<p class="opciones-vacio">Este producto todavía no pide elecciones.</p>`,
    );
  };

  // Se lee del DOM al vuelo: así lo escrito nunca se pierde al repintar.
  const leerListas = () => {
    form.querySelectorAll("[data-quitable-idx]").forEach((input) => {
      quitables[Number(input.dataset.quitableIdx)] = input.value.trim();
    });
    form.querySelectorAll("[data-extra-nombre]").forEach((input) => {
      const i = Number(input.dataset.extraNombre);
      extras[i] = extras[i] || {};
      extras[i].nombre = input.value.trim();
    });
    form.querySelectorAll("[data-extra-precio]").forEach((input) => {
      const i = Number(input.dataset.extraPrecio);
      extras[i] = extras[i] || {};
      extras[i].precio = Number(input.value) || 0;
    });
  };

  const leerGruposOpciones = () => {
    form.querySelectorAll("[data-grupo-nombre]").forEach((input) => {
      gruposOpciones[Number(input.dataset.grupoNombre)].name = input.value.trim();
    });
    form.querySelectorAll("[data-grupo-obligatorio]").forEach((input) => {
      gruposOpciones[Number(input.dataset.grupoObligatorio)].required = input.checked;
    });
    form.querySelectorAll("[data-grupo-min]").forEach((input) => {
      gruposOpciones[Number(input.dataset.grupoMin)].minSelected = Math.max(0, Number(input.value) || 0);
    });
    form.querySelectorAll("[data-grupo-max]").forEach((input) => {
      gruposOpciones[Number(input.dataset.grupoMax)].maxSelected = Math.max(1, Number(input.value) || 1);
    });
    form.querySelectorAll("[data-grupo-opcion-nombre]").forEach((input) => {
      const [g, o] = input.dataset.grupoOpcionNombre.split(":").map(Number);
      gruposOpciones[g].options[o].name = input.value.trim();
    });
    form.querySelectorAll("[data-grupo-opcion-precio]").forEach((input) => {
      const [g, o] = input.dataset.grupoOpcionPrecio.split(":").map(Number);
      gruposOpciones[g].options[o].price = Math.max(0, Number(input.value) || 0);
    });
  };

  nodo.querySelector("[data-agregar-quitable]")?.addEventListener("click", () => {
    leerListas();
    quitables.push("");
    pintarQuitables();
    form.querySelector(`[data-quitable-idx="${quitables.length - 1}"]`)?.focus();
  });

  nodo.querySelector("[data-agregar-extra]")?.addEventListener("click", () => {
    leerListas();
    extras.push({ nombre: "", precio: 0 });
    pintarExtras();
    form.querySelector(`[data-extra-nombre="${extras.length - 1}"]`)?.focus();
  });

  nodo.querySelector("[data-agregar-grupo]")?.addEventListener("click", () => {
    leerGruposOpciones();
    gruposOpciones.push({
      id: idOpcion(),
      name: "",
      required: true,
      minSelected: 1,
      maxSelected: 1,
      options: [],
    });
    pintarGruposOpciones();
    form.querySelector(`[data-grupo-nombre="${gruposOpciones.length - 1}"]`)?.focus();
  });

  delegar(nodo, "click", "[data-quitar-quitable]", (_ev, boton) => {
    leerListas();
    quitables.splice(Number(boton.dataset.quitarQuitable), 1);
    pintarQuitables();
  });

  delegar(nodo, "click", "[data-quitar-extra]", (_ev, boton) => {
    leerListas();
    extras.splice(Number(boton.dataset.quitarExtra), 1);
    pintarExtras();
  });

  delegar(nodo, "click", "[data-quitar-grupo]", (_ev, boton) => {
    leerGruposOpciones();
    gruposOpciones.splice(Number(boton.dataset.quitarGrupo), 1);
    pintarGruposOpciones();
  });

  delegar(nodo, "click", "[data-agregar-grupo-opcion]", (_ev, boton) => {
    leerGruposOpciones();
    const indice = Number(boton.dataset.agregarGrupoOpcion);
    gruposOpciones[indice].options.push({ id: idOpcion(), name: "", price: 0 });
    pintarGruposOpciones();
    const ultimo = gruposOpciones[indice].options.length - 1;
    form.querySelector(`[data-grupo-opcion-nombre="${indice}:${ultimo}"]`)?.focus();
  });

  delegar(nodo, "click", "[data-quitar-grupo-opcion]", (_ev, boton) => {
    leerGruposOpciones();
    const [g, o] = boton.dataset.quitarGrupoOpcion.split(":").map(Number);
    gruposOpciones[g].options.splice(o, 1);
    pintarGruposOpciones();
  });

  pintarQuitables();
  pintarExtras();
  pintarGruposOpciones();

  const sincronizaDescuento = () => {
    const valor = form.querySelector("[data-descuento]").value;
    const campo = form.querySelector("[data-descuento-valor]");
    campo.hidden = valor === "none";
    if (valor === "percent") {
      form.querySelector("[data-descuento-etiqueta]").textContent = "¿Qué porcentaje?";
      form.querySelector("[data-descuento-ayuda]").textContent =
        "Ej. 10 = el cliente paga 10% menos.";
    } else if (valor === "amount") {
      form.querySelector("[data-descuento-etiqueta]").textContent = "¿Cuántos pesos de rebaja?";
      form.querySelector("[data-descuento-ayuda]").textContent =
        "Ej. 15 = el precio baja $15.";
    }
  };
  sincronizaTipo();
  sincronizaDescuento();

  form.querySelector("[data-tipo]").addEventListener("change", sincronizaTipo);
  form.querySelector("[data-descuento]").addEventListener("change", sincronizaDescuento);

  form.querySelector("[data-imagen]").addEventListener("change", async (ev) => {
    try {
      imagen = await leerImagen(ev.target.files[0], MEDIDAS_IMAGEN.producto);
      pintaPrevia();
    } catch (error) {
      ev.target.value = "";
      toast(error, "error");
    }
  });

  nodo.querySelector("[data-guardar]").addEventListener("click", async (ev) => {
    // ev.currentTarget deja de existir después de un await; si la subida
    // fallaba, el catch tocaba null y reventaba ENCIMA del error real.
    const boton = ev.currentTarget;
    const datos = Object.fromEntries(new FormData(form));
    if (!datos.title?.trim() || !datos.description?.trim() || !Number(datos.price)) {
      toast("Faltan nombre, descripción o precio.", "error");
      return;
    }
    boton.disabled = true;
    boton.textContent = "Guardando...";
    try {
      leerListas();
      leerGruposOpciones();
      for (const grupo of gruposOpciones) {
        if (!grupo.name || !grupo.options.length || grupo.options.some((opcion) => !opcion.name)) {
          throw new Error("Cada grupo necesita nombre y al menos una opción con nombre.");
        }
        if (grupo.required) grupo.minSelected = Math.max(1, grupo.minSelected);
        if (grupo.maxSelected < grupo.minSelected || grupo.maxSelected > grupo.options.length) {
          throw new Error(`Revisa el mínimo y máximo de “${grupo.name}”.`);
        }
      }
      const guardado = await repo.guardarProducto({
        quitables: quitables.map((q) => q.trim()).filter(Boolean),
        extras: extras
          .filter((e) => e.nombre?.trim())
          .map((e) => ({ nombre: e.nombre.trim(), precio: Math.max(0, Number(e.precio) || 0) })),
        optionGroups: gruposOpciones.map((grupo) => ({
          id: grupo.id,
          name: grupo.name.trim(),
          required: grupo.required,
          minSelected: grupo.minSelected,
          maxSelected: grupo.maxSelected,
          options: grupo.options.map((opcion) => ({
            id: opcion.id,
            name: opcion.name.trim(),
            price: Math.max(0, Number(opcion.price) || 0),
          })),
        })),
        id: editando?.id,
        storeId: tienda.id,
        ...datos,
        price: Number(datos.price),
        discountValue: datos.discountType === "none" ? 0 : Number(datos.discountValue || 0),
        stock: datos.stock === "" ? "" : Number(datos.stock),
        image: imagen.dataUrl || editando?.image || imagenPorCategoria(tienda.category),
        imageFile: imagen.file,
        featuredUntil: editando?.featuredUntil || "",
        isActive: true,
      });
      toast(editando ? "Producto actualizado." : "Producto publicado.");
      if (guardado?.avisoFoto) {
        toast(`El producto quedó, pero la foto no: ${guardado.avisoFoto}`, "error");
      }
      if (guardado?.avisoExtras) {
        toast(guardado.avisoExtras, "error");
      }
      editando = null;
      imagen = { dataUrl: "", file: null };
      cerrar();
      vistaPanel(contenedor);
    } catch (error) {
      toast(error, "error");
      boton.disabled = false;
      boton.textContent = editando ? "Guardar cambios" : "Publicar producto";
    }
  });
}

// ---------- Contactos ----------

function pintarContactos({ panel, tienda, leads, contenedor }) {
  pintarEn(
    panel,
    html`
      <div class="seccion-cabeza">
        <div>
          <h2>Contactos recibidos</h2>
          <p>Cada WhatsApp que te generamos descuenta uno</p>
        </div>
        ${leads.length ? html`<button class="boton boton--texto" data-csv type="button">Descargar CSV</button>` : ""}
      </div>

      ${leads.length
        ? html`
            <div class="tabla-envoltura">
              <table class="tabla">
                <thead>
                  <tr><th>Cuándo</th><th>Total del pedido</th><th>Cobrado</th><th>Contactos restantes</th></tr>
                </thead>
                <tbody>
                  ${leads.map(
                    (lead) => html`
                      <tr>
                        <td>${fechaHora(lead.createdAt)}</td>
                        <td>${dinero(lead.total)}</td>
                        <td>${lead.billable ? "Sí" : "No (sin saldo)"}</td>
                        <td>${lead.creditAfter ?? "—"}</td>
                      </tr>
                    `,
                  )}
                </tbody>
              </table>
            </div>
          `
        : vacio({
            titulo: "Todavía no hay contactos",
            texto: "Un contacto es un cliente real que te escribió por WhatsApp desde la app.",
            accion: html`<button class="boton boton--contorno" data-tab="resumen" type="button">Ver mi link</button>`,
          })}
    `,
  );

  panel.querySelector("[data-csv]")?.addEventListener("click", () => {
    const filas = [["fecha", "total_pedido", "cobrado", "contactos_restantes"]];
    leads.forEach((l) =>
      filas.push([fechaHora(l.createdAt), l.total, l.billable ? "si" : "no", l.creditAfter ?? ""]),
    );
    descargar(`contactos-${tienda.slug || tienda.id}.csv`, csv(filas));
  });
}

// ---------- Promoción y recargas ----------

async function pintarPromocion({ panel, tienda, contenedor }) {
  let config = {};
  let pagos = [];
  try {
    [config, pagos] = await Promise.all([repo.configCobro(), repo.misPagos()]);
  } catch (error) {
    console.error("No se pudieron cargar planes y pagos", error);
    pintarEn(
      panel,
      vacio({
        titulo: "No pudimos cargar los planes",
        texto: "Revisa tu conexión e inténtalo nuevamente. Tus pagos y beneficios no cambian por este error.",
        accion: html`<button class="boton boton--contorno" data-tab="promocion" type="button">Reintentar</button>`,
      }),
    );
    return;
  }

  // La plataforma solo acepta cobros confirmados por Clip. Los reportes
  // manuales antiguos se conservan en la base como historial, pero ya no se
  // muestran ni bloquean el flujo actual.
  pagos = pagos.filter((x) => x.metodo === "clip" && x.idempotency_key);
  const precioPresencia = config.subscriptionPrices?.presencia || 99;
  const precioDestacado = config.subscriptionPrices?.destacado || 200;

  const pendiente = pagos.find((x) => x.estado === "por_verificar");
  const rechazado = pagos.find((x) => x.estado === "rechazado");
  const dias = tienda.subscribedUntil
    ? Math.ceil((new Date(tienda.subscribedUntil) - Date.now()) / 86400000)
    : 0;

  pintarEn(
    panel,
    html`
      <section class="tarjeta">
        <h2 style="font-size:var(--t-lg)">Tu plan</h2>
        <div class="plan-estado">
          <div>
            <strong>${tienda.plan === "destacado" ? "Destacado" : "Presencia"}</strong>
            <small>
              ${tienda.subStatus === "prueba"
                ? `Prueba gratis · ${dias} día${dias === 1 ? "" : "s"} restantes`
                : dias > 0
                  ? `Activo hasta el ${fechaCorta(tienda.subscribedUntil)}`
                  : "Vencido"}
            </small>
          </div>
          ${tienda.plan === "destacado"
            ? html`<span class="sello sello--destacado">${icono.estrella()} Destacado</span>`
            : ""}
        </div>
      </section>

      ${pendiente
        ? html`
            <div class="banner banner--info" style="margin-top:var(--e-3)">
              <strong>Clip todavía no confirma este pago.</strong>
              ${descripcionPago(pendiente)} por ${dinero(pendiente.monto)}.
              Si cerraste o cancelaste el pago, no se activará ninguna compra.
              <button class="banner-accion" data-revisar-clip="${pendiente.id}" type="button">Revisar estado ahora</button>
            </div>
          `
        : ""}

      ${rechazado && !pendiente
        ? html`
            <div class="banner banner--error" style="margin-top:var(--e-3)">
              <strong>Tu último pago no se pudo confirmar.</strong>
              ${rechazado.motivo_rechazo || "Clip informó que el pago no se completó."}
              Si el cargo aparece en tu cuenta, contáctanos antes de volver a pagar para evitar un cobro duplicado.
            </div>
          `
        : ""}

      <section style="margin-top:var(--e-5)">
        <div class="seccion-cabeza">
          <div>
            <h2>Planes</h2>
            <p>Sin comisión por venta. Nunca cobramos un porcentaje de lo que vendes.</p>
          </div>
        </div>

        <div class="planes">
          ${planTarjeta({
            id: "presencia",
            titulo: "Presencia",
            precio: precioPresencia,
            actual: tienda.plan === "presencia" && tienda.subStatus === "activa",
            puntos: [
              "Contactos ilimitados",
              "Productos ilimitados",
              "Apareces por cercanía",
              "Tu link para compartir",
            ],
          })}
          ${planTarjeta({
            id: "destacado",
            titulo: "Destacado",
            precio: precioDestacado,
            destacado: true,
            actual: tienda.plan === "destacado" && tienda.subStatus === "activa",
            puntos: [
              "Todo lo de Presencia",
              "Primeros lugares del inicio",
              "Insignia de destacado",
              `Único destacado en ${tienda.category || "tu categoría"}`,
            ],
          })}
        </div>
      </section>

      ${tienda.plan !== "destacado"
        ? html`
            <section class="tarjeta" style="margin-top:var(--e-5)">
              <h2 style="font-size:var(--t-lg)">Destaca tu tienda</h2>
              <p style="color:var(--tinta-60);font-size:var(--t-sm)">
                Aparece en primeros lugares por ${config.storeFeatureDays || 7} días.
                ${dinero(config.storeFeaturePrice || 50)} · pago único con Clip.
              </p>
              ${estaPromocionadoTienda(tienda)
                ? html`<span class="sello sello--destacado">${icono.estrella()} Tu tienda está destacada</span>`
                : html`<button class="boton boton--principal boton--chico" data-destacar-tienda type="button">
                    ${icono.estrella()} Destacar mi tienda · ${dinero(config.storeFeaturePrice || 50)}
                  </button>`}
            </section>
          `
        : ""}

      <section class="tarjeta" style="margin-top:var(--e-5)">
        <h2 style="font-size:var(--t-lg)">Cómo pagar</h2>
        ${datosDePago(config)}
      </section>

      ${pagos.length
        ? html`
            <section style="margin-top:var(--e-5)">
              <div class="seccion-cabeza"><h2>Tus pagos</h2></div>
              <div class="menu-lista" style="grid-template-columns:1fr">
                ${pagos.map(
                  (x) => html`
                    <div class="envio-fila">
                      <div class="envio-fila-info">
                        <strong>${dinero(x.monto)} · ${descripcionPago(x)}</strong>
                        <small>
                          ${fechaCorta(x.creado_en)} · ${etiquetaMetodo(x.metodo)}${x.referencia ? ` · ${x.referencia}` : ""}
                        </small>
                      </div>
                      <div class="envio-fila-acciones">
                        ${selloPago(x.estado)}
                        ${x.metodo === "clip" && x.estado === "por_verificar"
                          ? html`<button class="boton boton--contorno boton--chico" data-revisar-clip="${x.id}" type="button">
                              Revisar estado
                            </button>`
                          : ""}
                      </div>
                    </div>
                  `,
                )}
              </div>
            </section>
          `
        : ""}
    `,
  );

  delegar(panel, "click", "[data-pagar]", (_ev, boton) => {
    abrirPagoSuscripcion(boton.dataset.pagar, config, contenedor);
  });

  delegar(panel, "click", "[data-copiar]", async (_ev, boton) => {
    const ok = await copiar(boton.dataset.copiar);
    toast(ok ? "CLABE copiada." : "No se pudo copiar. Selecciónala a mano.", ok ? "ok" : "error");
  });

  delegar(panel, "click", "[data-destacar-tienda]", () => {
    abrirPagoDestacado({
      purchaseType: "store_feature",
      contenedor,
      titulo: "Destacar mi tienda",
      descripcion: "Tu tienda aparecerá en primeros lugares durante 7 días.",
      monto: config.storeFeaturePrice,
    });
  });

  // La consulta se hace con la sesion del propietario. La Edge Function
  // valida nuevamente que el pago pertenezca a su negocio antes de llamar a Clip.
  delegar(panel, "click", "[data-revisar-clip]", async (_ev, boton) => {
    const texto = boton.textContent;
    boton.disabled = true;
    boton.textContent = "Consultando…";
    try {
      const resultado = await repo.estadoPagoClip(boton.dataset.revisarClip);
      if (resultado.estado === "verificado") {
        toast("Clip confirmo el pago y la compra ya fue aplicada.");
      } else if (resultado.estado === "rechazado") {
        toast(resultado.motivo_rechazo || "Clip informo que el pago no se completo.", "error");
      } else if (resultado.applied?.amount_mismatch) {
        toast("Clip reportó un monto distinto. La compra no se aplicó.", "error");
      } else if (resultado.applied?.category_conflict) {
        toast("Clip confirmó el pago, pero la categoría acaba de ocuparse. El operador revisará tu compra.", "error");
      } else if (resultado.applied?.category_changed) {
        toast("Clip confirmó el pago, pero la categoría cambió después de crear el enlace. El operador revisará tu compra.", "error");
      } else if (resultado.verificationWarning) {
        toast(resultado.verificationWarning, "error");
      } else {
        toast("Clip todavía muestra este pago como pendiente.");
      }
      await pintarPromocion({ panel, tienda, contenedor });
    } catch (error) {
      toast(error, "error");
      boton.disabled = false;
      boton.textContent = texto;
    }
  });

}

function descripcionPago(pago) {
  if (pago.purchase_type === "store_feature") return `Tienda destacada · ${pago.promo_days || 7} días`;
  if (pago.purchase_type === "product_feature") {
    return `${pago.product_title || "Producto"} destacado · ${pago.promo_days || 7} días`;
  }
  return `${pago.plan === "destacado" ? "Destacado" : "Presencia"} · ${pago.meses} mes${pago.meses === 1 ? "" : "es"}`;
}

function planTarjeta({ id, titulo, precio, puntos, destacado = false, actual = false }) {
  return html`
    <div class="plan ${destacado ? "plan--destacado" : ""} ${actual ? "plan--actual" : ""}">
      ${actual ? html`<span class="plan-etiqueta">Tu plan actual</span>` : ""}
      <h3>${titulo}</h3>
      <div class="plan-precio">
        <strong>${dinero(precio)}</strong>
        <small>al mes</small>
      </div>
      <ul class="plan-puntos">
        ${puntos.map((p) => html`<li>${icono.check()} ${p}</li>`)}
      </ul>
      <button
        class="boton ${destacado ? "boton--principal" : "boton--contorno"} boton--ancho"
        data-pagar="${id}"
        type="button"
      >
        ${actual ? "Renovar" : "Contratar"}
      </button>
    </div>
  `;
}

/** Los datos de cobro. Si el operador no los llenó, se dice claro. */
// ¿La tienda tiene un destacado vigente? (columna featured_until)
function estaPromocionadoTienda(tienda) {
  return tienda.featuredUntil && new Date(tienda.featuredUntil) > new Date();
}

function datosDePago(config) {
  const clipAutomatico = repo.modo() === "nube";
  const hay = clipAutomatico;
  if (!hay) {
    return html`<p style="color:var(--tinta-60);font-size:var(--t-sm)">
      Todavía no hay datos de pago configurados. Escríbenos y te decimos cómo pagar.
    </p>`;
  }
  return html`
    <div class="pago-opciones">
      ${clipAutomatico
        ? html`
            <div class="pago-opcion">
              <strong>Pago automático con Clip</strong>
              <small>Elige Contratar o Renovar en tu plan. Solo se activa cuando Clip confirma el pago.</small>
            </div>
          `
        : ""}
      ${false && config.clabe
        ? html`
            <div class="pago-opcion">
              <strong>Transferencia</strong>
              <div class="pago-dato">
                <span>CLABE</span>
                <code>${config.clabe}</code>
                <button class="boton boton--texto" data-copiar="${config.clabe}" type="button">Copiar</button>
              </div>
              ${config.banco ? html`<small>${config.banco}${config.titular ? ` · ${config.titular}` : ""}</small>` : ""}
            </div>
          `
        : ""}
      ${false && config.aceptaEfectivo
        ? html`
            <div class="pago-opcion">
              <strong>Efectivo</strong>
              <small>
                Págalo en persona${config.whatsappSoporte ? ` o escríbenos al ${config.whatsappSoporte}` : ""}.
              </small>
            </div>
          `
        : ""}
    </div>
    ${false && config.instrucciones
      ? html`<p class="pago-instrucciones">${config.instrucciones}</p>`
      : ""}
  `;
}

function abrirPagoDestacado({ purchaseType, productId = null, titulo, descripcion, monto, contenedor }) {
  const { nodo, cerrar } = abrirHoja({
    titulo,
    cuerpo: html`
      <p style="color:var(--tinta-60);font-size:var(--t-sm);margin-bottom:var(--e-3)">
        ${descripcion}
      </p>
      <div class="plan-precio">
        <strong>${dinero(monto)}</strong>
        <small>pago único</small>
      </div>
      <div class="banner banner--info" style="margin-top:var(--e-3)">
        Solo se activará cuando Clip confirme el pago. Si cierras o cancelas, no cambia nada.
      </div>
    `,
    pie: html`<button class="boton boton--principal boton--ancho" data-iniciar-destacado type="button">
      Continuar a Clip
    </button>`,
  });
  const idempotencyKey = crypto.randomUUID();

  nodo.querySelector("[data-iniciar-destacado]").addEventListener("click", async (ev) => {
    const boton = ev.currentTarget;
    boton.disabled = true;
    boton.textContent = "Creando pago seguro...";
    try {
      const pago = await repo.iniciarPagoClip({
        purchaseType,
        productId,
        idempotencyKey,
      });
      if (pago?.estado === "verificado") {
        cerrar();
        toast("Ese pago ya estaba confirmado. Actualizamos tu panel.");
        await vistaPanel(contenedor);
        return;
      }
      if (!/^https:\/\//i.test(pago?.checkoutUrl || "")) throw new Error("Clip no devolvió un enlace válido.");
      location.assign(pago.checkoutUrl);
    } catch (error) {
      toast(error.message, "error");
      boton.disabled = false;
      boton.textContent = "Continuar a Clip";
    }
  });
}

/** Checkout automático de suscripciones con tarjeta. */
function abrirPagoSuscripcion(plan, config, contenedor) {
  const precio = Number(config.subscriptionPrices?.[plan]) || (plan === "destacado" ? 200 : 99);
  const hayManual = false;
  const { nodo, cerrar } = abrirHoja({
    titulo: `Pagar plan ${plan === "destacado" ? "Destacado" : "Presencia"}`,
    cuerpo: html`
      <p style="color:var(--tinta-60);font-size:var(--t-sm);margin-bottom:var(--e-3)">
        Clip confirmará el resultado directamente con PuebloPedidos. Regresarás aquí al terminar.
      </p>
      <label class="campo">
        <span>Duración</span>
        <select data-meses-clip>
          <option value="1">1 mes · ${dinero(precio)}</option>
          <option value="3">3 meses · ${dinero(precio * 3)}</option>
          <option value="6">6 meses · ${dinero(precio * 6)}</option>
          <option value="12">12 meses · ${dinero(precio * 12)}</option>
        </select>
      </label>
      <div class="banner banner--info" style="margin-top:var(--e-3)">
        Si Clip rechaza, cancela o deja vencer el pago, no se activa ningún plan.
      </div>
    `,
    pie: html`
      <div style="display:grid;gap:var(--e-2);width:100%">
        <button class="boton boton--principal boton--ancho" data-iniciar-clip type="button">
          Continuar a Clip
        </button>
        ${hayManual
          ? html`<button class="boton boton--texto boton--ancho" data-pago-manual type="button">
              Pagar por transferencia o efectivo
            </button>`
          : ""}
      </div>
    `,
  });

  // Se conserva durante todos los reintentos de esta misma hoja. Si la red
  // corta la respuesta, el servidor devuelve el checkout ya creado.
  const idempotencyKey = crypto.randomUUID();

  nodo.querySelector("[data-iniciar-clip]").addEventListener("click", async (ev) => {
    const boton = ev.currentTarget;
    const meses = Number(nodo.querySelector("[data-meses-clip]").value) || 1;
    boton.disabled = true;
    boton.textContent = "Creando pago seguro...";
    try {
      const pago = await repo.iniciarPagoClip({
        plan,
        meses,
        idempotencyKey,
      });
      if (pago?.estado === "verificado") {
        cerrar();
        toast("Ese pago ya estaba confirmado. Actualizamos tu panel.");
        await vistaPanel(contenedor);
        return;
      }
      if (!/^https:\/\//i.test(pago?.checkoutUrl || "")) throw new Error("Clip no devolvió un enlace válido.");
      location.assign(pago.checkoutUrl);
    } catch (error) {
      toast(error.message, "error");
      boton.disabled = false;
      boton.textContent = "Continuar a Clip";
    }
  });

  nodo.querySelector("[data-pago-manual]")?.addEventListener("click", () => {
    cerrar();
    abrirReportePago(plan, config, contenedor);
  });
}

/** Hoja para reportar el pago ya hecho. */
function abrirReportePago(plan, config, contenedor) {
  const precio = Number(config.subscriptionPrices?.[plan]) || (plan === "destacado" ? 200 : 99);
  const { nodo, cerrar } = abrirHoja({
    titulo: `Reportar pago · ${plan === "destacado" ? "Destacado" : "Presencia"}`,
    cuerpo: html`
      <p style="color:var(--tinta-60);font-size:var(--t-sm);margin-bottom:var(--e-3)">
        Primero haz el pago, y luego repórtalo aquí. Lo confirmamos y tu plan se activa solo.
      </p>

      <form data-form-pago novalidate>
        <label class="campo">
          <span>¿Cuántos meses pagaste?</span>
          <select name="meses" data-meses>
            <option value="1">1 mes · ${dinero(precio)}</option>
            <option value="3">3 meses · ${dinero(precio * 3)}</option>
            <option value="6">6 meses · ${dinero(precio * 6)}</option>
            <option value="12">12 meses · ${dinero(precio * 12)}</option>
          </select>
        </label>

        <label class="campo">
          <span>¿Cómo pagaste?</span>
          <select name="metodo">
            ${config.clabe ? html`<option value="transferencia">Transferencia</option>` : ""}
            ${config.aceptaEfectivo ? html`<option value="efectivo">Efectivo</option>` : ""}
            <option value="otro">Otro</option>
          </select>
        </label>

        <label class="campo">
          <span>Referencia o folio</span>
          <input name="referencia" placeholder="Ej. 0012345678" maxlength="60" />
          <small>Lo que salga en tu comprobante. Nos ayuda a encontrar tu pago rápido.</small>
        </label>

        <label class="campo">
          <span>Nota (opcional)</span>
          <textarea name="nota" maxlength="200" placeholder="Ej. lo pagué en el OXXO de la plaza"></textarea>
        </label>
      </form>
    `,
    pie: html`<button class="boton boton--principal boton--ancho" data-enviar-pago type="button">
      Ya pagué, reportarlo
    </button>`,
  });

  nodo.querySelector("[data-enviar-pago]").addEventListener("click", async (ev) => {
    const form = nodo.querySelector("[data-form-pago]");
    const datos = Object.fromEntries(new FormData(form));
    const boton = ev.currentTarget;
    boton.disabled = true;
    boton.textContent = "Enviando...";
    try {
      await repo.reportarPago({
        plan,
        meses: Number(datos.meses) || 1,
        metodo: datos.metodo || "otro",
        referencia: datos.referencia,
        nota: datos.nota,
      });
      toast("Recibimos tu reporte. En cuanto confirmemos el pago se activa tu plan.");
      cerrar();
      vistaPanel(contenedor);
    } catch (error) {
      toast(error, "error");
      boton.disabled = false;
      boton.textContent = "Ya pagué, reportarlo";
    }
  });
}

function etiquetaMetodo(m) {
  return { clip: "En línea", transferencia: "Transferencia", efectivo: "Efectivo" }[m] || "Otro";
}

function selloPago(estado) {
  const mapa = {
    por_verificar: ["sello--promo", "Confirmación pendiente"],
    verificado: ["sello--abierto", "Confirmado"],
    rechazado: ["sello--cerrado", "No confirmado"],
  };
  const [clase, texto] = mapa[estado] || ["sello--modo", estado];
  return html`<span class="sello ${clase}">${texto}</span>`;
}

// ---------- Perfil del negocio ----------

function pintarPerfil({ panel, tienda, contenedor }) {
  let nuevoLogo = { dataUrl: "", file: null };
  let nuevaPortada = { dataUrl: "", file: null };

  pintarEn(
    panel,
    html`
      <form class="tarjeta" data-form novalidate>
        <div class="campos-2">
          <label class="campo">
            <span>Nombre del negocio</span>
            <input name="name" value="${tienda.name}" required />
          </label>
          <label class="campo">
            <span>Categoría</span>
            <select name="category">
              ${CATEGORIAS.map((c) => html`<option value="${c}" ${c === tienda.category ? "selected" : ""}>${c}</option>`)}
            </select>
          </label>
        </div>
        <div class="campos-2">
          <label class="campo">
            <span>Quién atiende</span>
            <input name="owner" value="${tienda.owner || ""}" />
          </label>
          <label class="campo">
            <span>WhatsApp</span>
            <input name="phone" type="tel" inputmode="numeric" value="${tienda.phone || ""}" required />
          </label>
        </div>
        <label class="campo">
          <span>Dirección</span>
          <div data-campo-direccion-perfil></div>
        </label>
        <div class="ubicacion-bloque">
          <button class="boton boton--contorno boton--chico" data-ubicar-negocio type="button">
            ${icono.cercania()} Usar ubicación del local
          </button>
          ${tienda.coords
            ? html`<a class="boton boton--texto" href="${linkMapa(tienda.coords.lat, tienda.coords.lng)}" target="_blank" rel="noopener">
                Verificar punto actual
              </a>`
            : ""}
          <p class="ubicacion-estado" data-ubicacion-negocio></p>
        </div>
        <label class="campo">
          <span>Cómo entregas</span>
          <select name="serviceModes">
            <option value="both" ${tienda.serviceModes === "both" ? "selected" : ""}>Entrega y recoger</option>
            <option value="delivery" ${tienda.serviceModes === "delivery" ? "selected" : ""}>Solo entrega</option>
            <option value="pickup" ${tienda.serviceModes === "pickup" ? "selected" : ""}>Solo recoger</option>
          </select>
        </label>
        <label class="campo">
          <span>Minutos de preparación</span>
          <input name="prepMinutes" type="number" min="5" max="90" step="5" value="${tienda.prepMinutes || 15}" />
          <small>Con esto calculamos el tiempo estimado que ve el cliente.</small>
        </label>
        <label class="campo">
          <span>Descripción</span>
          <textarea name="description">${tienda.description || ""}</textarea>
        </label>
        <div class="fotos-fila perfil-fotos">
          <div class="foto-subir">
            <span class="foto-etiqueta">Logo</span>
            <label class="foto-caja foto-caja--logo">
              <input type="file" accept="image/jpeg,image/png,image/webp" data-logo aria-label="Cambiar logo" />
              <span class="foto-vista">
                ${tienda.image
                  ? html`<img src="${urlSegura(tienda.image)}" data-previa-logo alt="Vista previa del logo" />`
                  : html`<span class="foto-vacia" data-previa-logo>${icono.mas()}<strong>Subir logo</strong></span>`}
              </span>
            </label>
            <div class="foto-pie" data-info-logo>Cuadrado · se centra sin recortar.</div>
          </div>
          <div class="foto-subir">
            <span class="foto-etiqueta">Portada</span>
            <label class="foto-caja foto-caja--portada">
              <input type="file" accept="image/jpeg,image/png,image/webp" data-portada aria-label="Cambiar portada" />
              <span class="foto-vista">
                ${tienda.cover
                  ? html`<img src="${urlSegura(tienda.cover)}" data-previa-portada alt="Vista previa de la portada" />`
                  : html`<span class="foto-vacia" data-previa-portada>${icono.mas()}<strong>Subir portada</strong></span>`}
              </span>
            </label>
            <div class="foto-pie" data-info-portada>Horizontal 16:9 · se recorta al centro.</div>
          </div>
        </div>
        <button class="boton boton--principal boton--ancho" type="submit">Guardar cambios</button>
      </form>
    `,
  );

  let coordsPerfil = tienda.coords || null;
  const direccionPerfil = campoDireccion(panel.querySelector("[data-campo-direccion-perfil]"), {
    valor: tienda.address || "",
    coords: tienda.coords || null,
    alElegir(_direccion, coords) {
      coordsPerfil = coords;
    },
    alEditar() {
      coordsPerfil = null;
    },
  });
  panel.querySelector("[data-ubicar-negocio]").addEventListener("click", async (ev) => {
    const boton = ev.currentTarget;
    const aviso = panel.querySelector("[data-ubicacion-negocio]");
    boton.disabled = true;
    boton.textContent = "Buscando...";
    try {
      const punto = await ubicacionActual();
      const detectada = await direccionDesdeCoords(punto.lat, punto.lng);
      coordsPerfil = { lat: punto.lat, lng: punto.lng };
      direccionPerfil.establecer(detectada?.linea || direccionPerfil.direccion(), coordsPerfil);
      aviso.textContent = punto.precision > 100
        ? `Punto aproximado (±${punto.precision} m). Confírmalo con el enlace después de guardar.`
        : "Punto exacto listo para guardar.";
      aviso.className = `ubicacion-estado ${punto.precision > 100 ? "ubicacion-estado--aviso" : "ubicacion-estado--listo"}`;
    } catch (error) {
      aviso.textContent = error.message;
      aviso.className = "ubicacion-estado ubicacion-estado--error";
    } finally {
      boton.disabled = false;
      pintarEn(boton, html`${icono.cercania()} Usar ubicación del local`);
    }
  });

  panel.querySelector("[data-logo]").addEventListener("change", async (ev) => {
    try {
      nuevoLogo = await leerImagen(ev.target.files[0], MEDIDAS_IMAGEN.logo);
      pintarEn(
        panel.querySelector("[data-previa-logo]")?.parentElement,
        html`<img src="${urlSegura(nuevoLogo.dataUrl)}" data-previa-logo alt="Vista previa del logo" />`,
      );
      panel.querySelector("[data-info-logo]").textContent =
        `${nuevoLogo.ancho}×${nuevoLogo.alto} px${nuevoLogo.aviso ? ` · ${nuevoLogo.aviso}` : " · Lista para subir"}`;
    } catch (error) {
      ev.target.value = "";
      toast(error.message, "error");
    }
  });
  panel.querySelector("[data-portada]").addEventListener("change", async (ev) => {
    try {
      nuevaPortada = await leerImagen(ev.target.files[0], MEDIDAS_IMAGEN.portada);
      pintarEn(
        panel.querySelector("[data-previa-portada]")?.parentElement,
        html`<img src="${urlSegura(nuevaPortada.dataUrl)}" data-previa-portada alt="Vista previa de la portada" />`,
      );
      panel.querySelector("[data-info-portada]").textContent =
        `${nuevaPortada.ancho}×${nuevaPortada.alto} px${nuevaPortada.aviso ? ` · ${nuevaPortada.aviso}` : " · Lista para subir"}`;
    } catch (error) {
      ev.target.value = "";
      toast(error.message, "error");
    }
  });

  panel.querySelector("[data-form]").addEventListener("submit", async (ev) => {
    ev.preventDefault();
    const datos = Object.fromEntries(new FormData(ev.currentTarget));
    try {
      await repo.actualizarPerfil({
        ...datos,
        prepMinutes: Number(datos.prepMinutes),
        image: nuevoLogo.dataUrl || tienda.image,
        cover: nuevaPortada.dataUrl || tienda.cover,
        logoFile: nuevoLogo.file,
        coverFile: nuevaPortada.file,
        coords: coordsPerfil,
      });
      toast("Perfil actualizado.");
      vistaPanel(contenedor);
    } catch (error) {
      toast(error.message, "error");
    }
  });
}

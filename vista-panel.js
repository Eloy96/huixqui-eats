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
        <button class="pestana" role="tab" data-tab="resumen" aria-selected="${pestana === "resumen"}">Resumen</button>
        <button class="pestana" role="tab" data-tab="productos" aria-selected="${pestana === "productos"}">Mis productos</button>
        <button class="pestana" role="tab" data-tab="contactos" aria-selected="${pestana === "contactos"}">Contactos</button>
        <button class="pestana" role="tab" data-tab="promocion" aria-selected="${pestana === "promocion"}">Promoción</button>
        <button class="pestana" role="tab" data-tab="perfil" aria-selected="${pestana === "perfil"}">Perfil</button>
      </div>

      <div data-panel>${esqueletoLista(2)}</div>
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

// ---------- Resumen ----------

function pintarResumen({ panel, tienda, productos, pedidos, leads, contenedor }) {
  const cobrados = leads.filter((l) => l.billable).length;
  const conversion = cobrados ? Math.round((pedidos.length / cobrados) * 100) : 0;
  const ventas = pedidos.reduce((s, p) => s + Number(p.total || 0), 0);
  const enlace = `${location.origin}${location.pathname}#/tienda/${tienda.slug || tienda.id}`;
  const pocosContactos = Number(tienda.credits) <= 5;

  pintarEn(
    panel,
    html`
      ${pocosContactos
        ? html`
            <div class="tarjeta" style="border-color:var(--alerta-500);background:var(--alerta-100);margin-bottom:var(--e-3)">
              <strong>Te quedan ${tienda.credits} contactos</strong>
              <p style="font-size:var(--t-sm);margin-top:var(--e-1)">
                Cuando lleguen a cero, los pedidos te siguen llegando pero dejamos de avisarte.
                Recarga para no perder ninguno.
              </p>
              <button class="boton boton--principal boton--chico" data-tab="promocion" type="button" style="margin-top:var(--e-2)">
                Recargar contactos
              </button>
            </div>
          `
        : ""}

      <div class="metricas">
        <div class="metrica ${pocosContactos ? "metrica--alerta" : ""}">
          <span>Contactos</span>
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
              texto: "Publica al menos tres productos con foto y comparte tu link. Es lo que más mueve la aguja.",
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
                      <div style="display:flex;gap:var(--e-2);margin-top:var(--e-2)">
                        <button class="boton boton--contorno boton--chico" data-editar="${producto.id}" type="button">Editar</button>
                        <button class="boton boton--peligro boton--chico" data-borrar="${producto.id}" type="button">
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
            <input type="file" accept="image/*" data-imagen />
            <small>${MEDIDAS_IMAGEN.producto.texto} Máx. 5 MB. Si no subes foto, usamos una genérica de la categoría.</small>
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

          <label class="campo">
            <span>Opciones para el cliente</span>
            <input name="options" value="${p.options || ""}" placeholder="Salsas, tamaños, colores" />
            <small>El cliente las ve y te dice cuál quiere en la nota del pedido.</small>
          </label>
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
      const guardado = await repo.guardarProducto({
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

async function pintarPromocion({ panel, tienda, productos, contenedor }) {
  const promocionados = productos.filter((p) => estaPromocionado(p));

  // Los precios los manda el servidor. Si no llegan, no inventamos: sin
  // catálogo no se puede cobrar, y mostrar un precio falso sería peor.
  let precios;
  try {
    precios = await repo.catalogoPrecios();
  } catch (error) {
    pintarEn(
      panel,
      vacio({
        titulo: "No pudimos cargar los precios",
        texto: `${error.message} Si acabas de instalar, corre 05-precios-y-seguridad.sql en Supabase.`,
        accion: html`<button class="boton boton--contorno" onclick="location.reload()" type="button">Reintentar</button>`,
      }),
    );
    return;
  }

  pintarEn(
    panel,
    html`
      <section class="tarjeta">
        <h2 style="font-size:var(--t-lg)">Recargar contactos</h2>
        <p style="font-size:var(--t-sm);color:var(--tinta-60);margin:var(--e-1) 0 var(--e-3)">
          Tienes <strong>${tienda.credits}</strong> contactos. Solo pagas cuando un cliente te escribe;
          nunca cobramos porcentaje de tu venta.
        </p>
        <div class="paquetes">
          ${precios.paquetes.map(
            (paquete) => html`
              <button class="paquete ${paquete.mejor ? "paquete--mejor" : ""}" data-recarga="${paquete.id}" type="button">
                <strong>+${paquete.contactos}</strong>
                <small>${dinero(paquete.precio)}</small>
                ${paquete.mejor ? html`<div class="sello sello--promo" style="margin-top:4px">Popular</div>` : ""}
              </button>
            `,
          )}
        </div>
      </section>

      <section style="margin-top:var(--e-4)">
        <div class="seccion-cabeza">
          <div>
            <h2>Aparecer arriba</h2>
            <p>Tu producto sale en el carrusel del inicio</p>
          </div>
        </div>

        ${promocionados.length
          ? html`
              <h3 style="margin:var(--e-3) 0 var(--e-2);font-size:var(--t-md)">Activos ahora</h3>
              ${promocionados.map(
                (producto) => html`
                  <div class="envio-fila envio-fila--enviado">
                    <div class="envio-fila-info">
                      <strong>${producto.title}</strong>
                      <small>Hasta el ${fechaCorta(producto.featuredUntil)}</small>
                    </div>
                    <span class="sello sello--promo">Arriba</span>
                  </div>
                `,
              )}
            `
          : ""}

        <h3 style="margin:var(--e-4) 0 var(--e-2);font-size:var(--t-md)">Promocionar un producto</h3>
        ${productos.length
          ? html`
              <div class="menu-lista">
                ${productos.map(
                  (producto) => html`
                    <div class="envio-fila">
                      <div class="envio-fila-info">
                        <strong>${producto.title}</strong>
                        <small>${dinero(precioFinal(producto))}</small>
                      </div>
                      <div style="display:flex;gap:var(--e-1)">
                        ${precios.planes.map(
                          (plan) => html`
                            <button
                              class="boton boton--contorno boton--chico"
                              data-promo="${producto.id}"
                              data-plan="${plan.id}"
                              type="button"
                              title="${plan.dias} días por ${dinero(plan.precio)}"
                            >
                              ${plan.dias} d · ${dinero(plan.precio)}
                            </button>
                          `,
                        )}
                      </div>
                    </div>
                  `,
                )}
              </div>
            `
          : vacio({
              titulo: "Primero publica un producto",
              texto: "Necesitas al menos uno para poder promocionarlo.",
              accion: html`<button class="boton boton--principal" data-tab="productos" type="button">Publicar producto</button>`,
            })}
      </section>
    `,
  );

  delegar(panel, "click", "[data-recarga]", async (_ev, boton) => {
    const paquete = precios.paquetes.find((p) => p.id === boton.dataset.recarga);
    if (!paquete) return;
    if (!confirm(`¿Recargar ${paquete.contactos} contactos por ${dinero(paquete.precio)}?`)) return;
    boton.disabled = true;
    try {
      await repo.comprarCreditos(paquete.id);
      toast(`Listo: +${paquete.contactos} contactos.`);
      vistaPanel(contenedor);
    } catch (error) {
      toast(error, "error");
      boton.disabled = false;
    }
  });

  delegar(panel, "click", "[data-promo]", async (_ev, boton) => {
    const producto = productos.find((p) => p.id === boton.dataset.promo);
    const plan = precios.planes.find((p) => p.id === boton.dataset.plan);
    if (!producto || !plan) return;
    if (!confirm(`¿Promocionar "${producto.title}" ${plan.dias} días por ${dinero(plan.precio)}?`)) return;
    boton.disabled = true;
    try {
      await repo.promocionar(producto, plan.id);
      toast("Tu producto ya aparece arriba.");
      vistaPanel(contenedor);
    } catch (error) {
      toast(error, "error");
      boton.disabled = false;
    }
  });
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
          <input name="address" value="${tienda.address || ""}" />
        </label>
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
        <div class="campos-2">
          <label class="campo">
            <span>Cambiar logo</span>
            <input type="file" accept="image/*" data-logo />
          </label>
          <label class="campo">
            <span>Cambiar portada</span>
            <input type="file" accept="image/*" data-portada />
          </label>
        </div>
        <button class="boton boton--principal boton--ancho" type="submit">Guardar cambios</button>
      </form>
    `,
  );

  panel.querySelector("[data-logo]").addEventListener("change", async (ev) => {
    try {
      nuevoLogo = await leerImagen(ev.target.files[0]);
    } catch (error) {
      toast(error.message, "error");
    }
  });
  panel.querySelector("[data-portada]").addEventListener("change", async (ev) => {
    try {
      nuevaPortada = await leerImagen(ev.target.files[0]);
    } catch (error) {
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
      });
      toast("Perfil actualizado.");
      vistaPanel(contenedor);
    } catch (error) {
      toast(error.message, "error");
    }
  });
}

// Cuenta: entrar, registrarse (cliente o negocio) y editar perfil.
//
// Lo que cambió de raíz: las contraseñas ya no se comparan aquí. Antes
// `passwordMatches()` hacía `usuario.password === escrito` con el hash
// inexistente y las contraseñas viviendo en localStorage. Ahora esta
// vista solo recoge el formulario y se lo pasa a repo → Supabase Auth.

import { html, pintarEn, delegar, leerImagen, urlSegura } from "./lib-dom.js";
import { toast, icono } from "./lib-ui.js";
import * as repo from "./datos-repo.js";
import { estado, fijar } from "./estado.js";
import { CATEGORIAS } from "./datos-semillas.js";
import { correoValido, telefonoValido, slug } from "./lib-formato.js";

let pestana = "entrar";
let logo = { dataUrl: "", file: null };
let portada = { dataUrl: "", file: null };

const META_FOTOS = {
  logo: { clave: "logo", etiqueta: "Logo", ayuda: "Se ve completo, sin recortar", forma: "logo" },
  portada: { clave: "portada", etiqueta: "Portada", ayuda: "Así se verá en el inicio", forma: "portada" },
};

/**
 * Caja de foto.
 *
 * Dos cosas que importan aquí:
 *
 * 1. El botón "Quitar" va FUERA del <label>. Dentro, cualquier clic en él
 *    también dispara el input de archivo: quitabas la foto y se te abría
 *    el explorador.
 * 2. La vista previa y el pie tienen su propio nodo (data-vista / data-pie).
 *    Así se actualizan SOLOS, sin repintar el formulario. Repintar el
 *    formulario para enseñar una miniatura borra todo lo que el usuario
 *    ya escribió.
 */
function campoFoto({ clave, etiqueta, ayuda, forma }) {
  return html`
    <div class="foto-subir">
      <span class="foto-etiqueta">${etiqueta}</span>
      <label class="foto-caja foto-caja--${forma}">
        <input type="file" accept="image/*" data-foto="${clave}" aria-label="${etiqueta}" />
        <span class="foto-vista" data-vista="${clave}">${vistaFoto(clave, etiqueta, ayuda)}</span>
      </label>
      <div class="foto-pie" data-pie="${clave}">${pieFoto(clave)}</div>
    </div>
  `;
}

function fotos() {
  return { logo, portada };
}

function vistaFoto(clave, etiqueta, ayuda) {
  const actual = fotos()[clave]?.dataUrl;
  if (actual) return html`<img src="${urlSegura(actual)}" alt="Vista previa de ${etiqueta}" />`;
  return html`<span class="foto-vacia">
    ${icono.mas()}
    <strong>Subir ${etiqueta.toLowerCase()}</strong>
    <span>${ayuda}</span>
  </span>`;
}

function pieFoto(clave) {
  const actual = fotos()[clave]?.dataUrl;
  if (!actual) return html`<span>JPG o PNG, máx. 5 MB</span>`;
  return html`
    <span>Toca la imagen para cambiarla</span>
    <button class="boton boton--texto" data-quitar-foto="${clave}" type="button">Quitar</button>
  `;
}

export async function vistaCuenta(contenedor) {
  const sesion = repo.sesion();
  if (sesion) {
    pintarPerfil(contenedor, sesion);
    return;
  }
  pintarAuth(contenedor);
}

// ============================================================
// Sin sesión
// ============================================================

function pintarAuth(contenedor) {
  pintarEn(
    contenedor,
    html`
      <div class="auth-cabeza">
        <h1>Tu cuenta</h1>
        <p>Entra para pedir, o registra tu negocio y empieza a recibir pedidos.</p>
      </div>

      <div class="pestanas" role="tablist">
        <button class="pestana" role="tab" data-pestana="entrar" aria-selected="${pestana === "entrar"}">Entrar</button>
        <button class="pestana" role="tab" data-pestana="cliente" aria-selected="${pestana === "cliente"}">Soy cliente</button>
        <button class="pestana" role="tab" data-pestana="negocio" aria-selected="${pestana === "negocio"}">Tengo un negocio</button>
      </div>

      <div data-panel></div>
    `,
  );

  delegar(contenedor, "click", "[data-pestana]", (_ev, boton) => {
    pestana = boton.dataset.pestana;
    pintarAuth(contenedor);
  });

  const panel = contenedor.querySelector("[data-panel]");
  if (pestana === "entrar") formularioEntrar(panel, contenedor);
  else if (pestana === "cliente") formularioCliente(panel, contenedor);
  else formularioNegocio(panel, contenedor);
}

function formularioEntrar(panel, contenedor) {
  pintarEn(
    panel,
    html`
      <form class="tarjeta" data-form novalidate>
        <label class="campo">
          <span>Correo</span>
          <input name="correo" type="email" autocomplete="username" placeholder="tucorreo@ejemplo.com" required />
        </label>
        <label class="campo">
          <span>Contraseña</span>
          <input name="password" type="password" autocomplete="current-password" required />
        </label>
        <button class="boton boton--principal boton--ancho" type="submit">Entrar</button>
        <div class="auth-pie">
          <button class="boton boton--texto" data-olvide type="button">Olvidé mi contraseña</button>
        </div>
      </form>
      ${repo.modo() === "demo"
        ? html`
            <p style="margin-top:var(--e-3);font-size:var(--t-sm);color:var(--tinta-60);text-align:center">
              Vas en modo demo: entra con cualquiera de los correos de prueba
              (por ejemplo <strong>tacos@pueblopedidos.mx</strong>) y la contraseña que quieras.
            </p>
          `
        : ""}
    `,
  );

  panel.querySelector("[data-form]").addEventListener("submit", async (ev) => {
    ev.preventDefault();
    const datos = new FormData(ev.currentTarget);
    const correo = String(datos.get("correo") || "").trim();
    if (!correoValido(correo)) {
      toast("Escribe un correo válido.", "error");
      return;
    }
    const boton = ev.currentTarget.querySelector('[type="submit"]');
    boton.disabled = true;
    try {
      const sesion = await repo.entrar({
        identificador: correo,
        password: String(datos.get("password") || ""),
        rol: correo.includes("@pueblopedidos.mx") ? "store" : "client",
      });
      toast(`Hola de nuevo${sesion?.perfil?.name ? `, ${sesion.perfil.name}` : ""}.`);
      location.hash = sesion?.role === "store" ? "#/panel" : "#/";
    } catch (error) {
      toast(error, "error");
      boton.disabled = false;
    }
  });

  panel.querySelector("[data-olvide]").addEventListener("click", async () => {
    const correo = panel.querySelector('[name="correo"]').value.trim();
    if (!correoValido(correo)) {
      toast("Escribe primero tu correo y vuelve a tocar.", "error");
      return;
    }
    try {
      await repo.recuperarPassword(correo);
      toast("Te mandamos un correo para crear una contraseña nueva.");
    } catch (error) {
      toast(error, "error");
    }
  });
}

function formularioCliente(panel, contenedor) {
  pintarEn(
    panel,
    html`
      <form class="tarjeta" data-form novalidate>
        <div class="campos-2">
          <label class="campo">
            <span>Tu nombre</span>
            <input name="name" placeholder="Como te conocen" required />
          </label>
          <label class="campo">
            <span>WhatsApp</span>
            <input name="phone" type="tel" inputmode="numeric" placeholder="10 dígitos" required />
          </label>
        </div>
        <label class="campo">
          <span>Correo</span>
          <input name="email" type="email" autocomplete="email" required />
        </label>
        <label class="campo">
          <span>Contraseña</span>
          <input name="password" type="password" autocomplete="new-password" minlength="8" required />
          <small>Mínimo 8 caracteres.</small>
        </label>
        <label class="campo">
          <span>Dirección</span>
          <input name="address" placeholder="Calle, número, colonia" required />
        </label>
        <label class="campo">
          <span>Referencia</span>
          <input name="reference" placeholder="Portón verde, frente a la escuela" />
        </label>
        ${botonUbicacion()}
        <button class="boton boton--principal boton--ancho" type="submit" style="margin-top:var(--e-3)">
          Crear mi cuenta
        </button>
      </form>
    `,
  );

  conectarUbicacion(panel);

  panel.querySelector("[data-form]").addEventListener("submit", async (ev) => {
    ev.preventDefault();
    const datos = Object.fromEntries(new FormData(ev.currentTarget));
    if (!datos.name?.trim() || !telefonoValido(datos.phone)) {
      toast("Faltan tu nombre o un WhatsApp de 10 dígitos.", "error");
      return;
    }
    if (!correoValido(datos.email)) {
      toast("Escribe un correo válido.", "error");
      return;
    }
    if (String(datos.password).length < 8) {
      toast("La contraseña necesita al menos 8 caracteres.", "error");
      return;
    }
    const boton = ev.currentTarget.querySelector('[type="submit"]');
    boton.disabled = true;
    try {
      await repo.registrarCliente({ ...datos, coords: estado.ubicacion });
      toast("Cuenta creada. Ya puedes pedir.");
      location.hash = "#/";
    } catch (error) {
      toast(error, "error");
      boton.disabled = false;
    }
  });
}

function formularioNegocio(panel, contenedor) {
  pintarEn(
    panel,
    html`
      <form class="tarjeta" data-form novalidate>
        <p style="font-size:var(--t-sm);color:var(--tinta-60);margin-bottom:var(--e-2)">
          Registrar tu negocio es gratis. Solo pagas por cada contacto que te llega y, si quieres,
          por aparecer arriba. Nunca cobramos comisión de tus ventas.
        </p>

        <section class="bloque">
          <div class="bloque-titulo">
            <span class="bloque-num">1</span>
            <h3>Tu negocio</h3>
          </div>
          <div class="campos-2">
            <label class="campo">
              <span>Nombre del negocio</span>
              <input name="name" placeholder="Tacos Don Luis" required />
            </label>
            <label class="campo">
              <span>Categoría</span>
              <select name="category">
                ${CATEGORIAS.map((c) => html`<option value="${c}">${c}</option>`)}
              </select>
            </label>
          </div>
          <label class="campo">
            <span>Descripción</span>
            <textarea name="description" placeholder="Qué vendes y qué te hace distinto"></textarea>
            <small>Esto es lo primero que lee el cliente. Sé concreto.</small>
          </label>
        </section>

        <section class="bloque">
          <div class="bloque-titulo">
            <span class="bloque-num">2</span>
            <h3>Cómo te contactan</h3>
            <small>los pedidos llegan aquí</small>
          </div>
          <div class="campos-2">
            <label class="campo">
              <span>Quién atiende</span>
              <input name="owner" placeholder="Tu nombre" required />
            </label>
            <label class="campo">
              <span>WhatsApp del negocio</span>
              <input name="phone" type="tel" inputmode="numeric" placeholder="10 dígitos" required />
            </label>
          </div>
          <div class="campos-2">
            <label class="campo">
              <span>Correo</span>
              <input name="email" type="email" autocomplete="email" required />
            </label>
            <label class="campo">
              <span>Contraseña</span>
              <input name="password" type="password" autocomplete="new-password" minlength="8" required />
              <small>Mínimo 8 caracteres.</small>
            </label>
          </div>
        </section>

        <section class="bloque">
          <div class="bloque-titulo">
            <span class="bloque-num">3</span>
            <h3>Dónde estás</h3>
          </div>
          <label class="campo">
            <span>Dirección</span>
            <input name="address" placeholder="Calle, número, referencia" required />
          </label>
          <label class="campo">
            <span>Cómo entregas</span>
            <select name="serviceModes">
              <option value="both">Entrega a domicilio y recoger</option>
              <option value="delivery">Solo entrega a domicilio</option>
              <option value="pickup">Solo recoger en el negocio</option>
            </select>
          </label>
          ${botonUbicacion()}
        </section>

        <section class="bloque">
          <div class="bloque-titulo">
            <span class="bloque-num">4</span>
            <h3>Fotos</h3>
            <small>opcional, pero duplican los contactos</small>
          </div>
          <div class="fotos-fila">
            ${campoFoto(META_FOTOS.logo)}
            ${campoFoto(META_FOTOS.portada)}
          </div>
        </section>

        <button class="boton boton--principal boton--ancho" type="submit" style="margin-top:var(--e-4)">
          Registrar mi negocio
        </button>
      </form>
    `,
  );

  conectarUbicacion(panel);
  conectarFotos(panel, META_FOTOS);

  panel.querySelector("[data-form]").addEventListener("submit", async (ev) => {
    ev.preventDefault();
    const datos = Object.fromEntries(new FormData(ev.currentTarget));
    if (!datos.name?.trim() || !datos.owner?.trim() || !telefonoValido(datos.phone)) {
      toast("Faltan nombre del negocio, tu nombre o el WhatsApp.", "error");
      return;
    }
    if (!correoValido(datos.email) || String(datos.password).length < 8) {
      toast("Revisa el correo y usa una contraseña de 8 caracteres o más.", "error");
      return;
    }
    const boton = ev.currentTarget.querySelector('[type="submit"]');
    boton.disabled = true;
    boton.textContent = "Registrando...";
    try {
      await repo.registrarTienda({
        ...datos,
        slug: slug(datos.name),
        coords: estado.ubicacion,
        image: logo.dataUrl,
        cover: portada.dataUrl,
        logoFile: logo.file,
        coverFile: portada.file,
      });
      logo = { dataUrl: "", file: null };
      portada = { dataUrl: "", file: null };
      toast("Tu negocio ya está publicado.");
      location.hash = "#/panel";
    } catch (error) {
      toast(error, "error");
      boton.disabled = false;
      boton.textContent = "Registrar mi negocio";
    }
  });
}

/**
 * Conecta las cajas de foto.
 *
 * Por delegación: los listeners viven en la raíz, no en cada input. Así
 * sobreviven aunque se repinte una caja, y no se acumulan duplicados si
 * esto se llama dos veces.
 */
function conectarFotos(raiz, meta) {
  const fijar = {
    logo: (v) => (logo = v),
    portada: (v) => (portada = v),
  };

  delegar(raiz, "change", "[data-foto]", async (ev, input) => {
    const clave = input.dataset.foto;
    try {
      fijar[clave](await leerImagen(ev.target.files[0]));
    } catch (error) {
      input.value = "";
      toast(error, "error");
      return;
    }
    refrescarCaja(raiz, clave, meta);
  });

  delegar(raiz, "click", "[data-quitar-foto]", (ev, boton) => {
    ev.preventDefault();
    const clave = boton.dataset.quitarFoto;
    fijar[clave]({ dataUrl: "", file: null });
    const input = raiz.querySelector(`[data-foto="${clave}"]`);
    if (input) input.value = "";
    refrescarCaja(raiz, clave, meta);
  });
}

/** Repinta la miniatura y su pie. NADA más. El resto del formulario ni se entera. */
function refrescarCaja(raiz, clave, meta) {
  const vista = raiz.querySelector(`[data-vista="${clave}"]`);
  const pie = raiz.querySelector(`[data-pie="${clave}"]`);
  if (vista) pintarEn(vista, vistaFoto(clave, meta[clave].etiqueta, meta[clave].ayuda));
  if (pie) pintarEn(pie, pieFoto(clave));
}

// ---------- Ubicación ----------

function botonUbicacion() {
  return html`
    <button class="boton boton--contorno boton--ancho boton--chico" data-ubicar type="button">
      ${estado.ubicacion ? "Ubicación guardada ✓" : "Usar mi ubicación actual"}
    </button>
    <small style="display:block;margin-top:var(--e-1);color:var(--tinta-60);font-size:var(--t-xs)">
      Sirve para ordenar los negocios por cercanía. No la compartimos con nadie.
    </small>
  `;
}

function conectarUbicacion(panel) {
  const boton = panel.querySelector("[data-ubicar]");
  if (!boton) return;
  boton.addEventListener("click", () => {
    if (!navigator.geolocation) {
      toast("Tu teléfono no permite compartir ubicación.", "error");
      return;
    }
    boton.disabled = true;
    boton.textContent = "Buscando...";
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        fijar({ ubicacion: { lat: pos.coords.latitude, lng: pos.coords.longitude } });
        boton.textContent = "Ubicación guardada ✓";
        boton.disabled = false;
        toast("Listo. Ya ordenamos los negocios por cercanía.");
      },
      () => {
        boton.textContent = "Usar mi ubicación actual";
        boton.disabled = false;
        toast("No pudimos leer tu ubicación. Escribe la dirección a mano.", "error");
      },
      { enableHighAccuracy: true, timeout: 8000 },
    );
  });
}

// ============================================================
// Con sesión
// ============================================================

function pintarPerfil(contenedor, sesion) {
  const esTienda = sesion.role === "store";
  const p = sesion.perfil;

  pintarEn(
    contenedor,
    html`
      <h1>${esTienda ? p.name : p.name || "Mi cuenta"}</h1>
      <p style="color:var(--tinta-60);font-size:var(--t-sm);margin-top:var(--e-1)">
        ${esTienda ? "Cuenta de negocio" : "Cuenta de cliente"} ·
        ${repo.modo() === "demo" ? "modo demo" : "conectado"}
      </p>

      ${esTienda
        ? html`
            <div style="display:grid;gap:var(--e-2);margin-top:var(--e-4)">
              <a class="boton boton--principal" href="#/panel">${icono.tienda()} Ir a mi panel</a>
              <a class="boton boton--contorno" href="#/tienda/${p.slug || p.id}">Ver mi tienda como cliente</a>
            </div>
          `
        : html`
            <form class="tarjeta" data-perfil style="margin-top:var(--e-4)">
              <h2 style="font-size:var(--t-lg);margin-bottom:var(--e-3)">Mis datos</h2>
              <div class="campos-2">
                <label class="campo">
                  <span>Nombre</span>
                  <input name="name" value="${p.name || ""}" />
                </label>
                <label class="campo">
                  <span>WhatsApp</span>
                  <input name="phone" type="tel" inputmode="numeric" value="${p.phone || ""}" />
                </label>
              </div>
              <label class="campo">
                <span>Dirección</span>
                <input name="address" value="${p.address || ""}" />
              </label>
              <label class="campo">
                <span>Referencia</span>
                <input name="reference" value="${p.reference || ""}" />
              </label>
              ${botonUbicacion()}
              <button class="boton boton--principal boton--ancho" type="submit" style="margin-top:var(--e-3)">
                Guardar cambios
              </button>
            </form>
            <a class="boton boton--contorno boton--ancho" href="#/pedidos" style="margin-top:var(--e-2)">
              Ver mis pedidos
            </a>
          `}

      <div style="margin-top:var(--e-6);display:grid;gap:var(--e-2)">
        <button class="boton boton--peligro boton--ancho" data-salir type="button">Cerrar sesión</button>
        ${repo.modo() === "demo"
          ? html`<button class="boton boton--texto" data-reiniciar type="button">Reiniciar datos del demo</button>`
          : ""}
      </div>
    `,
  );

  conectarUbicacion(contenedor);

  const form = contenedor.querySelector("[data-perfil]");
  if (form) {
    form.addEventListener("submit", async (ev) => {
      ev.preventDefault();
      const datos = Object.fromEntries(new FormData(ev.currentTarget));
      try {
        await repo.actualizarPerfil({ ...datos, coords: estado.ubicacion });
        toast("Datos guardados.");
      } catch (error) {
        toast(error, "error");
      }
    });
  }

  contenedor.querySelector("[data-salir]").addEventListener("click", async () => {
    await repo.salir();
    toast("Cerraste sesión.");
    location.hash = "#/";
  });

  const reiniciar = contenedor.querySelector("[data-reiniciar]");
  if (reiniciar) {
    reiniciar.addEventListener("click", () => {
      if (confirm("Esto borra los datos de prueba de este navegador. ¿Continuar?")) {
        repo.reiniciarDemo();
      }
    });
  }
}

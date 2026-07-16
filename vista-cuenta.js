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
      toast(error.message, "error");
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
      toast(error.message, "error");
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
      toast(error.message, "error");
      boton.disabled = false;
    }
  });
}

function formularioNegocio(panel, contenedor) {
  pintarEn(
    panel,
    html`
      <form class="tarjeta" data-form novalidate>
        <p style="font-size:var(--t-sm);color:var(--tinta-60);margin-bottom:var(--e-3)">
          Registrar tu negocio es gratis. Solo pagas por cada contacto que te llega y, si quieres, por
          aparecer arriba. Nunca cobramos comisión de tus ventas.
        </p>

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

        <div class="campos-2">
          <label class="campo">
            <span>Tu nombre</span>
            <input name="owner" placeholder="Quién atiende" required />
          </label>
          <label class="campo">
            <span>WhatsApp del negocio</span>
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
        </label>

        <label class="campo">
          <span>Dirección</span>
          <input name="address" placeholder="Calle, número, referencia" required />
        </label>
        ${botonUbicacion()}

        <label class="campo">
          <span>¿Cómo entregas?</span>
          <select name="serviceModes">
            <option value="both">Entrega a domicilio y recoger</option>
            <option value="delivery">Solo entrega a domicilio</option>
            <option value="pickup">Solo recoger en el negocio</option>
          </select>
        </label>

        <label class="campo">
          <span>Descripción</span>
          <textarea name="description" placeholder="Qué vendes y qué te hace distinto"></textarea>
        </label>

        <div class="campos-2">
          <label class="campo">
            <span>Logo</span>
            <input type="file" accept="image/*" data-logo />
          </label>
          <label class="campo">
            <span>Foto de portada</span>
            <input type="file" accept="image/*" data-portada />
          </label>
        </div>
        <div data-previas style="display:flex;gap:var(--e-2)"></div>

        <button class="boton boton--principal boton--ancho" type="submit" style="margin-top:var(--e-3)">
          Registrar mi negocio
        </button>
      </form>
    `,
  );

  conectarUbicacion(panel);

  const previas = panel.querySelector("[data-previas]");
  const pintaPrevias = () => {
    pintarEn(
      previas,
      html`
        ${logo.dataUrl ? html`<img class="previa" src="${urlSegura(logo.dataUrl)}" alt="Vista previa del logo" style="width:120px" />` : ""}
        ${portada.dataUrl ? html`<img class="previa" src="${urlSegura(portada.dataUrl)}" alt="Vista previa de la portada" style="flex:1" />` : ""}
      `,
    );
  };

  panel.querySelector("[data-logo]").addEventListener("change", async (ev) => {
    try {
      logo = await leerImagen(ev.target.files[0]);
      pintaPrevias();
    } catch (error) {
      toast(error.message, "error");
    }
  });
  panel.querySelector("[data-portada]").addEventListener("change", async (ev) => {
    try {
      portada = await leerImagen(ev.target.files[0]);
      pintaPrevias();
    } catch (error) {
      toast(error.message, "error");
    }
  });

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
      toast(error.message, "error");
      boton.disabled = false;
    }
  });
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
        toast(error.message, "error");
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

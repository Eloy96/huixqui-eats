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
import { CATEGORIAS, MEDIDAS_IMAGEN } from "./datos-semillas.js";
import { correoValido, telefonoValido, slug } from "./lib-formato.js";
import { VERSION_LEGAL } from "./legal-textos.js";
import { ubicacionActual, direccionDesdeCoords, coordsDesdeLink, linkMapa } from "./lib-ubicacion.js";

let pestana = "entrar";
let logo = { dataUrl: "", file: null };
let portada = { dataUrl: "", file: null };

// Candado global: mientras una petición de auth está en vuelo, ninguna otra
// entra. Cinturón y tirantes junto con el `boton.disabled`, porque el 429 de
// Supabase es caro y no queremos ni una petición de más.
let enVuelo = false;

async function unaVez(boton, textoOcupado, tarea) {
  if (enVuelo) return;
  enVuelo = true;
  const textoOriginal = boton.textContent;
  boton.disabled = true;
  boton.textContent = textoOcupado;
  try {
    await tarea();
  } finally {
    enVuelo = false;
    boton.disabled = false;
    boton.textContent = textoOriginal;
  }
}

const META_FOTOS = {
  logo: {
    clave: "logo",
    etiqueta: "Logo",
    ayuda: "Cuadrado · 400×400 px",
    forma: "logo",
    medidas: MEDIDAS_IMAGEN.logo,
  },
  portada: {
    clave: "portada",
    etiqueta: "Portada",
    ayuda: "Horizontal · 1200×675 px",
    forma: "portada",
    medidas: MEDIDAS_IMAGEN.portada,
  },
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

/** Casilla de aceptación. Sin esto no puedes probar que alguien aceptó. */
function casillaAcepto() {
  return html`
    <label class="acepto" data-acepto-caja>
      <input type="checkbox" name="acepto" data-acepto />
      <span>
        He leído y acepto los
        <a href="#/terminos" target="_blank" rel="noopener">Términos y Condiciones</a>
        y el
        <a href="#/privacidad" target="_blank" rel="noopener">Aviso de Privacidad</a>.
      </span>
    </label>
  `;
}

/** Devuelve true si está marcada; si no, la resalta y avisa. */
function validaAcepto(raiz) {
  const caja = raiz.querySelector("[data-acepto]");
  if (!caja) return true;
  const caja2 = raiz.querySelector("[data-acepto-caja]");
  if (caja.checked) {
    caja2?.classList.remove("acepto--error");
    return true;
  }
  caja2?.classList.add("acepto--error");
  // scrollIntoView no existe en todos lados; es un detalle, no debe tumbar
  // la validación.
  if (typeof caja2?.scrollIntoView === "function") {
    caja2.scrollIntoView({ block: "center", behavior: "smooth" });
  }
  toast("Necesitas aceptar los términos y el aviso de privacidad para continuar.", "error");
  return false;
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
  const foto = fotos()[clave];
  const meta = META_FOTOS[clave];
  if (!foto?.dataUrl) {
    return html`<span>${meta.medidas.texto} Máx. 5 MB.</span>`;
  }
  return html`
    <span>
      ${foto.ancho ? html`${foto.ancho}×${foto.alto} px · ` : ""}Toca la imagen para cambiarla
    </span>
    <button class="boton boton--texto" data-quitar-foto="${clave}" type="button">Quitar</button>
    ${foto.aviso ? html`<span class="foto-aviso">${foto.aviso}</span>` : ""}
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
  // El cascarón (título + pestañas) se pinta UNA vez. Antes se repintaba
  // completo en cada cambio de pestaña, y como el listener de pestañas se
  // registraba en cada repintado, se apilaban: 6 clics = 6 listeners = al
  // enviar el formulario salían 6 signups de golpe → 429 al instante.
  pintarEn(
    contenedor,
    html`
      <div class="auth-cabeza">
        <h1>Tu cuenta</h1>
        <p>Entra para pedir, o registra tu negocio y empieza a recibir pedidos.</p>
      </div>

      <div class="pestanas" role="tablist">
        <button class="pestana" role="tab" data-pestana="entrar">Entrar</button>
        <button class="pestana" role="tab" data-pestana="cliente">Soy cliente</button>
        <button class="pestana" role="tab" data-pestana="negocio">Tengo un negocio</button>
      </div>

      <div data-panel></div>
    `,
  );

  // Un solo listener, registrado una sola vez. Cambiar de pestaña solo
  // repinta el panel de adentro, nunca el cascarón.
  delegar(contenedor, "click", "[data-pestana]", (_ev, boton) => {
    pestana = boton.dataset.pestana;
    pintarPestanaActiva(contenedor);
  });

  pintarPestanaActiva(contenedor);
}

function pintarPestanaActiva(contenedor) {
  contenedor.querySelectorAll("[data-pestana]").forEach((b) => {
    b.setAttribute("aria-selected", b.dataset.pestana === pestana ? "true" : "false");
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

  panel.querySelector("[data-form]").addEventListener("submit", (ev) => {
    ev.preventDefault();
    const datos = new FormData(ev.currentTarget);
    const correo = String(datos.get("correo") || "").trim();
    if (!correoValido(correo)) {
      toast("Escribe un correo válido.", "error");
      return;
    }
    const boton = ev.currentTarget.querySelector('[type="submit"]');
    unaVez(boton, "Entrando...", async () => {
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
      }
    });
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
        ${bloqueUbicacion()}
        ${casillaAcepto()}
        <button class="boton boton--principal boton--ancho" type="submit" style="margin-top:var(--e-3)">
          Crear mi cuenta
        </button>
      </form>
    `,
  );

  // Llenamos la dirección solo si está vacía: si el usuario ya escribió
  // algo, es porque sabe mejor que el geocoding.
  conectarUbicacion(panel, (dir) => {
    const campo = panel.querySelector('[name="address"]');
    if (campo && !campo.value.trim() && dir.linea) {
      campo.value = dir.linea;
      campo.classList.add("campo-autollenado");
      setTimeout(() => campo.classList.remove("campo-autollenado"), 1500);
    }
  });

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
    if (!validaAcepto(ev.currentTarget)) return;
    const boton = ev.currentTarget.querySelector('[type="submit"]');
    unaVez(boton, "Creando cuenta...", async () => {
      try {
        await repo.registrarCliente({ ...datos, coords: estado.ubicacion });
        await repo.registrarAceptacion(VERSION_LEGAL);
        toast("Cuenta creada. Ya puedes pedir.");
        location.hash = "#/";
      } catch (error) {
        toast(error, "error");
      }
    });
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
          ${bloqueUbicacion({ paraTienda: true })}
        </section>

        <section class="bloque">
          <div class="bloque-titulo">
            <span class="bloque-num">4</span>
            <h3>Tu horario</h3>
          </div>
          ${bloqueHorario()}
        </section>

        <section class="bloque">
          <div class="bloque-titulo">
            <span class="bloque-num">5</span>
            <h3>Fotos</h3>
            <small>opcional, pero duplican los contactos</small>
          </div>
          <div class="fotos-fila">
            ${campoFoto(META_FOTOS.logo)}
            ${campoFoto(META_FOTOS.portada)}
          </div>
        </section>

        ${casillaAcepto()}
        <button class="boton boton--principal boton--ancho" type="submit" style="margin-top:var(--e-4)">
          Registrar mi negocio
        </button>
      </form>
    `,
  );

  conectarUbicacion(panel, (dir) => {
    const campo = panel.querySelector('[name="address"]');
    if (campo && !campo.value.trim() && dir.linea) {
      campo.value = dir.linea;
      campo.classList.add("campo-autollenado");
      setTimeout(() => campo.classList.remove("campo-autollenado"), 1500);
    }
  });
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
    const horario = leerHorario(ev.currentTarget);
    if (horario.error) {
      toast(horario.error, "error");
      return;
    }
    if (!validaAcepto(ev.currentTarget)) return;
    const boton = ev.currentTarget.querySelector('[type="submit"]');
    unaVez(boton, "Registrando...", async () => {
      try {
        await repo.registrarTienda({
          ...datos,
          schedule: horario.schedule,
          slug: slug(datos.name),
          coords: estado.ubicacion,
          image: logo.dataUrl,
          cover: portada.dataUrl,
          logoFile: logo.file,
          coverFile: portada.file,
        });
        await repo.registrarAceptacion(VERSION_LEGAL);
        logo = { dataUrl: "", file: null };
        portada = { dataUrl: "", file: null };
        toast("Tu negocio ya está publicado.");
        location.hash = "#/panel";
      } catch (error) {
        toast(error, "error");
      }
    });
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
      fijar[clave](await leerImagen(ev.target.files[0], META_FOTOS[clave].medidas));
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

/**
 * Bloque de ubicación.
 *
 * Tres caminos porque tres situaciones reales:
 *   · Está en el local     → GPS, y de paso le llenamos la dirección.
 *   · Registra desde casa  → pega el link de Google Maps del negocio.
 *   · Sin señal ni link    → escribe la dirección; funciona, solo que sin
 *                            ordenar por cercanía.
 *
 * El campo de dirección se llena solo, pero queda editable: el geocoding
 * acierta la calle, casi nunca el número ni la referencia.
 */
const DIAS = [
  { n: 1, corto: "Lun" },
  { n: 2, corto: "Mar" },
  { n: 3, corto: "Mié" },
  { n: 4, corto: "Jue" },
  { n: 5, corto: "Vie" },
  { n: 6, corto: "Sáb" },
  { n: 0, corto: "Dom" },
];

/**
 * Horario de atención.
 *
 * Es obligatorio y por una razón concreta: sin horario la app daba por
 * abierta a toda tienda nueva, así que un cliente podía mandar un pedido a
 * las 3 de la mañana y el negocio quedaba mal sin saber por qué.
 *
 * Se pide simple —un rango y los días que abre— porque pedir dos turnos
 * por día en el registro espanta. El negocio puede afinarlo después en su
 * panel.
 */
function bloqueHorario(horarioActual = null) {
  const abre = horarioActual?.abre || "09:00";
  const cierra = horarioActual?.cierra || "20:00";
  const dias = horarioActual?.dias || [1, 2, 3, 4, 5, 6];

  return html`
    <div class="horario-bloque">
      <div class="campos-2">
        <label class="campo">
          <span>Abre a las</span>
          <input type="time" name="abre" value="${abre}" required />
        </label>
        <label class="campo">
          <span>Cierra a las</span>
          <input type="time" name="cierra" value="${cierra}" required />
        </label>
      </div>

      <fieldset class="dias-fieldset">
        <legend>Días que abres</legend>
        <div class="dias-lista">
          ${DIAS.map(
            (d) => html`
              <label class="dia-chip">
                <input type="checkbox" name="dia" value="${d.n}" ${dias.includes(d.n) ? "checked" : ""} />
                <span>${d.corto}</span>
              </label>
            `,
          )}
        </div>
      </fieldset>
      <small class="horario-nota">
        Fuera de este horario tu tienda sale como <strong>Cerrada</strong> y no se pueden
        enviar pedidos. Puedes cambiarlo cuando quieras.
      </small>
    </div>
  `;
}

/** Convierte lo que llenó el formulario al formato que usa la app. */
function leerHorario(form) {
  const abre = form.querySelector('[name="abre"]')?.value || "";
  const cierra = form.querySelector('[name="cierra"]')?.value || "";
  const dias = [...form.querySelectorAll('[name="dia"]:checked')].map((c) => Number(c.value));
  if (!abre || !cierra) return { error: "Falta la hora de apertura o de cierre." };
  if (!dias.length) return { error: "Marca al menos un día de la semana." };
  if (abre === cierra) return { error: "La hora de apertura y la de cierre no pueden ser iguales." };

  const schedule = {};
  DIAS.forEach((d) => {
    schedule[d.n] = dias.includes(d.n) ? [[abre, cierra]] : [];
  });
  return { schedule, abre, cierra, dias };
}

function bloqueUbicacion({ paraTienda = false } = {}) {
  return html`
    <div class="ubicacion-bloque" data-ubicacion-bloque>
      <div class="ubicacion-acciones">
        <button class="boton boton--contorno boton--chico" data-ubicar type="button">
          ${icono.cercania()} Usar mi ubicación
        </button>
        <button class="boton boton--texto" data-abrir-link type="button">
          o pegar link de Google Maps
        </button>
      </div>

      <div class="ubicacion-link" data-zona-link hidden>
        <label class="campo" style="margin:0">
          <span>Link de Google Maps</span>
          <input data-link placeholder="https://www.google.com/maps/@19.43,-99.13,17z" />
          <small>
            Abre Google Maps, busca tu ${paraTienda ? "local" : "domicilio"}, y copia la dirección
            completa de la barra del navegador.
          </small>
        </label>
        <button class="boton boton--contorno boton--chico" data-usar-link type="button">
          Usar este link
        </button>
      </div>

      <p class="ubicacion-estado" data-ubicacion-estado></p>
    </div>
  `;
}

/**
 * Conecta el bloque. `alUbicar` recibe la dirección detectada para que
 * cada formulario decida qué campo llenar.
 */
function conectarUbicacion(panel, alUbicar) {
  const bloque = panel.querySelector("[data-ubicacion-bloque]");
  if (!bloque) return;

  const aviso = bloque.querySelector("[data-ubicacion-estado]");
  const zonaLink = bloque.querySelector("[data-zona-link]");

  const decir = (texto, tipo = "ok") => {
    aviso.textContent = texto;
    aviso.className = `ubicacion-estado ubicacion-estado--${tipo}`;
  };

  const fijarPunto = async (lat, lng, origen) => {
    fijar({ ubicacion: { lat, lng } });
    decir("Buscando la dirección...", "ok");
    const dir = await direccionDesdeCoords(lat, lng);
    if (dir?.linea) {
      decir(`Ubicación guardada · ${dir.linea}`, "listo");
      if (alUbicar) alUbicar(dir);
    } else {
      // El geocoding es un extra. Sin él la ubicación sirve igual.
      decir(
        `Ubicación guardada (${origen}). No pudimos leer la calle: escríbela a mano.`,
        "listo",
      );
    }
    const ver = document.createElement("a");
    ver.className = "boton boton--texto";
    ver.href = linkMapa(lat, lng);
    ver.target = "_blank";
    ver.rel = "noopener";
    ver.textContent = "Verificar en el mapa";
    aviso.after(ver);
  };

  bloque.querySelector("[data-ubicar]").addEventListener("click", async (ev) => {
    const boton = ev.currentTarget;
    boton.disabled = true;
    boton.textContent = "Buscando...";
    try {
      const punto = await ubicacionActual();
      if (punto.precision > 100) {
        decir(
          `Tu ubicación es aproximada (±${punto.precision} m). Si no estás en el local, mejor usa el link de Google Maps.`,
          "aviso",
        );
      }
      await fijarPunto(punto.lat, punto.lng, "GPS");
    } catch (error) {
      decir(error.message, "error");
    } finally {
      boton.disabled = false;
      pintarEn(boton, html`${icono.cercania()} Usar mi ubicación`);
    }
  });

  bloque.querySelector("[data-abrir-link]").addEventListener("click", () => {
    zonaLink.hidden = !zonaLink.hidden;
    if (!zonaLink.hidden) bloque.querySelector("[data-link]").focus();
  });

  bloque.querySelector("[data-usar-link]").addEventListener("click", async () => {
    const resultado = coordsDesdeLink(bloque.querySelector("[data-link]").value);
    if (resultado.error) {
      decir(resultado.error, "error");
      return;
    }
    await fijarPunto(resultado.lat, resultado.lng, "link de Maps");
  });

  if (estado.ubicacion) {
    decir("Ya tienes una ubicación guardada. Puedes cambiarla si quieres.", "listo");
  }
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
              ${bloqueUbicacion()}
              <button class="boton boton--principal boton--ancho" type="submit" style="margin-top:var(--e-3)">
                Guardar cambios
              </button>
            </form>
            <a class="boton boton--contorno boton--ancho" href="#/pedidos" style="margin-top:var(--e-2)">
              Ver mis pedidos
            </a>
          `}

      <div style="margin-top:var(--e-6);display:grid;gap:var(--e-2)">
        <button class="boton boton--contorno boton--ancho" data-salir type="button">Cerrar sesión</button>
        ${repo.modo() === "demo"
          ? html`<button class="boton boton--texto" data-reiniciar type="button">Reiniciar datos del demo</button>`
          : ""}
      </div>

      <section class="peligro">
        <h2>Eliminar mi cuenta</h2>
        <p>
          ${esTienda
            ? "Se borra tu negocio y tus productos dejan de aparecer. Los pedidos que recibiste se conservan sin datos del cliente, para tu contabilidad."
            : "Se borran tus datos personales. Los pedidos que hiciste se conservan de forma anónima, sin tu nombre ni tu dirección, porque son parte de la contabilidad del negocio."}
          Esto no se puede deshacer.
        </p>
        <button class="boton boton--peligro" data-eliminar type="button">Eliminar mi cuenta</button>
      </section>

      <div style="margin-top:var(--e-6)">
        <a class="boton boton--texto" href="#/terminos">Términos y Condiciones</a>
        <a class="boton boton--texto" href="#/privacidad">Aviso de Privacidad</a>
      </div>
    `,
  );

  conectarUbicacion(contenedor, (dir) => {
    const campo = contenedor.querySelector('[name="address"]');
    if (campo && !campo.value.trim() && dir.linea) campo.value = dir.linea;
  });

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

  contenedor.querySelector("[data-eliminar]").addEventListener("click", async (ev) => {
    // Doble confirmación, y la segunda hay que escribirla: un clic de más
    // no debe borrarle el negocio a nadie.
    if (!confirm("¿Seguro que quieres eliminar tu cuenta? Esto no se puede deshacer.")) return;
    const escrito = prompt('Para confirmar, escribe: ELIMINAR');
    if (String(escrito || "").trim().toUpperCase() !== "ELIMINAR") {
      toast("Cancelado. Tu cuenta sigue activa.");
      return;
    }
    const boton = ev.currentTarget;
    boton.disabled = true;
    boton.textContent = "Eliminando...";
    try {
      await repo.eliminarCuenta();
      toast("Tu cuenta fue eliminada.");
      location.hash = "#/";
    } catch (error) {
      toast(error, "error");
      boton.disabled = false;
      boton.textContent = "Eliminar mi cuenta";
    }
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

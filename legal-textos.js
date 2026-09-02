// Textos legales que ve el usuario.
//
// La VERSIÓN es lo que se guarda cuando alguien acepta. Si cambias algo de
// fondo en estos textos, sube la versión: así sabes quién aceptó qué.
// Cambios de redacción menores no necesitan versión nueva.

export const VERSION_LEGAL = "2026-09-01";

// ⚠️ Llena estos datos antes de abrir al público. Lo que quede sin llenar
// aparece marcado dentro de la app, a propósito: es más fácil notarlo ahí
// que en un archivo.
export const DATOS_RESPONSABLE = {
  responsable: "", // Tu nombre completo o razón social
  domicilio: "", // Domicilio para oír y recibir notificaciones
  ciudad: "", // Ciudad/estado para la jurisdicción
  region_datos: "", // Región donde está tu Supabase (p. ej. "Canadá (ca-central-1)")
};

// El teléfono de contacto sí está fijo (lo definiste).
export const TELEFONO_CONTACTO = "55 1290 6477";

const PENDIENTE = "[FALTA LLENAR]";

export function dato(clave) {
  const valor = DATOS_RESPONSABLE[clave];
  return valor && valor.trim() ? valor.trim() : PENDIENTE;
}

export function faltanDatos() {
  return Object.keys(DATOS_RESPONSABLE).filter((k) => !DATOS_RESPONSABLE[k]?.trim());
}

// ---------- Aviso de privacidad ----------

export const AVISO_PRIVACIDAD = [
  {
    titulo: "Quién es responsable de tus datos",
    parrafos: [
      `${dato("responsable")}, con domicilio en ${dato("domicilio")} y teléfono de contacto ${TELEFONO_CONTACTO}, es responsable del tratamiento de tus datos personales, conforme a la Ley Federal de Protección de Datos Personales en Posesión de los Particulares (LFPDPPP).`,
    ],
  },
  {
    titulo: "Qué es PuebloPedidos",
    parrafos: [
      "PuebloPedidos es un directorio que conecta clientes con negocios locales. Armas tu pedido aquí y la plataforma genera un mensaje de WhatsApp que tú mismo envías al negocio.",
      "PuebloPedidos no vende los productos, no te cobra por tu compra, no realiza la entrega ni procesa los pagos de tu pedido. La compraventa es directamente entre tú y el negocio.",
    ],
  },
  {
    titulo: "Qué datos recabamos",
    lista: [
      "Si eres cliente: tu nombre, WhatsApp, correo, dirección y referencias de entrega, tu ubicación aproximada si la autorizas, y el historial de pedidos que envías.",
      "Si eres un negocio: nombre comercial, categoría, descripción, dirección, ubicación, horarios, logo y fotos; más el nombre, WhatsApp y correo de quien lo administra.",
      "No pedimos ni guardamos datos de tarjetas ni cuentas bancarias del cliente: el pago de tu pedido lo haces directo con el negocio.",
    ],
  },
  {
    titulo: "Para qué los usamos",
    parrafos: [
      "Para crear tu cuenta, generar y enviar tu pedido al negocio que elijas, mostrarte los negocios por cercanía si compartes tu ubicación, y darte soporte.",
      "Si eres un negocio: para publicar tu ficha, hacerte llegar los contactos de los clientes, y administrar tu suscripción y tus promociones dentro de la plataforma.",
    ],
  },
  {
    titulo: "Con quién compartimos tus datos",
    parrafos: [
      "Cuando envías un pedido, tu nombre, WhatsApp, dirección, referencias y el detalle del pedido se transfieren al negocio que elegiste, para que pueda atenderte. Sin esa transferencia no hay pedido.",
      "El mensaje viaja por WhatsApp, operado por Meta Platforms, Inc., y queda sujeto a sus políticas.",
      "Si eres un negocio, tu nombre comercial, dirección, teléfono, horarios y fotos se publican en el sitio y son visibles para cualquier persona. Los datos personales de los clientes nunca se publican.",
      `Usamos Supabase para autenticación, base de datos y almacenamiento de imágenes, y GitHub Pages para alojar el sitio. Tus datos se almacenan en servidores ubicados en ${dato("region_datos")}. Al aceptar este aviso consientes esa transferencia internacional, necesaria para prestarte el servicio.`,
    ],
  },
  {
    titulo: "Solo para mayores de edad",
    parrafos: [
      "PuebloPedidos está dirigido exclusivamente a personas mayores de 18 años. Al registrarte declaras que eres mayor de edad. No recabamos intencionalmente datos de menores; si detectamos una cuenta de un menor, la eliminaremos.",
    ],
  },
  {
    titulo: "Cómo protegemos tus datos",
    parrafos: [
      "Las contraseñas las gestiona el sistema de autenticación de Supabase: nunca se guardan en tu navegador ni las conoce PuebloPedidos. El acceso a la información está restringido por reglas a nivel de base de datos, de modo que cada quien solo ve lo que le corresponde.",
      "Adoptamos medidas de seguridad razonables, aunque ningún sistema puede garantizar seguridad absoluta.",
    ],
  },
  {
    titulo: "Cuánto tiempo los conservamos",
    parrafos: [
      "Conservamos tus datos personales mientras tu cuenta esté activa. Cuando la eliminas desde la sección Cuenta, borramos tus datos personales; los pedidos que hayas hecho se conservan de forma anónima, sin tu nombre ni tu dirección, porque son parte de la contabilidad del negocio.",
    ],
  },
  {
    titulo: "Tus derechos ARCO",
    parrafos: [
      "Puedes Acceder a tus datos, Rectificarlos, Cancelarlos y Oponerte a su tratamiento, además de revocar tu consentimiento.",
      `Buena parte los ejerces tú mismo desde la sección Cuenta: editar tus datos o eliminar tu cuenta. Para lo demás, comunícate al ${TELEFONO_CONTACTO} indicando tu nombre, qué derecho quieres ejercer y sobre qué datos. Respondemos en un máximo de 20 días hábiles.`,
    ],
  },
  {
    titulo: "Almacenamiento en tu dispositivo",
    parrafos: [
      "Guardamos información en tu navegador para recordar tu sesión, tu carrito y tus preferencias. No usamos cookies de rastreo publicitario ni compartimos esa información con terceros con fines de publicidad.",
    ],
  },
  {
    titulo: "Cambios y autoridad",
    parrafos: [
      "Podemos actualizar este aviso; la versión vigente siempre está en esta página con su fecha. Si consideras que tu derecho a la protección de datos fue vulnerado, puedes acudir a la autoridad competente en materia de protección de datos personales.",
    ],
  },
];

// ---------- Términos y condiciones ----------

export const TERMINOS = [
  {
    titulo: "Qué es PuebloPedidos",
    parrafos: [
      "PuebloPedidos es un directorio y punto de contacto entre clientes y negocios locales. Permite armar un pedido y generar un mensaje de WhatsApp que el propio cliente envía al negocio.",
      "Al usar la plataforma aceptas estos Términos y el Aviso de Privacidad. Si no estás de acuerdo, no la uses.",
    ],
  },
  {
    titulo: "Quién puede usarla",
    parrafos: [
      "Para usar PuebloPedidos debes ser mayor de 18 años. Al registrarte declaras que cumples con este requisito.",
      "Para registrar un negocio declaras además que estás facultado para representarlo y que la información que proporcionas es veraz.",
    ],
  },
  {
    titulo: "Nuestro papel — léelo con atención",
    lista: [
      "PuebloPedidos no vende los productos ni presta los servicios que ofrecen los negocios.",
      "No cobramos al cliente, no procesamos el pago de su pedido y no intervenimos en él: el precio y la forma de pago del pedido los acuerdas directamente con el negocio.",
      "No realizamos ni garantizamos la entrega. Cada negocio define y cumple sus tiempos y condiciones.",
      "La compraventa es exclusivamente entre el cliente y el negocio. Calidad, cantidad, precio, entrega, garantías, facturación, devoluciones y reclamaciones se resuelven entre ellos.",
      "Los precios, horarios, disponibilidad y fotos los proporciona cada negocio, que es responsable de mantenerlos veraces. PuebloPedidos no los verifica.",
      "Los tiempos estimados, distancias y estados de abierto o cerrado son estimaciones automáticas de carácter informativo y pueden no coincidir con la realidad.",
    ],
  },
  {
    titulo: "Condiciones para los negocios",
    parrafos: [
      "La relación entre PuebloPedidos y el negocio es una suscripción para aparecer y promocionarse dentro de la plataforma:",
    ],
    lista: [
      "Los negocios cuentan con un periodo de prueba gratuito de 30 días desde su registro.",
      "Al terminar la prueba, para seguir apareciendo el negocio contrata una suscripción mensual, en el plan que elija: Presencia o Destacado. Los precios vigentes se muestran en su panel.",
      "El plan Destacado otorga posición preferente dentro de su categoría, sujeto a disponibilidad, ya que se ofrece a un solo negocio destacado por categoría.",
      "PuebloPedidos no cobra comisión sobre las ventas ni cobra por cada contacto recibido. Los únicos cobros de la plataforma son la suscripción y las promociones opcionales que el negocio decida contratar.",
      "El pago de la suscripción se realiza por los medios indicados en el panel del negocio y se activa una vez verificado.",
      "Si la suscripción vence y no se renueva, el negocio deja de aparecer en la plataforma, pero su información no se elimina y puede reactivarse al pagar.",
      "Las suscripciones y promociones contratadas no son reembolsables, salvo que la ley disponga lo contrario.",
    ],
  },
  {
    titulo: "Uso correcto",
    parrafos: ["Al usar PuebloPedidos te comprometes a no:"],
    lista: [
      "Publicar información falsa, engañosa o que no te pertenezca.",
      "Ofrecer productos o servicios ilegales, o restringidos, sin las autorizaciones correspondientes.",
      "Suplantar a otra persona o negocio.",
      "Intentar vulnerar la seguridad de la plataforma, acceder a datos ajenos o alterar su funcionamiento.",
      "Usar la plataforma para acosar, difamar o dañar a terceros.",
      "Subir imágenes o contenido que infrinja derechos de autor o de terceros.",
    ],
  },
  {
    titulo: "Contenido que publicas",
    parrafos: [
      "Al subir información, textos o imágenes declaras que tienes derecho a usarlos y nos autorizas a mostrarlos dentro de la plataforma para operar el servicio. Eres el único responsable de ese contenido.",
    ],
  },
  {
    titulo: "Disponibilidad y responsabilidad",
    parrafos: [
      "Procuramos que la plataforma esté siempre disponible, pero no garantizamos que funcione sin interrupciones ni errores. Se ofrece tal cual y según disponibilidad.",
      "En la medida que lo permita la ley, no somos responsables por daños derivados de la relación entre cliente y negocio, por la información que publican los negocios, ni por fallas de los servicios de terceros que utilizamos.",
    ],
  },
  {
    titulo: "Cambios, ley aplicable y contacto",
    parrafos: [
      "Podemos modificar estos Términos; la versión vigente está siempre en esta página. El uso continuado después de un cambio implica que lo aceptas.",
      `Estos Términos se rigen por las leyes de los Estados Unidos Mexicanos y las partes se someten a los tribunales de ${dato("ciudad")}, sin perjuicio de los derechos que la legislación de protección al consumidor reconozca al cliente.`,
      `Para cualquier duda o información, comunícate al ${TELEFONO_CONTACTO}.`,
    ],
  },
];

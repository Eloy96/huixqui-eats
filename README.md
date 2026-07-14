# PuebloPedidos

Prototipo funcional de marketplace local por WhatsApp para comida, productos y servicios.

## Que incluye esta version

- Inicio de sesion compacto para cliente o tienda.
- Links de recuperar contrasena y registrarse ahora.
- Registro oculto hasta que el usuario lo solicita.
- Home publico visible antes del registro.
- Flujo guiado: explorar, agregar y enviar por WhatsApp.
- Carrusel general de tiendas y carruseles por categoria.
- Link propio por tienda con formato `#tienda/id-de-la-tienda`.
- Boton para copiar link publico de cada tienda.
- Perfil publico de tienda separado del home.
- Productos de tienda en filas compactas con imagen pequena.
- Detalle de producto antes de agregar al carrito.
- Caja de comentarios por producto, por ejemplo: sin cebolla.
- Carrito de compras en modal con contador.
- Barra flotante de carrito cuando hay productos agregados.
- Carrito agrupado por tienda cuando el cliente compra en varios negocios.
- Confirmacion multi-tienda: cada negocio recibe su propio pedido por WhatsApp.
- Descuento de 1 contacto por tienda contactada, no por carrito completo.
- Costo demo por contacto: $0.50 MXN.
- Perfil de cliente en modal con nombre, WhatsApp, direccion y referencia.
- Historial de pedidos del cliente.
- Selector de entrega o recoger que cambia productos disponibles.
- Mensaje de WhatsApp con productos, cantidades, notas, total, direccion y referencia.
- Panel de tienda con metricas, ventas, contactos y creditos restantes.
- Panel de tienda con link publico, paquetes de creditos y conversion.
- Panel de tienda con edicion de datos del negocio.
- Registro de tienda con logo, portada, direccion, contacto, descripcion publica y responsable.
- Alta de productos con tipo: comida/bebida, producto fisico o servicio.
- Campos dinamicos segun tipo: ingredientes, inventario, especificaciones, duracion o requisitos.
- Alta de productos con titulo, categoria interna, descripcion, precio e imagen.
- Disponibilidad por producto: entrega, recoger o ambos.
- Soporte para subir imagen o tomar fotografia desde celular.
- Descuentos por porcentaje o por pesos.
- Precio anterior tachado y precio nuevo visible.
- Espacios promocionados pagados de 3 dias o 7 dias.
- Edicion de productos ya publicados.
- Descarga de reporte CSV por tienda.
- Panel central del operador con ingresos estimados, tiendas, actividad y CSV general.

## Como subirlo a GitHub Pages

1. Crea un repositorio nuevo en GitHub.
2. Sube estos archivos a la raiz del repositorio:
   - `index.html`
   - `styles.css`
   - `app.js`
   - `supabase-config.js`
   - `supabase-adapter.js`
   - `.nojekyll`
   - `hamburguesas.png`
   - `pizza.png`
   - `pollo.png`
   - `postres.png`
   - `sushi.png`
   - `tacos.png`
   - `README.md`
3. En GitHub entra a `Settings`.
4. Ve a `Pages`.
5. En `Build and deployment`, elige:
   - Source: `Deploy from a branch`
   - Branch: `main`
   - Folder: `/root`
6. Guarda y espera a que GitHub genere la URL.

## Como editar datos iniciales

Abre `app.js`.

- `defaultStores`: tiendas iniciales del marketplace.
- `defaultProducts`: productos iniciales del marketplace.

## Importante

Esta version estatica esta pensada para GitHub Pages. Los registros, productos,
imagenes subidas, pedidos, contactos y creditos se guardan en el navegador con
`localStorage`.

Para venderlo como producto real, el siguiente paso es agregar backend, base de
datos, contrasenas cifradas, panel administrativo central, pasarela de pagos y
almacenamiento real de imagenes.

Se agregaron fuera de esta carpeta dos archivos planos de preparacion para produccion:

- `pueblopedidos-supabase-schema.sql`: tablas, buckets y politicas RLS para Supabase.
- `pueblopedidos-supabase-after-install.sql`: permisos y trigger para crear perfiles desde Auth.
- `pueblopedidos-supabase-plan.md`: plan de arquitectura y flujo de datos.

## Despues de crear Supabase

1. Ejecuta `pueblopedidos-supabase-after-install.sql` en el SQL Editor de Supabase.
2. En Authentication > Sign In / Providers > Email, deja activo correo/contrasena.
3. Para probar rapido, puedes desactivar temporalmente confirmacion de correo.
4. Sube tambien `supabase-config.js` y `supabase-adapter.js` a GitHub Pages.
5. El sitio ya queda con tu URL y publishable key configuradas.

La app todavia conserva el demo local mientras se cambia gradualmente a Supabase.
El siguiente trabajo es reemplazar registros, login, tiendas, productos e imagenes
para que usen `supabase-adapter.js` en vez de `localStorage`.

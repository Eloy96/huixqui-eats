# PuebloPedidos

Demo estatica de marketplace local de comida por WhatsApp.

## Que incluye esta version

- Registro/inicio como cliente.
- Registro/inicio como tienda.
- Home publico tipo marketplace, visible antes del registro.
- Menu con acceso a registro de cliente o tienda.
- Perfil de cliente en modal con nombre, WhatsApp, direccion y referencia.
- Historial de pedidos del cliente.
- Marketplace horizontal con busqueda, categorias y productos destacados.
- Carrito por tienda.
- Modal antes de WhatsApp con dos productos sugeridos de la misma tienda.
- Mensaje de WhatsApp con productos, cantidades, total, direccion y referencia del cliente.
- Panel de tienda con metricas, ventas, contactos y creditos restantes.
- Alta de productos con titulo, descripcion, precio e imagen.
- Soporte para subir imagen o tomar fotografia desde celular.
- Descuentos por porcentaje o por pesos, mostrando el campo de cantidad solo cuando aplica.
- Precio anterior tachado y precio nuevo visible.
- Destacados pagados de 3 dias o 7 dias.
- Edicion de productos ya publicados.
- Destacar productos ya publicados sin volver a darlos de alta.
- Descarga de reporte CSV por tienda.

## Como subirlo a GitHub Pages

1. Crea un repositorio nuevo en GitHub.
2. Sube estos archivos a la raiz del repositorio:
   - `index.html`
   - `styles.css`
   - `app.js`
   - `.nojekyll`
   - `assets/`
   - `README.md`
3. En GitHub entra a `Settings`.
4. Ve a `Pages`.
5. En `Build and deployment`, elige:
   - Source: `Deploy from a branch`
   - Branch: `main`
   - Folder: `/root`
6. Guarda y espera a que GitHub genere la URL.

## Como editar datos demo

Abre `app.js`.

- `defaultClient`: perfil demo del cliente.
- `defaultStores`: tiendas demo.
- `defaultProducts`: productos demo.

## Importante

Esta es una demo estatica pensada para GitHub Pages. Los registros, productos,
imagenes subidas, pedidos, contactos y creditos se guardan en el navegador con
`localStorage`.

Para venderlo como producto real, el siguiente paso es agregar backend, base de
datos, inicio de sesion real, panel administrativo central, pasarela de pagos y
almacenamiento real de imagenes.

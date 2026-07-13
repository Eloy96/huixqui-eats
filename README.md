# PuebloPedidos

Demo de marketplace local de comida con pedidos por WhatsApp y panel de contactos generados.

## Que incluye

- Pagina principal para clientes.
- Lista de locales por categoria.
- Menu por local.
- Carrito simple.
- Boton para abrir WhatsApp con mensaje preparado.
- Registro de contactos en el navegador.
- Panel de dueno con conteo de leads, calculo de cobro y exportacion CSV.

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

## Como editar locales

Abre `app.js` y modifica la lista `restaurants`.

Cada local tiene:

- `name`: nombre del negocio.
- `category`: categoria.
- `image`: ruta de imagen.
- `phone`: numero de WhatsApp en formato internacional.
- `rating`: calificacion demo.
- `time`: tiempo estimado.
- `neighborhood`: zona.
- `tags`: etiquetas.
- `menu`: productos, descripcion y precio.

## Importante

Esta version es una demo estatica. Los contactos se guardan en el navegador usando `localStorage`, no en una base de datos. Para venderlo como producto real, el siguiente paso es agregar backend, panel de administrador y usuarios para negocios.

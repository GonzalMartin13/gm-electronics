# GM Electronics — Catálogo Online

Sitio estático (HTML/CSS/JS puro, sin frameworks ni build step) para mostrar el catálogo
de GM Electronics, armar pedidos y generar un PDF que el cliente descarga y envía por mail.

## Estructura

```
gm-electronics/
├── index.html          página principal
├── css/styles.css       estilos
├── js/main.js            lógica: catálogo, búsqueda, carrito, PDF
└── data/productos.json   catálogo (760 productos, generado desde el Excel de precios)
```

## Cómo probarlo en tu máquina

Como usa `fetch()` para cargar `data/productos.json`, no alcanza con abrir `index.html`
haciendo doble clic (los navegadores bloquean `fetch` en archivos locales `file://`).
Necesitás un servidor local mínimo. Desde la carpeta del proyecto:

```bash
python3 -m http.server 8000
# o, si tenés Node:
npx serve .
```

Y abrís `http://localhost:8000`.

## Antes de publicarlo — pendientes

Busqué estos puntos con "ACTUALIZAR" / "ejemplo" en el código para que sean fáciles de encontrar:

1. **Mail y WhatsApp reales**: en `index.html` (sección `<footer>`) y en `js/main.js`
   (constante `ADMIN_EMAIL` al inicio del archivo) hay datos de contacto de ejemplo.
   Reemplazalos por los reales de GM Electronics.
2. **Imágenes de producto**: el catálogo todavía no tiene fotos vinculadas — las 2611
   imágenes que están en el Excel original quedaron pendientes de asociar a cada producto
   (lo charlamos y lo vamos a hacer en otro paso). Por ahora las cards muestran solo texto.
3. **Categorías**: las categorías se armaron automáticamente por palabras clave a partir del
   nombre de cada producto. Puede haber algún producto mal clasificado — se puede corregir
   editando el campo `"categoria"` de ese producto en `data/productos.json`.

## Cómo subirlo a GitHub desde VS Code

1. Abrí la carpeta `gm-electronics` en VS Code.
2. En el panel de **Source Control** (ícono de rama, Ctrl+Shift+G), tocá **Publish to GitHub**.
3. Elegí si el repositorio va a ser público o privado y confirmá.
4. VS Code va a crear el repo en tu cuenta y subir todos estos archivos.

Para actualizaciones futuras: guardá los cambios, andá a Source Control, escribí un mensaje
de commit, tocá el ✓ (Commit) y después **Sync Changes** para subirlo.

## Publicarlo online gratis (opcional)

Con el repo ya en GitHub, podés activar **GitHub Pages**:
`Settings → Pages → Source: rama main, carpeta /root → Save`.
En un par de minutos el sitio queda online en `https://tu-usuario.github.io/nombre-del-repo/`.

## Cómo funciona el pedido

1. El cliente navega el catálogo, filtra por categoría o busca por nombre/código.
2. Agrega productos al pedido (ícono "Pedido" arriba a la derecha).
3. Completa nombre y email en el panel del pedido.
4. Al tocar "Descargar pedido en PDF": se genera y descarga un PDF con el detalle del
   pedido, y se abre el cliente de mail del usuario con un mensaje prellenado para que
   adjunte ese PDF y lo envíe a GM Electronics.

No hay backend ni envío automático de mail — el PDF se genera 100% en el navegador
(librería `jsPDF` vía CDN) y el envío queda en manos del cliente adjuntándolo a su mail.
Si más adelante querés que el pedido llegue automáticamente sin que el cliente tenga que
adjuntar nada, hace falta agregar un backend simple (o un servicio como Formspree /
EmailJS) — lo podemos armar en otro paso.

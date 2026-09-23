/* ============================================================
   GM ELECTRONICS — catálogo online
   Carga el catálogo, maneja búsqueda/filtros, carrito y
   generación del pedido en PDF.
   ============================================================ */

const ADMIN_EMAIL = "gonzalo.m.martin@gmail.com";
const ADMIN_WHATSAPP = "11 7823-4289";
const PAGE_SIZE = 24;

const KNOWN_BRANDS = [
  "NOGANET", "NOGA", "MOTOROLA", "KOSMO", "KINGSTON", "PHILIPS", "DAIHATSU",
  "VINNIC", "SANDISK", "JBL", "HAVIT", "RAYOVAC", "QCY", "BAOFENG", "SOUL",
  "GOLDERY", "EVEREADY", "KOLKE", "JEDEL", "NOBLEX", "PHILCO", "KODAK", "HUAWEI", "SONY"
];

function detectBrand(name) {
  const upper = name.toUpperCase();
  for (const b of KNOWN_BRANDS) {
    if (new RegExp(`\\b${b}\\b`).test(upper)) return b;
  }
  return "Otras marcas";
}

const state = {
  products: [],
  categories: [],
  brands: [],
  activeCategory: "Todas",
  activeBrand: "Todas",
  sortOrder: "relevancia",
  query: "",
  visibleCount: PAGE_SIZE,
  cart: loadCart(), // { productId: { id, nombre, color, code, precio, qty } }
};

const els = {};

document.addEventListener("DOMContentLoaded", init);

async function init() {
  cacheEls();
  document.getElementById("year").textContent = new Date().getFullYear();
  document.getElementById("heroDate").textContent = new Date().toLocaleDateString("es-AR");

  try {
    const res = await fetch("data/productos.json");
    state.products = await res.json();
  } catch (err) {
    console.error("No se pudo cargar el catálogo:", err);
    els.grid.innerHTML = `<div class="empty-state">No se pudo cargar el catálogo. Verificá que estás sirviendo el sitio desde un servidor (no abriendo el archivo directo) y que data/productos.json existe.</div>`;
    return;
  }

  state.categories = ["Todas", ...new Set(state.products.map(p => p.categoria))].sort((a, b) => a === "Todas" ? -1 : a.localeCompare(b));

  state.products.forEach(p => { p.marca = detectBrand(p.nombre); });
  const brandCounts = {};
  state.products.forEach(p => { brandCounts[p.marca] = (brandCounts[p.marca] || 0) + 1; });
  const brandList = Object.keys(brandCounts).sort((a, b) => {
    if (a === "Otras marcas") return 1;
    if (b === "Otras marcas") return -1;
    return brandCounts[b] - brandCounts[a];
  });
  state.brands = ["Todas", ...brandList];

  document.getElementById("statProducts").textContent = state.products.length;
  document.getElementById("statCats").textContent = state.categories.length - 1;

  const waDigits = ADMIN_WHATSAPP.replace(/\D/g, "");
  els.headerWhatsapp.href = `https://wa.me/549${waDigits}`;
  els.headerWhatsapp.textContent = `WhatsApp: ${ADMIN_WHATSAPP}`;

  renderCategoryCarousel();
  renderBrandSelect();
  renderGrid();
  renderCart();

  els.searchInput.addEventListener("input", debounce(onSearch, 200));
  els.loadMoreBtn.addEventListener("click", () => { state.visibleCount += PAGE_SIZE; renderGrid(); });
  els.openCartBtn.addEventListener("click", openCart);
  els.closeCartBtn.addEventListener("click", closeCart);
  els.drawerOverlay.addEventListener("click", closeCart);
  els.productOverlay.addEventListener("click", (e) => { if (e.target === els.productOverlay) closeProduct(); });
  els.clearFilterBtn.addEventListener("click", clearFilters);
  els.catPrevBtn.addEventListener("click", () => els.catCarousel.scrollBy({ left: -420, behavior: "smooth" }));
  els.catNextBtn.addEventListener("click", () => els.catCarousel.scrollBy({ left: 420, behavior: "smooth" }));
  els.brandSelect.addEventListener("change", () => {
    state.activeBrand = els.brandSelect.value;
    state.visibleCount = PAGE_SIZE;
    renderGrid();
  });
  els.sortSelect.addEventListener("change", () => {
    state.sortOrder = els.sortSelect.value;
    state.visibleCount = PAGE_SIZE;
    renderGrid();
  });
}

function cacheEls() {
  els.catCarousel = document.getElementById("catCarousel");
  els.catPrevBtn = document.getElementById("catPrevBtn");
  els.catNextBtn = document.getElementById("catNextBtn");
  els.clearFilterBtn = document.getElementById("clearFilterBtn");
  els.brandSelect = document.getElementById("brandSelect");
  els.sortSelect = document.getElementById("sortSelect");
  els.grid = document.getElementById("productGrid");
  els.searchInput = document.getElementById("searchInput");
  els.sectionTitle = document.getElementById("sectionTitle");
  els.resultCount = document.getElementById("resultCount");
  els.emptyState = document.getElementById("emptyState");
  els.loadMoreBtn = document.getElementById("loadMoreBtn");
  els.openCartBtn = document.getElementById("openCartBtn");
  els.headerWhatsapp = document.getElementById("headerWhatsapp");
  els.closeCartBtn = document.getElementById("closeCartBtn");
  els.cartCount = document.getElementById("cartCount");
  els.drawerOverlay = document.getElementById("drawerOverlay");
  els.cartDrawer = document.getElementById("cartDrawer");
  els.cartBody = document.getElementById("cartBody");
  els.cartFoot = document.getElementById("cartFoot");
  els.productOverlay = document.getElementById("productOverlay");
  els.productModal = document.getElementById("productModal");
  els.toast = document.getElementById("toast");
}

/* ---------------- categories & brands ---------------- */
function renderBrandSelect() {
  els.brandSelect.innerHTML = state.brands.map(b =>
    `<option value="${escapeAttr(b)}">${b === "Todas" ? "Todas las marcas" : b}</option>`
  ).join("");
  els.brandSelect.value = state.activeBrand;
}

function renderCategoryCarousel() {
  const counts = {};
  const catImage = {};
  state.products.forEach(p => {
    counts[p.categoria] = (counts[p.categoria] || 0) + 1;
    if (!catImage[p.categoria] && p.imagen) catImage[p.categoria] = p.imagen;
  });
  const cats = state.categories.filter(c => c !== "Todas");

  els.catCarousel.innerHTML = cats.map(cat => `
    <button class="cat-card ${cat === state.activeCategory ? "active" : ""}" data-cat="${escapeAttr(cat)}">
      <div class="cat-card-img">${catImage[cat] ? `<img src="${catImage[cat]}" alt="${escapeAttr(cat)}" loading="lazy">` : ""}</div>
      <span class="cat-card-name">${cat}</span>
      <span class="cat-card-count">${counts[cat] || 0} productos</span>
    </button>
  `).join("");

  els.catCarousel.querySelectorAll(".cat-card").forEach(btn => {
    btn.addEventListener("click", () => selectCategory(btn.dataset.cat));
  });
}

function selectCategory(cat) {
  state.activeCategory = cat;
  state.visibleCount = PAGE_SIZE;
  renderCategoryCarousel();
  renderGrid();
  window.scrollTo({ top: document.getElementById("catalogo").offsetTop - 90, behavior: "smooth" });
}

function onSearch(e) {
  state.query = e.target.value.trim().toLowerCase();
  state.visibleCount = PAGE_SIZE;
  if (state.query && state.activeCategory !== "Todas") {
    state.activeCategory = "Todas";
    renderCategoryCarousel();
  }
  renderGrid();
}

function clearFilters() {
  state.query = "";
  state.activeCategory = "Todas";
  state.activeBrand = "Todas";
  state.visibleCount = PAGE_SIZE;
  els.searchInput.value = "";
  els.brandSelect.value = "Todas";
  renderCategoryCarousel();
  renderGrid();
}

function getFiltered() {
  let list = state.products.filter(p => {
    const matchesCat = state.activeCategory === "Todas" || p.categoria === state.activeCategory;
    if (!matchesCat) return false;
    const matchesBrand = state.activeBrand === "Todas" || p.marca === state.activeBrand;
    if (!matchesBrand) return false;
    if (!state.query) return true;
    const haystack = (p.nombre + " " + p.variantes.map(v => v.codigo).join(" ")).toLowerCase();
    return haystack.includes(state.query);
  });

  if (state.sortOrder === "price_asc") {
    list = [...list].sort((a, b) => a.precio_pesos - b.precio_pesos);
  } else if (state.sortOrder === "price_desc") {
    list = [...list].sort((a, b) => b.precio_pesos - a.precio_pesos);
  }

  return list;
}

/* ---------------- grid ---------------- */
function renderGrid() {
  const filtered = getFiltered();
  const visible = filtered.slice(0, state.visibleCount);

  els.sectionTitle.textContent = state.activeCategory === "Todas" ? "Todo el catálogo" : state.activeCategory;
  els.resultCount.textContent = `${filtered.length} producto${filtered.length === 1 ? "" : "s"}`;
  els.emptyState.style.display = filtered.length ? "none" : "block";
  els.loadMoreBtn.style.display = filtered.length > visible.length ? "inline-flex" : "none";
  els.clearFilterBtn.style.display = (state.activeCategory !== "Todas" || state.query || state.activeBrand !== "Todas") ? "inline-flex" : "none";

  els.grid.innerHTML = visible.map(cardHTML).join("");

  els.grid.querySelectorAll(".card").forEach(card => {
    const id = card.dataset.id;
    card.querySelector(".view-btn").addEventListener("click", () => openProduct(id));
    card.querySelector("h3").addEventListener("click", () => openProduct(id));
    card.querySelector(".add-btn").addEventListener("click", () => {
      const product = state.products.find(p => p.id === id);
      addToCart(product, product.variantes[0], 1);
    });
  });
}

function cardHTML(p) {
  const hasVariants = p.variantes.length > 1;
  return `
  <div class="card" data-id="${p.id}">
    <div class="card-img">${p.imagen ? `<img src="${p.imagen}" alt="${escapeAttr(p.nombre)}" loading="lazy">` : `<span class="no-img">Sin foto</span>`}</div>
    <span class="cat-tag">${p.categoria}</span>
    <h3>${escapeHtml(p.nombre)}</h3>
    <div class="card-meta-row">
      ${hasVariants ? `<span class="variants-note">${p.variantes.length} colores</span>` : ""}
      ${p.embalaje ? `<span class="pack-badge">${escapeHtml(p.embalaje)}</span>` : ""}
    </div>
    <div class="price-row">
      <div>
        <div class="price">${formatARS(p.precio_pesos)}</div>
        <div class="price-usd">USD ${p.precio_usd.toFixed(2)} nación</div>
      </div>
    </div>
    <div class="card-actions">
      <button class="view-btn">Ver detalle</button>
      <button class="add-btn">Agregar</button>
    </div>
  </div>`;
}

/* ---------------- product modal ---------------- */
let modalSelectedVariant = null;

function openProduct(id) {
  const p = state.products.find(x => x.id === id);
  if (!p) return;
  modalSelectedVariant = p.variantes[0];
  renderProductModal(p);
  els.productOverlay.classList.add("open");
}

function renderProductModal(p) {
  const variantsHTML = p.variantes.map(v => `
    <button class="variant-pill ${v === modalSelectedVariant ? "sel" : ""}" data-code="${v.codigo}">
      ${v.color || "Único"} <span class="code">#${v.codigo}</span>
    </button>`).join("");

  const img = (modalSelectedVariant.imagenes && modalSelectedVariant.imagenes[0]) || p.imagen;

  els.productModal.innerHTML = `
    <button class="modal-close" id="modalCloseBtn">✕</button>
    ${img ? `<div class="modal-img"><img src="${img}" alt="${escapeAttr(p.nombre)}"></div>` : ""}
    <span class="cat-tag">${p.categoria}</span>
    <h2>${escapeHtml(p.nombre)}</h2>
    <div class="meta-row">
      ${p.embalaje ? `<span><b>Embalaje:</b> ${escapeHtml(p.embalaje)}</span>` : ""}
      <span><b>Código:</b> <span class="mono" id="modalCode">${modalSelectedVariant.codigo}</span></span>
    </div>
    ${p.variantes.length > 1 ? `<div class="variant-list" id="variantList">${variantsHTML}</div>` : ""}
    <div class="price-block">
      <span class="price" id="modalPrice">${formatARS(modalSelectedVariant.precio_pesos)}</span>
      <span class="price-usd" id="modalPriceUsd">USD ${modalSelectedVariant.precio_usd.toFixed(2)} nación</span>
    </div>
    <p class="desc">${escapeHtml(p.descripcion)}</p>
    <button class="btn btn-primary" id="modalAddBtn" style="width:100%; justify-content:center">Agregar al pedido</button>
  `;

  document.getElementById("modalCloseBtn").addEventListener("click", closeProduct);
  document.getElementById("modalAddBtn").addEventListener("click", () => {
    addToCart(p, modalSelectedVariant, 1);
    closeProduct();
  });
  const list = document.getElementById("variantList");
  if (list) {
    list.querySelectorAll(".variant-pill").forEach(btn => {
      btn.addEventListener("click", () => {
        modalSelectedVariant = p.variantes.find(v => String(v.codigo) === btn.dataset.code);
        renderProductModal(p);
      });
    });
  }
}

function closeProduct() {
  els.productOverlay.classList.remove("open");
}

/* ---------------- cart ---------------- */
function loadCart() {
  try {
    return JSON.parse(localStorage.getItem("gm_cart") || "{}");
  } catch {
    return {};
  }
}
function saveCart() {
  localStorage.setItem("gm_cart", JSON.stringify(state.cart));
}

function addToCart(product, variant, qty) {
  const key = `${product.id}__${variant.codigo}`;
  if (state.cart[key]) {
    state.cart[key].qty += qty;
  } else {
    state.cart[key] = {
      key,
      nombre: product.nombre,
      color: variant.color,
      codigo: variant.codigo,
      precio_pesos: variant.precio_pesos,
      precio_usd: variant.precio_usd,
      qty,
    };
  }
  saveCart();
  renderCart();
  showToast(`${product.nombre} agregado al pedido`);
}

function updateQty(key, delta) {
  const item = state.cart[key];
  if (!item) return;
  item.qty += delta;
  if (item.qty <= 0) delete state.cart[key];
  saveCart();
  renderCart();
}

function removeItem(key) {
  delete state.cart[key];
  saveCart();
  renderCart();
}

function cartTotal() {
  return Object.values(state.cart).reduce((sum, it) => sum + it.precio_pesos * it.qty, 0);
}
function cartCount() {
  return Object.values(state.cart).reduce((sum, it) => sum + it.qty, 0);
}

function renderCart() {
  const items = Object.values(state.cart);
  els.cartCount.textContent = cartCount();

  if (!items.length) {
    els.cartBody.innerHTML = `<div class="empty-state">Todavía no agregaste productos.</div>`;
    els.cartFoot.innerHTML = "";
    return;
  }

  els.cartBody.innerHTML = items.map(it => `
    <div class="cart-item" data-key="${it.key}">
      <div class="info">
        <h4>${escapeHtml(it.nombre)}</h4>
        <div class="sub">${it.color ? it.color + " · " : ""}Cód. ${it.codigo}</div>
        <div class="qty-row">
          <button class="qty-minus">−</button>
          <span>${it.qty}</span>
          <button class="qty-plus">+</button>
          <button class="remove">Quitar</button>
        </div>
      </div>
      <div class="line-price">${formatARS(it.precio_pesos * it.qty)}</div>
    </div>
  `).join("");

  els.cartBody.querySelectorAll(".cart-item").forEach(row => {
    const key = row.dataset.key;
    row.querySelector(".qty-plus").addEventListener("click", () => updateQty(key, 1));
    row.querySelector(".qty-minus").addEventListener("click", () => updateQty(key, -1));
    row.querySelector(".remove").addEventListener("click", () => removeItem(key));
  });

  els.cartFoot.innerHTML = `
    <div class="total-row"><span>Total pedido</span><b>${formatARS(cartTotal())}</b></div>
    <div class="form-field">
      <label for="custName">Nombre y apellido</label>
      <input id="custName" type="text" placeholder="Tu nombre">
    </div>
    <div class="form-field">
      <label for="custAddress">Dirección</label>
      <input id="custAddress" type="text" placeholder="Calle, número, piso/depto">
    </div>
    <div class="form-field">
      <label for="custZone">Zona / Localidad</label>
      <input id="custZone" type="text" placeholder="Barrio, ciudad o localidad">
    </div>
    <div class="form-field">
      <label for="custWhatsapp">WhatsApp</label>
      <input id="custWhatsapp" type="text" inputmode="tel" placeholder="Ej: 11 2345-6789">
    </div>
    <div class="form-field">
      <label for="custEmail">Email de contacto</label>
      <input id="custEmail" type="email" placeholder="tu@email.com">
    </div>
    <p class="form-note">Se genera un PDF con tu pedido. Descargalo y enviálo a ${ADMIN_EMAIL} (o por WhatsApp al ${ADMIN_WHATSAPP}) para confirmarlo.</p>
    <button class="btn btn-primary" id="generateOrderBtn" style="width:100%; justify-content:center">Descargar pedido en PDF</button>
  `;
  document.getElementById("generateOrderBtn").addEventListener("click", generateOrderPDF);

  // Sólo deja escribir números, espacios, guiones, paréntesis y "+" en WhatsApp
  const whatsappInput = document.getElementById("custWhatsapp");
  whatsappInput.addEventListener("input", () => {
    whatsappInput.value = whatsappInput.value.replace(/[^0-9\s\-()+]/g, "");
  });
}

function openCart() {
  els.drawerOverlay.classList.add("open");
  els.cartDrawer.classList.add("open");
}
function closeCart() {
  els.drawerOverlay.classList.remove("open");
  els.cartDrawer.classList.remove("open");
}

/* ---------------- PDF order generation ---------------- */
function generateOrderPDF() {
  const items = Object.values(state.cart);
  if (!items.length) return;

  const name = document.getElementById("custName").value.trim();
  const address = document.getElementById("custAddress").value.trim();
  const zone = document.getElementById("custZone").value.trim();
  const whatsapp = document.getElementById("custWhatsapp").value.trim();
  const email = document.getElementById("custEmail").value.trim();

  if (!name || !address || !zone || !whatsapp || !email) {
    showToast("Completá nombre, dirección, zona, WhatsApp y email antes de generar el pedido");
    return;
  }

  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  if (!emailRegex.test(email)) {
    showToast("Ingresá un email válido, con @ y dominio (ej: nombre@mail.com)");
    return;
  }

  const phoneDigits = whatsapp.replace(/\D/g, "");
  const phoneRegex = /^[0-9\s\-()+]+$/;
  if (!phoneRegex.test(whatsapp) || phoneDigits.length < 8) {
    showToast("Ingresá un WhatsApp válido, solo números (mínimo 8 dígitos)");
    return;
  }

  const { jsPDF } = window.jspdf;
  const doc = new jsPDF();
  const marginX = 15;
  let y = 20;

  doc.setFont("helvetica", "bold");
  doc.setFontSize(18);
  doc.text("GM Electronics — Pedido", marginX, y);
  y += 8;
  doc.setFontSize(10);
  doc.setFont("helvetica", "normal");
  doc.text(`Fecha: ${new Date().toLocaleString("es-AR")}`, marginX, y);
  y += 10;

  doc.setFont("helvetica", "bold");
  doc.text("Datos del cliente", marginX, y);
  y += 6;
  doc.setFont("helvetica", "normal");
  doc.text(`Nombre: ${name}`, marginX, y); y += 6;
  doc.text(`Dirección: ${address}`, marginX, y); y += 6;
  doc.text(`Zona: ${zone}`, marginX, y); y += 6;
  doc.text(`WhatsApp: ${whatsapp}`, marginX, y); y += 6;
  doc.text(`Email: ${email}`, marginX, y); y += 6;
  y += 4;

  doc.setFont("helvetica", "bold");
  doc.text("Producto", marginX, y);
  doc.text("Cant.", 130, y);
  doc.text("Precio unit.", 150, y);
  doc.text("Subtotal", 178, y);
  y += 4;
  doc.setLineWidth(0.2);
  doc.line(marginX, y, 195, y);
  y += 6;
  doc.setFont("helvetica", "normal");
  doc.setFontSize(9);

  items.forEach(it => {
    if (y > 275) { doc.addPage(); y = 20; }
    const label = `${it.nombre}${it.color ? " (" + it.color + ")" : ""} · Cód ${it.codigo}`;
    const wrapped = doc.splitTextToSize(label, 108);
    doc.text(wrapped, marginX, y);
    doc.text(String(it.qty), 130, y);
    doc.text(formatARS(it.precio_pesos), 150, y);
    doc.text(formatARS(it.precio_pesos * it.qty), 178, y);
    y += wrapped.length * 5 + 3;
  });

  y += 4;
  doc.setLineWidth(0.3);
  doc.line(marginX, y, 195, y);
  y += 8;

  const subtotal = cartTotal();
  const iva = subtotal * 0.21;
  const totalConIva = subtotal + iva;

  doc.setFont("helvetica", "normal");
  doc.setFontSize(11);
  doc.text(`Subtotal (sin IVA): ${formatARS(subtotal)}`, marginX, y); y += 7;
  doc.text(`IVA (21%): ${formatARS(iva)}`, marginX, y); y += 7;
  doc.setFont("helvetica", "bold");
  doc.setFontSize(13);
  doc.text(`Total (con IVA): ${formatARS(totalConIva)}`, marginX, y);
  y += 12;

  doc.setFont("helvetica", "italic");
  doc.setFontSize(9);
  doc.text(`Para confirmar este pedido, envianos este PDF a ${ADMIN_EMAIL}`, marginX, y);
  y += 5;
  doc.text(`o por WhatsApp al ${ADMIN_WHATSAPP}.`, marginX, y);

  const fileName = `pedido-gm-electronics-${Date.now()}.pdf`;
  doc.save(fileName);

  const subject = encodeURIComponent(`Pedido GM Electronics — ${name}`);
  const body = encodeURIComponent(
    `Hola, les envío mi pedido (adjunto el PDF descargado: ${fileName}).\n\nNombre: ${name}\nDirección: ${address}\nZona: ${zone}\nWhatsApp: ${whatsapp}\nEmail: ${email}\n\nSubtotal (sin IVA): ${formatARS(subtotal)}\nIVA (21%): ${formatARS(iva)}\nTotal (con IVA): ${formatARS(totalConIva)}`
  );
  window.location.href = `mailto:${ADMIN_EMAIL}?subject=${subject}&body=${body}`;

  showToast("PDF descargado. Adjuntalo en el mail que se acaba de abrir.");
}

/* ---------------- helpers ---------------- */
function formatARS(n) {
  return "$" + Math.round(n).toLocaleString("es-AR");
}
function escapeHtml(s) {
  return String(s ?? "").replace(/[&<>"']/g, c => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));
}
function escapeAttr(s) {
  return escapeHtml(s);
}
function debounce(fn, ms) {
  let t;
  return (...args) => { clearTimeout(t); t = setTimeout(() => fn(...args), ms); };
}
function showToast(msg) {
  els.toast.textContent = msg;
  els.toast.classList.add("show");
  clearTimeout(showToast._t);
  showToast._t = setTimeout(() => els.toast.classList.remove("show"), 2600);
}
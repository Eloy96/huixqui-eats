const STORAGE_KEY = "pueblopedidos-v9";

function futureDate(days) {
  return new Date(Date.now() + days * 24 * 60 * 60 * 1000).toISOString();
}

const defaultStores = [
  {
    id: "burger-plaza",
    name: "Burger Plaza",
    owner: "Ana Lopez",
    phone: "5215550100202",
    email: "burger@pueblopedidos.mx",
    password: "Burger123",
    category: "Hamburguesas",
    address: "Plaza principal, local 4",
    serviceModes: "both",
    image: "./hamburguesas.png",
    rating: "4.7",
    time: "20-30 min",
    credits: 38,
    marketingSpend: 169,
  },
  {
    id: "tacos-don-luis",
    name: "Tacos Don Luis",
    owner: "Luis Martinez",
    phone: "5215550100101",
    email: "tacos@pueblopedidos.mx",
    password: "Tacos1234",
    category: "Tacos",
    address: "Calle Morelos 12, Centro",
    serviceModes: "both",
    image: "./tacos.png",
    rating: "4.8",
    time: "15-25 min",
    credits: 24,
    marketingSpend: 89,
  },
  {
    id: "pizza-la-esquina",
    name: "Pizza La Esquina",
    owner: "Rosa Nunez",
    phone: "5215550100303",
    email: "pizza@pueblopedidos.mx",
    password: "Pizza1234",
    category: "Pizza",
    address: "Esquina Zaragoza y Juarez",
    serviceModes: "delivery",
    image: "./pizza.png",
    rating: "4.6",
    time: "25-40 min",
    credits: 18,
    marketingSpend: 0,
  },
  {
    id: "postres-mia",
    name: "Postres Mia",
    owner: "Mia Garcia",
    phone: "5215550100505",
    email: "postres@pueblopedidos.mx",
    password: "Postres123",
    category: "Postres",
    address: "Mercado municipal, pasillo 2",
    serviceModes: "pickup",
    image: "./postres.png",
    rating: "4.9",
    time: "10-20 min",
    credits: 31,
    marketingSpend: 0,
  },
];

const defaultProducts = [
  {
    id: "burger-clasica",
    storeId: "burger-plaza",
    title: "Clasica con queso",
    description: "Carne, queso, lechuga y aderezo de casa.",
    price: 89,
    image: "./hamburguesas.png",
    discountType: "percent",
    discountValue: 10,
    availability: "both",
    featuredUntil: futureDate(7),
  },
  {
    id: "burger-doble",
    storeId: "burger-plaza",
    title: "Doble plaza",
    description: "Doble carne, tocino, queso y papas pequenas.",
    price: 128,
    image: "./hamburguesas.png",
    discountType: "none",
    discountValue: 0,
    availability: "delivery",
    featuredUntil: "",
  },
  {
    id: "tacos-pastor",
    storeId: "tacos-don-luis",
    title: "Orden de pastor",
    description: "5 tacos con pina, cebolla, cilantro y salsa verde.",
    price: 68,
    image: "./tacos.png",
    discountType: "amount",
    discountValue: 8,
    availability: "both",
    featuredUntil: futureDate(3),
  },
  {
    id: "pizza-pepperoni",
    storeId: "pizza-la-esquina",
    title: "Pepperoni mediana",
    description: "8 rebanadas con queso extra y orilla dorada.",
    price: 149,
    image: "./pizza.png",
    discountType: "none",
    discountValue: 0,
    availability: "delivery",
    featuredUntil: "",
  },
  {
    id: "postre-pastel",
    storeId: "postres-mia",
    title: "Rebanada de pastel",
    description: "Chocolate o tres leches, lista para recoger.",
    price: 55,
    image: "./postres.png",
    discountType: "percent",
    discountValue: 15,
    availability: "pickup",
    featuredUntil: futureDate(3),
  },
  {
    id: "pizza-mexicana",
    storeId: "pizza-la-esquina",
    title: "Pizza mexicana grande",
    description: "Chorizo, jalapeno, cebolla, queso y salsa de casa.",
    price: 219,
    image: "./pizza.png",
    discountType: "amount",
    discountValue: 20,
    availability: "pickup",
    featuredUntil: "",
  },
];

function initialDb() {
  return {
    clients: [],
    stores: defaultStores,
    products: defaultProducts,
    leads: [],
    orders: [],
    session: null,
    lastClientId: "",
    lastStoreId: "burger-plaza",
    leadPrice: 0.5,
  };
}

function loadDb() {
  try {
    const stored = JSON.parse(localStorage.getItem(STORAGE_KEY) || "null");
    if (stored && stored.products && stored.stores && stored.clients) {
      return stored;
    }
  } catch (error) {
    console.warn("No se pudo leer storage", error);
  }
  return initialDb();
}

let db = loadDb();
const state = {
  selectedCategory: "Todos",
  query: "",
  orderMode: "Entrega",
  cart: [],
  pendingImage: "",
  pendingImageFile: null,
  pendingStoreLogo: "",
  pendingStoreLogoFile: null,
  pendingStoreCover: "",
  pendingStoreCoverFile: null,
  editingProductId: "",
  selectedStoreId: "",
  selectedProductId: "",
  pendingWhatsApps: [],
};

const els = {
  authView: document.getElementById("authView"),
  authEyebrow: document.getElementById("authEyebrow"),
  authTitle: document.getElementById("authTitle"),
  closeAuthModal: document.getElementById("closeAuthModal"),
  clientView: document.getElementById("clientView"),
  storeView: document.getElementById("storeView"),
  roleNav: document.getElementById("roleNav"),
  roleButtons: document.querySelectorAll("[data-role-switch]"),
  openOwnerPanelBtn: document.getElementById("openOwnerPanelBtn"),
  openCartBtn: document.getElementById("openCartBtn"),
  cartCount: document.getElementById("cartCount"),
  openProfileBtn: document.getElementById("openProfileBtn"),
  logoutBtn: document.getElementById("logoutBtn"),
  sessionLabel: document.getElementById("sessionLabel"),
  clientLoginForm: document.getElementById("clientLoginForm"),
  clientLoginPhone: document.getElementById("clientLoginPhone"),
  clientLoginPassword: document.getElementById("clientLoginPassword"),
  clientForm: document.getElementById("clientForm"),
  clientEmail: document.getElementById("clientEmail"),
  clientPassword: document.getElementById("clientPassword"),
  storeLoginForm: document.getElementById("storeLoginForm"),
  storeLoginPhone: document.getElementById("storeLoginPhone"),
  storeLoginPassword: document.getElementById("storeLoginPassword"),
  storeForm: document.getElementById("storeForm"),
  storeLogo: document.getElementById("storeLogo"),
  storeCover: document.getElementById("storeCover"),
  storeEmail: document.getElementById("storeEmail"),
  storePassword: document.getElementById("storePassword"),
  storeServiceModes: document.getElementById("storeServiceModes"),
  storeDescription: document.getElementById("storeDescription"),
  clientAddressLabel: document.getElementById("clientAddressLabel"),
  clientReferenceLabel: document.getElementById("clientReferenceLabel"),
  editClientProfileBtn: document.getElementById("editClientProfileBtn"),
  openOrdersBtn: document.getElementById("openOrdersBtn"),
  marketArea: document.querySelector(".market-area"),
  profileModal: document.getElementById("profileModal"),
  closeProfileModal: document.getElementById("closeProfileModal"),
  clientProfileForm: document.getElementById("clientProfileForm"),
  profileName: document.getElementById("profileName"),
  profilePhone: document.getElementById("profilePhone"),
  profileAddress: document.getElementById("profileAddress"),
  profileReference: document.getElementById("profileReference"),
  clientOrders: document.getElementById("clientOrders"),
  clientOrderCount: document.getElementById("clientOrderCount"),
  ordersModalCount: document.getElementById("ordersModalCount"),
  featuredCarousel: document.getElementById("featuredCarousel"),
  storeStrip: document.getElementById("storeStrip"),
  storeSections: document.getElementById("storeSections"),
  storeProfileSection: document.getElementById("storeProfileSection"),
  publicStoreBanner: document.getElementById("publicStoreBanner"),
  publicStoreProducts: document.getElementById("publicStoreProducts"),
  backToStoresBtn: document.getElementById("backToStoresBtn"),
  searchInput: document.getElementById("searchInput"),
  categoryList: document.getElementById("categoryList"),
  productGrid: document.getElementById("productGrid"),
  cartModal: document.getElementById("cartModal"),
  closeCartModal: document.getElementById("closeCartModal"),
  orderPanel: document.getElementById("orderPanel"),
  productModal: document.getElementById("productModal"),
  closeProductModal: document.getElementById("closeProductModal"),
  productModalStore: document.getElementById("productModalStore"),
  productModalTitle: document.getElementById("productModalTitle"),
  productModalImage: document.getElementById("productModalImage"),
  productModalDescription: document.getElementById("productModalDescription"),
  productModalPrice: document.getElementById("productModalPrice"),
  productComment: document.getElementById("productComment"),
  confirmAddProduct: document.getElementById("confirmAddProduct"),
  storeTitle: document.getElementById("storeTitle"),
  storeMetrics: document.getElementById("storeMetrics"),
  productForm: document.getElementById("productForm"),
  productImage: document.getElementById("productImage"),
  imagePreview: document.getElementById("imagePreview"),
  productType: document.getElementById("productType"),
  productCategory: document.getElementById("productCategory"),
  foodFields: document.getElementById("foodFields"),
  retailFields: document.getElementById("retailFields"),
  serviceFields: document.getElementById("serviceFields"),
  productIngredients: document.getElementById("productIngredients"),
  productAllergens: document.getElementById("productAllergens"),
  productPortion: document.getElementById("productPortion"),
  productBrand: document.getElementById("productBrand"),
  productStock: document.getElementById("productStock"),
  productSpecs: document.getElementById("productSpecs"),
  productDuration: document.getElementById("productDuration"),
  productServiceArea: document.getElementById("productServiceArea"),
  productRequirements: document.getElementById("productRequirements"),
  productOptions: document.getElementById("productOptions"),
  productAvailability: document.getElementById("productAvailability"),
  discountType: document.getElementById("discountType"),
  discountValue: document.getElementById("discountValue"),
  discountValueWrap: document.getElementById("discountValueWrap"),
  featuredPlan: document.getElementById("featuredPlan"),
  productSubmitBtn: document.getElementById("productSubmitBtn"),
  cancelEditProduct: document.getElementById("cancelEditProduct"),
  storeProducts: document.getElementById("storeProducts"),
  storeProductCount: document.getElementById("storeProductCount"),
  storeContacts: document.getElementById("storeContacts"),
  storeOrders: document.getElementById("storeOrders"),
  storeSalesCount: document.getElementById("storeSalesCount"),
  creditStatus: document.getElementById("creditStatus"),
  storePublicLink: document.getElementById("storePublicLink"),
  storeQuickActions: document.getElementById("storeQuickActions"),
  exportStoreCsv: document.getElementById("exportStoreCsv"),
  addCreditsBtn: document.getElementById("addCreditsBtn"),
  storeCampaigns: document.getElementById("storeCampaigns"),
  storeProfileForm: document.getElementById("storeProfileForm"),
  profileStoreName: document.getElementById("profileStoreName"),
  profileStoreCategory: document.getElementById("profileStoreCategory"),
  profileStoreLogo: document.getElementById("profileStoreLogo"),
  profileStorePhone: document.getElementById("profileStorePhone"),
  profileStoreServiceModes: document.getElementById("profileStoreServiceModes"),
  profileStoreAddress: document.getElementById("profileStoreAddress"),
  profileStoreDescription: document.getElementById("profileStoreDescription"),
  upsellModal: document.getElementById("upsellModal"),
  upsellItems: document.getElementById("upsellItems"),
  closeUpsell: document.getElementById("closeUpsell"),
  skipUpsell: document.getElementById("skipUpsell"),
  sendFinalOrder: document.getElementById("sendFinalOrder"),
  ownerModal: document.getElementById("ownerModal"),
  closeOwnerModal: document.getElementById("closeOwnerModal"),
  ownerMetrics: document.getElementById("ownerMetrics"),
  ownerStores: document.getElementById("ownerStores"),
  ownerActivity: document.getElementById("ownerActivity"),
  exportOwnerCsv: document.getElementById("exportOwnerCsv"),
  stickyCartBar: document.getElementById("stickyCartBar"),
  toast: document.getElementById("toast"),
};

function saveDb() {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(db));
}

function money(value) {
  return Number(value || 0).toLocaleString("es-MX", {
    style: "currency",
    currency: "MXN",
  });
}

function downloadCsv(filename, rows) {
  const csv = rows.map((row) => row.map((cell) => `"${String(cell).replaceAll('"', '""')}"`).join(",")).join("\n");
  const blob = new Blob([csv], { type: "text/csv;charset=utf-8" });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = filename;
  link.click();
  URL.revokeObjectURL(url);
}

function showToast(message) {
  els.toast.textContent = message;
  els.toast.classList.add("show");
  window.clearTimeout(showToast.timer);
  showToast.timer = window.setTimeout(() => els.toast.classList.remove("show"), 2600);
}

function readImageFile(file, onLoad) {
  if (!file) return;
  const reader = new FileReader();
  reader.onload = () => onLoad(String(reader.result));
  reader.readAsDataURL(file);
}

function productTypeLabel(type) {
  const labels = {
    food: "Comida o bebida",
    retail: "Producto fisico",
    service: "Servicio",
  };
  return labels[type] || labels.food;
}

function syncProductTypeFields() {
  const type = els.productType?.value || "food";
  els.foodFields.hidden = type !== "food";
  els.retailFields.hidden = type !== "retail";
  els.serviceFields.hidden = type !== "service";
  const placeholders = {
    food: "Ingredientes principales, tamano y preparacion",
    retail: "Caracteristicas principales, marca, tamano o presentacion",
    service: "Que incluye el servicio, duracion o condiciones",
  };
  document.getElementById("productDescription").placeholder = placeholders[type] || placeholders.food;
}

function productDetailSummary(product) {
  const details = [product.description];
  if ((product.type || "food") === "food") {
    if (product.ingredients) details.push(`Ingredientes: ${product.ingredients}`);
    if (product.portion) details.push(`Porcion: ${product.portion}`);
    if (product.allergens) details.push(`Avisos: ${product.allergens}`);
  }
  if (product.type === "retail") {
    if (product.brand) details.push(`Presentacion: ${product.brand}`);
    if (product.specs) details.push(`Especificaciones: ${product.specs}`);
    if (product.stock !== "" && product.stock !== undefined) details.push(`Inventario: ${product.stock}`);
  }
  if (product.type === "service") {
    if (product.duration) details.push(`Duracion: ${product.duration}`);
    if (product.serviceArea) details.push(`Zona: ${product.serviceArea}`);
    if (product.requirements) details.push(`Requisitos: ${product.requirements}`);
  }
  if (product.options) details.push(`Opciones: ${product.options}`);
  return details.filter(Boolean).join(" | ");
}

function remoteApi() {
  const api = window.PuebloPedidosSupabase;
  return api && api.enabled ? api : null;
}

function slugify(value) {
  return String(value || "")
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 48) || `tienda-${Date.now()}`;
}

function fileExtension(file) {
  const ext = String(file?.name || "").split(".").pop();
  return ext && ext.length <= 5 ? ext.toLowerCase() : "jpg";
}

function toRemoteServiceModes(value) {
  if (value === "both") return ["delivery", "pickup"];
  if (value === "pickup" || value === "Recoger") return ["pickup"];
  return ["delivery"];
}

function fromRemoteServiceModes(modes) {
  const values = Array.isArray(modes) ? modes : [];
  if (values.includes("delivery") && values.includes("pickup")) return "both";
  if (values.includes("pickup")) return "pickup";
  return "delivery";
}

function upsertById(collection, item) {
  const index = collection.findIndex((entry) => entry.id === item.id);
  if (index >= 0) {
    collection[index] = { ...collection[index], ...item };
  } else {
    collection.unshift(item);
  }
}

function mapRemoteStore(store) {
  const api = remoteApi();
  return {
    id: store.id,
    remote: true,
    name: store.name,
    owner: store.responsible_name || "",
    phone: store.whatsapp || store.public_phone || "",
    email: store.responsible_email || "",
    password: "",
    category: store.category,
    address: store.address,
    description: store.description || "",
    serviceModes: fromRemoteServiceModes(store.service_modes),
    image: store.logo_path && api ? api.publicUrl("store-assets", store.logo_path) : defaultImageForCategory(store.category),
    coverImage: store.cover_path && api ? api.publicUrl("store-assets", store.cover_path) : "",
    rating: "Nuevo",
    time: "15-35 min",
    credits: Number(store.credits || 0),
    marketingSpend: 0,
    creditSpend: 0,
  };
}

function mapRemoteProduct(product, store) {
  const api = remoteApi();
  return {
    id: product.id,
    remote: true,
    storeId: product.store_id,
    title: product.title,
    type: product.type || "food",
    productCategory: product.category || "",
    description: product.description,
    price: Number(product.price || 0),
    image: product.main_image_path && api ? api.publicUrl("product-images", product.main_image_path) : store?.image || defaultImageForCategory(store?.category),
    discountType: product.discount_type || "none",
    discountValue: Number(product.discount_value || 0),
    availability: fromRemoteServiceModes(product.availability_modes),
    featuredUntil: product.featured_until || "",
  };
}

async function uploadRemoteStoreImages(api, store) {
  const patch = {};
  if (state.pendingStoreLogoFile) {
    patch.logo_path = await api.uploadFile("store-assets", `${store.id}/logo.${fileExtension(state.pendingStoreLogoFile)}`, state.pendingStoreLogoFile);
  }
  if (state.pendingStoreCoverFile) {
    patch.cover_path = await api.uploadFile("store-assets", `${store.id}/cover.${fileExtension(state.pendingStoreCoverFile)}`, state.pendingStoreCoverFile);
  }
  if (!Object.keys(patch).length) return store;
  return api.updateStore(store.id, patch);
}

async function uploadRemoteProductImage(api, store, product) {
  if (!state.pendingImageFile) return product;
  const imagePath = `${store.id}/${product.id}/main.${fileExtension(state.pendingImageFile)}`;
  await api.uploadFile("product-images", imagePath, state.pendingImageFile);
  return api.updateProduct(product.id, { main_image_path: imagePath });
}

function cleanStaticText() {
  const walker = document.createTreeWalker(document.body, NodeFilter.SHOW_TEXT);
  const fixes = [
    [/\u00c3\u00b1/g, "n"],
    [/\u00c3\u00a1/g, "a"],
    [/\u00c3\u00a9/g, "e"],
    [/\u00c3\u00ad/g, "i"],
    [/\u00c3\u00b3/g, "o"],
    [/\u00c3\u00ba/g, "u"],
  ];
  let node = walker.nextNode();
  while (node) {
    let value = node.nodeValue;
    fixes.forEach(([pattern, replacement]) => {
      value = value.replace(pattern, replacement);
    });
    node.nodeValue = value;
    node = walker.nextNode();
  }
}

function normalizeWhatsApp(phone) {
  const digits = String(phone || "").replace(/\D/g, "");
  if (digits.length === 10) return `521${digits}`;
  if (digits.startsWith("52")) return digits;
  return digits;
}

function samePhone(left, right) {
  return normalizeWhatsApp(left) === normalizeWhatsApp(right);
}

function sameIdentifier(identifier, profile) {
  const value = String(identifier || "").trim().toLowerCase();
  if (!value) return false;
  return value === String(profile.email || "").trim().toLowerCase() || samePhone(value, profile.phone);
}

function passwordMatches(profile, password) {
  return String(profile.password || "") === String(password || "");
}

function availabilityLabel(value) {
  const labels = {
    both: "Entrega y recoger",
    delivery: "Solo entrega",
    pickup: "Solo recoger",
  };
  return labels[value] || labels.both;
}

function productAvailableForMode(product) {
  const value = product.availability || "both";
  if (value === "both") return true;
  if (state.orderMode === "Entrega") return value === "delivery";
  return value === "pickup";
}

function currentClient() {
  if (!db.session || db.session.role !== "client") return null;
  return db.clients.find((client) => client.id === db.session.id) || null;
}

function currentStore() {
  if (!db.session || db.session.role !== "store") return null;
  return db.stores.find((store) => store.id === db.session.id) || null;
}

function getStore(storeId) {
  return db.stores.find((store) => store.id === storeId);
}

function getProduct(productId) {
  return db.products.find((product) => product.id === productId);
}

function storeHash(storeId) {
  return `#tienda/${encodeURIComponent(storeId)}`;
}

function storePublicUrl(storeId) {
  return `${window.location.href.split("#")[0]}${storeHash(storeId)}`;
}

function copyText(text, successMessage = "Copiado.") {
  if (navigator.clipboard?.writeText) {
    navigator.clipboard.writeText(text).then(() => showToast(successMessage)).catch(() => copyTextFallback(text, successMessage));
    return;
  }
  copyTextFallback(text, successMessage);
}

function copyTextFallback(text, successMessage) {
  const input = document.createElement("textarea");
  input.value = text;
  input.setAttribute("readonly", "");
  input.style.position = "fixed";
  input.style.left = "-9999px";
  document.body.appendChild(input);
  input.select();
  document.execCommand("copy");
  input.remove();
  showToast(successMessage);
}

function syncRouteFromHash() {
  const match = window.location.hash.match(/^#tienda\/(.+)$/);
  state.selectedStoreId = match ? decodeURIComponent(match[1]) : "";
}

function updateStoreRoute(storeId) {
  const nextHash = storeId ? storeHash(storeId) : "#inicio";
  if (window.location.hash !== nextHash) {
    window.history.pushState(null, "", nextHash);
  }
}

function finalPrice(product) {
  const price = Number(product.price || 0);
  const value = Number(product.discountValue || 0);
  if (product.discountType === "percent" && value > 0) {
    return Math.max(1, Math.round(price * (1 - value / 100)));
  }
  if (product.discountType === "amount" && value > 0) {
    return Math.max(1, price - value);
  }
  return price;
}

function hasDiscount(product) {
  return finalPrice(product) < Number(product.price || 0);
}

function isFeatured(product) {
  return product.featuredUntil && new Date(product.featuredUntil).getTime() > Date.now();
}

function priceMarkup(product) {
  if (!hasDiscount(product)) {
    return `<span class="new-price">${money(product.price)}</span>`;
  }
  return `
    <span class="old-price">${money(product.price)}</span>
    <span class="new-price">${money(finalPrice(product))}</span>
  `;
}

function defaultImageForCategory(category) {
  const map = {
    Hamburguesas: "./hamburguesas.png",
    Tacos: "./tacos.png",
    Pizza: "./pizza.png",
    Postres: "./postres.png",
    Pollos: "./pollo.png",
    Sushi: "./sushi.png",
  };
  return map[category] || "./hamburguesas.png";
}

function setSession(role, id) {
  db.session = { role, id };
  if (role === "client") db.lastClientId = id;
  if (role === "store") db.lastStoreId = id;
  saveDb();
  render();
}

function setVisibleView(viewName) {
  els.clientView.classList.toggle("active", viewName === "client");
  els.storeView.classList.toggle("active", viewName === "store");
}

function setAuthMode(role, mode = "login") {
  els.authEyebrow.textContent = role === "store" ? "Tienda" : "Cliente";
  els.authTitle.textContent = mode === "register" ? "Crear cuenta" : "Iniciar sesion";
  document.querySelectorAll("[data-auth-card]").forEach((card) => {
    const active = card.dataset.authCard === role;
    card.classList.toggle("active-auth-card", active);
    card.hidden = !active;
  });
  const activeCard = document.querySelector(`[data-auth-card="${role}"]`);
  activeCard?.querySelector(".auth-login-form")?.toggleAttribute("hidden", mode === "register");
  activeCard?.querySelector(".auth-links")?.toggleAttribute("hidden", mode === "register");
  activeCard?.querySelector(".register-form")?.toggleAttribute("hidden", mode !== "register");
}

function openAuthModal(role = "client") {
  setAuthMode(role, "login");
  els.authView.hidden = false;
  const firstInput = role === "store" ? els.storeLoginPhone : els.clientLoginPhone;
  window.setTimeout(() => firstInput?.focus(), 50);
}

function closeAuthModal() {
  els.authView.hidden = true;
}

function openCartModal() {
  els.cartModal.hidden = false;
  renderOrderPanel();
}

function closeCartModal() {
  els.cartModal.hidden = true;
  renderCartBadge();
}

function cartItemsCount() {
  return state.cart.reduce((sum, item) => sum + item.qty, 0);
}

function renderCartBadge() {
  const count = cartItemsCount();
  els.cartCount.textContent = count;
  els.openCartBtn.classList.toggle("has-items", count > 0);
  const groups = cartGroups();
  const shouldShowSticky = count > 0 && db.session?.role !== "store" && els.cartModal.hidden;
  els.stickyCartBar.hidden = !shouldShowSticky;
  if (shouldShowSticky) {
    els.stickyCartBar.innerHTML = `
      <span>${count} producto${count === 1 ? "" : "s"} en ${groups.length} tienda${groups.length === 1 ? "" : "s"}</span>
      <strong>${money(cartTotal())} - Ver carrito</strong>
    `;
  }
}

function renderHeader() {
  const role = db.session?.role;
  els.logoutBtn.hidden = !role;
  els.openProfileBtn.hidden = role !== "client";
  els.openCartBtn.hidden = role === "store";
  renderCartBadge();
  els.roleButtons.forEach((button) => {
    button.classList.toggle("active", button.dataset.roleSwitch === role);
  });

  if (!role) {
    els.sessionLabel.textContent = "Explora sin registro";
    return;
  }

  const profile = role === "client" ? currentClient() : currentStore();
  els.sessionLabel.textContent = role === "client" ? `Cliente: ${profile?.name || ""}` : `Tienda: ${profile?.name || ""}`;
}

function render() {
  renderHeader();
  if (!db.session) {
    setVisibleView("client");
    renderClient();
    return;
  }

  if (db.session.role === "client" && currentClient()) {
    setVisibleView("client");
    renderClient();
    return;
  }

  if (db.session.role === "store" && currentStore()) {
    setVisibleView("store");
    renderStore();
    return;
  }

  db.session = null;
  saveDb();
  setVisibleView("client");
  renderClient();
}

function categories() {
  return ["Todos", ...new Set(db.stores.map((store) => store.category))];
}

function productsForCatalog() {
  const query = state.query.trim().toLowerCase();
  return db.products
    .filter((product) => {
      const store = getStore(product.storeId);
      if (!store) return false;
      const categoryMatch = state.selectedCategory === "Todos" || store.category === state.selectedCategory;
      const haystack = `${product.title} ${product.description} ${product.productCategory || ""} ${product.ingredients || ""} ${product.brand || ""} ${product.specs || ""} ${productTypeLabel(product.type)} ${store.name} ${store.category}`.toLowerCase();
      return categoryMatch && productAvailableForMode(product) && (!query || haystack.includes(query));
    })
    .sort((a, b) => Number(isFeatured(b)) - Number(isFeatured(a)));
}

function renderClient() {
  const client = currentClient();
  els.clientAddressLabel.textContent = client?.address || "Centro del pueblo";
  els.clientReferenceLabel.textContent = client?.reference || "Registrate para guardar direccion y pedir mas rapido";
  els.editClientProfileBtn.textContent = client ? "Editar perfil" : "Agregar direccion";
  els.openOrdersBtn.hidden = !client;
  if (client) {
    els.profileName.value = client.name;
    els.profilePhone.value = client.phone;
    els.profileAddress.value = client.address;
    els.profileReference.value = client.reference || "";
  }
  renderClientOrders();
  renderFeatured();
  renderStores();
  renderCategories();
  renderProducts();
  renderOrderPanel();
}

function renderClientOrders() {
  const client = currentClient();
  if (!client) {
    els.clientOrderCount.textContent = "0";
    els.ordersModalCount.textContent = "0";
    els.clientOrders.innerHTML = `<p class="muted">Registrate como cliente para ver tu historial.</p>`;
    return;
  }
  const orders = db.orders.filter((order) => order.clientId === client.id).reverse();
  els.clientOrderCount.textContent = orders.length;
  els.ordersModalCount.textContent = orders.length;
  els.clientOrders.innerHTML = orders.length
    ? orders
        .slice(0, 6)
        .map((order) => {
          const store = getStore(order.storeId);
          return `
            <div class="mini-row">
              <div>
                <strong>${store?.name || "Tienda"}</strong>
                <small>${new Date(order.createdAt).toLocaleString("es-MX")} - ${order.items.length} producto(s)${order.batchTotal > 1 ? ` - Pedido ${order.batchIndex}/${order.batchTotal}` : ""}</small>
              </div>
              <span>${money(order.total)}</span>
            </div>
          `;
        })
        .join("")
    : `<p class="muted">Aun no hay pedidos.</p>`;
}

function openProfileModal() {
  els.profileModal.hidden = false;
}

function closeProfileModal() {
  els.profileModal.hidden = true;
}

function syncDiscountField() {
  const hasDiscountChoice = els.discountType.value !== "none";
  els.discountValueWrap.hidden = !hasDiscountChoice;
  els.discountValue.required = hasDiscountChoice;
  els.discountValue.disabled = !hasDiscountChoice;
  if (!hasDiscountChoice) {
    els.discountValue.value = "";
  }
}

function renderFeatured() {
  const featured = db.products.filter((product) => isFeatured(product) && productAvailableForMode(product)).slice(0, 8);
  els.featuredCarousel.innerHTML = featured.length
    ? featured
        .map((product) => {
          const store = getStore(product.storeId);
          return `
            <article class="featured-card">
              <img src="${product.image}" alt="${product.title}" />
              <div class="featured-body">
                <span class="badge">Promocionado</span>
                <h3>${product.title}</h3>
                <div class="product-meta">
                  <span>${store?.name || "Tienda"}</span>
                  <span>${store?.time || ""}</span>
                </div>
                <div class="price-row">${priceMarkup(product)}</div>
                <button class="primary-button compact" data-view-product="${product.id}" type="button">Ver producto</button>
              </div>
            </article>
          `;
        })
        .join("")
    : `<div class="cart-empty"><strong>No hay promociones activas</strong><span>Las tiendas pueden comprar espacios desde su panel.</span></div>`;
}

function productsForStore(storeId) {
  return db.products.filter((product) => product.storeId === storeId && productAvailableForMode(product));
}

function storeCardMarkup(store) {
  const count = productsForStore(store.id).length;
  if (!count) return "";
  return `
    <a class="store-card-public" href="${storeHash(store.id)}" data-open-store="${store.id}">
      <img src="${store.image}" alt="${store.name}" />
      <span>
        <strong>${store.name}</strong>
        <small>${store.category} - ${store.rating} - ${store.time}</small>
        <em>${count} producto${count === 1 ? "" : "s"} - ${availabilityLabel(store.serviceModes)}</em>
      </span>
    </a>
  `;
}

function renderStores() {
  const availableStores = db.stores.filter((store) => productsForStore(store.id).length);
  els.storeStrip.innerHTML = availableStores.map(storeCardMarkup).join("");
  const categorySections = categories()
    .filter((category) => category !== "Todos")
    .map((category) => {
      const stores = availableStores.filter((store) => store.category === category);
      if (!stores.length) return "";
      return `
        <section class="store-category-row">
          <div class="section-title compact-title">
            <div>
              <span class="eyebrow">${category}</span>
              <h2>${category} disponibles</h2>
            </div>
          </div>
          <div class="store-strip">${stores.map(storeCardMarkup).join("")}</div>
        </section>
      `;
    })
    .join("");
  els.storeSections.innerHTML = categorySections;
  renderSelectedStore();
}

function renderCategories() {
  els.categoryList.innerHTML = categories()
    .map((category) => {
      const count =
        category === "Todos"
          ? db.products.filter(productAvailableForMode).length
          : db.products.filter((product) => productAvailableForMode(product) && getStore(product.storeId)?.category === category).length;
      return `
        <button class="category-button ${state.selectedCategory === category ? "active" : ""}" data-category="${category}" type="button">
          <span>${category}</span>
          <span>${count}</span>
        </button>
      `;
    })
    .join("");
}

function renderProducts() {
  const products = productsForCatalog();
  els.productGrid.innerHTML = products.length
    ? products
        .map((product) => {
          const store = getStore(product.storeId);
          return `
            <article class="product-card">
              <div class="product-image">
                <img src="${product.image}" alt="${product.title}" />
                ${isFeatured(product) ? `<span class="badge">Destacado</span>` : ""}
              </div>
              <div class="product-body">
                <div>
                  <h3>${product.title}</h3>
                  <p>${product.description}</p>
                </div>
                <div class="product-meta">
                  <span>${store?.name || "Tienda"}</span>
                  <span>${store?.rating || "4.7"} - ${store?.time || ""}</span>
                </div>
                <span class="availability-pill">${availabilityLabel(product.availability)}</span>
                <div class="price-row">${priceMarkup(product)}</div>
                <button class="add-button" data-view-product="${product.id}" type="button">Ver detalle</button>
              </div>
            </article>
          `;
        })
        .join("")
    : `<div class="cart-empty"><strong>No encontramos productos</strong><span>Prueba otra busqueda o categoria.</span></div>`;
}

function productCardMarkup(product) {
  return `
    <article class="product-card">
      <div class="product-image">
        <img src="${product.image}" alt="${product.title}" />
        ${isFeatured(product) ? `<span class="badge">Promocionado</span>` : ""}
      </div>
      <div class="product-body">
        <div>
          <h3>${product.title}</h3>
          <p>${product.description}</p>
        </div>
        <span class="availability-pill">${availabilityLabel(product.availability)}</span>
        <div class="price-row">${priceMarkup(product)}</div>
        <button class="add-button" data-view-product="${product.id}" type="button">Ver detalle</button>
      </div>
    </article>
  `;
}

function menuItemMarkup(product) {
  return `
    <article class="menu-item" data-view-product="${product.id}" role="button" tabindex="0" aria-label="Ver detalle de ${product.title}">
      <div class="menu-item-body">
        <div class="menu-item-title-row">
          <h3>${product.title}</h3>
          ${isFeatured(product) ? `<span class="badge compact-badge">Promocionado</span>` : ""}
        </div>
        <p>${product.description}</p>
        <div class="menu-item-meta">
          <span class="availability-pill">${product.productCategory || productTypeLabel(product.type)}</span>
          <span class="availability-pill">${availabilityLabel(product.availability)}</span>
          <div class="price-row">${priceMarkup(product)}</div>
        </div>
      </div>
      <img src="${product.image}" alt="${product.title}" />
    </article>
  `;
}

function renderSelectedStore() {
  els.marketArea.classList.toggle("store-mode", Boolean(state.selectedStoreId));
  if (!state.selectedStoreId) {
    els.storeProfileSection.hidden = true;
    return;
  }
  const store = getStore(state.selectedStoreId);
  if (!store) {
    state.selectedStoreId = "";
    els.marketArea.classList.remove("store-mode");
    els.storeProfileSection.hidden = true;
    return;
  }
  const products = productsForStore(store.id);
  els.storeProfileSection.hidden = false;
  els.publicStoreBanner.innerHTML = `
    <img src="${store.image}" alt="${store.name}" />
    <div>
      <span class="eyebrow">${store.category}</span>
      <h2>${store.name}</h2>
      <p>${store.address}</p>
      ${store.description ? `<p>${store.description}</p>` : ""}
      <div class="product-meta">
        <span>${store.rating} - ${store.time}</span>
        <span>${availabilityLabel(store.serviceModes)}</span>
      </div>
      <div class="store-link-row">
        <small>${storePublicUrl(store.id)}</small>
        <button class="ghost-button compact" data-copy-store-link="${store.id}" type="button">Copiar link</button>
      </div>
    </div>
  `;
  els.publicStoreProducts.innerHTML = products.length
    ? products.map(menuItemMarkup).join("")
    : `<div class="cart-empty"><strong>Sin productos para ${state.orderMode.toLowerCase()}</strong><span>Prueba cambiar el modo de pedido.</span></div>`;
}

function cartStore() {
  return cartGroups()[0]?.store || null;
}

function cartGroups() {
  const groups = [];
  state.cart.forEach((item) => {
    const product = getProduct(item.productId);
    const store = product ? getStore(product.storeId) : null;
    if (!product || !store) return;
    let group = groups.find((entry) => entry.store.id === store.id);
    if (!group) {
      group = { store, items: [] };
      groups.push(group);
    }
    group.items.push({ ...item, product });
  });
  return groups;
}

function cartGroupTotal(group) {
  return group.items.reduce((sum, item) => sum + finalPrice(item.product) * item.qty, 0);
}

function cartGroupCount(group) {
  return group.items.reduce((sum, item) => sum + item.qty, 0);
}

function cartTotal() {
  return cartGroups().reduce((sum, group) => sum + cartGroupTotal(group), 0);
}

function renderWhatsAppQueue() {
  const queue = state.pendingWhatsApps || [];
  const opened = queue.filter((item) => item.opened).length;
  els.orderPanel.innerHTML = `
    <div class="checkout-steps">
      <span class="done">Carrito</span>
      <span class="done">Datos</span>
      <span class="active">WhatsApp</span>
    </div>
    <span class="eyebrow">WhatsApp</span>
    <h2>Envia ${queue.length} pedidos separados</h2>
    <p class="cart-note">Cada negocio recibe solo sus productos. Si el navegador bloqueo una pestaña, abre manualmente el WhatsApp pendiente.</p>
    <div class="whatsapp-queue">
      ${queue
        .map(
          (item, index) => `
            <button class="queue-button ${item.opened ? "opened" : ""}" data-open-whatsapp="${item.orderId}" type="button">
              <span>${index + 1}. ${item.storeName}</span>
              <strong>${item.opened ? "Reabrir WhatsApp" : "Abrir WhatsApp"}</strong>
            </button>
          `,
        )
        .join("")}
    </div>
    <div class="total-row">
      <span>WhatsApps abiertos</span>
      <span>${opened}/${queue.length}</span>
    </div>
    <button class="ghost-button" data-clear-whatsapp-queue type="button">Listo, cerrar</button>
  `;
}

function renderOrderPanel() {
  renderCartBadge();
  const client = currentClient();
  if ((state.pendingWhatsApps || []).length) {
    renderWhatsAppQueue();
    return;
  }
  const groups = cartGroups();
  if (!groups.length) {
    els.orderPanel.innerHTML = `
      <div class="cart-empty">
        <strong>Tu pedido esta vacio</strong>
        <span>Agrega productos y el sistema preparara el WhatsApp.</span>
      </div>
    `;
    return;
  }

  const storesLabel = groups.length === 1 ? "1 tienda" : `${groups.length} tiendas`;
  els.orderPanel.innerHTML = `
    <div class="checkout-steps">
      <span class="active">Carrito</span>
      <span class="${client ? "done" : ""}">Datos</span>
      <span>WhatsApp</span>
    </div>
    <span class="eyebrow">${state.orderMode}</span>
    <h2>Tu compra: ${storesLabel}</h2>
    <div class="address-box">
      <strong>${client ? "Direccion guardada" : "Direccion pendiente"}</strong><br />
      ${client ? client.address : "Registrate como cliente para agregar direccion al WhatsApp."}<br />
      ${client?.reference ? `<small>${client.reference}</small>` : ""}
    </div>
    ${
      groups.length > 1
        ? `<p class="cart-note">Tienes productos de ${groups.length} tiendas. Se generara un pedido y un WhatsApp separado para cada negocio.</p>`
        : `<p class="cart-note">Este pedido se enviara directo al WhatsApp de la tienda.</p>`
    }
    ${groups
      .map(
        (group) => `
          <section class="cart-store-group">
            <div class="cart-store-head">
              <div>
                <strong>${group.store.name}</strong>
                <small>${cartGroupCount(group)} producto(s)</small>
              </div>
              <span>${money(cartGroupTotal(group))}</span>
            </div>
            <div class="cart-list">
              ${group.items
                .map(
                  (item) => `
                    <div class="cart-row">
                      <div>
                        <strong>${item.qty} x ${item.product.title}</strong>
                        <small>${money(finalPrice(item.product) * item.qty)}</small>
                        ${item.note ? `<small>Nota: ${item.note}</small>` : ""}
                      </div>
                      <button class="remove-button" data-remove-line="${item.lineId}" type="button">Quitar</button>
                    </div>
                  `,
                )
                .join("")}
            </div>
          </section>
        `,
      )
      .join("")}
    <div class="total-row">
      <span>Total estimado</span>
      <span>${money(cartTotal())}</span>
    </div>
    <button class="primary-button" id="openUpsell" type="button">${client ? `Enviar ${groups.length === 1 ? "pedido" : `${groups.length} pedidos`} por WhatsApp` : "Iniciar sesion para enviar"}</button>
    <p class="muted">${groups.length === 1 ? "Antes de enviar se mostraran sugeridos de la misma tienda." : "Cada tienda recibe solo su parte del pedido y consume 1 contacto."}</p>
  `;
}

function openProductModal(productId) {
  const product = getProduct(productId);
  const store = product ? getStore(product.storeId) : null;
  if (!product || !store) return;
  state.selectedProductId = productId;
  els.productModalStore.textContent = store.name;
  els.productModalTitle.textContent = product.title;
  els.productModalImage.src = product.image;
  els.productModalImage.alt = product.title;
  els.productModalDescription.textContent = productDetailSummary(product);
  els.productModalPrice.innerHTML = priceMarkup(product);
  els.productComment.value = "";
  els.productModal.hidden = false;
  window.setTimeout(() => els.productComment.focus(), 50);
}

function closeProductModal() {
  els.productModal.hidden = true;
  state.selectedProductId = "";
}

function addToCart(productId, silent = false, note = "") {
  const product = getProduct(productId);
  if (!product) return;
  const addingNewStore =
    state.cart.length > 0 && !state.cart.some((item) => getProduct(item.productId)?.storeId === product.storeId);
  state.pendingWhatsApps = [];

  const cleanNote = note.trim();
  const existing = state.cart.find((item) => item.productId === productId && (item.note || "") === cleanNote);
  if (existing) {
    existing.qty += 1;
  } else {
    state.cart.push({ lineId: `line-${Date.now()}-${Math.random().toString(16).slice(2)}`, productId, qty: 1, note: cleanNote });
  }
  renderClient();
  if (!silent) {
    if (addingNewStore) {
      showToast("Agregamos otra tienda. Se enviara como pedido separado.");
    }
    openCartModal();
  }
}

function removeFromCart(lineId) {
  state.cart = state.cart.filter((item) => item.lineId !== lineId);
  renderClient();
}

function openUpsellModal() {
  const client = currentClient();
  if (!client) {
    closeCartModal();
    openAuthModal("client");
    showToast("Inicia sesion o crea cuenta para enviar el pedido.");
    return;
  }
  if (!client.address || !client.phone) {
    showToast("Completa tu direccion y WhatsApp antes de enviar.");
    return;
  }
  if (!state.cart.length) {
    showToast("Agrega un producto primero.");
    return;
  }

  const groups = cartGroups();
  if (!groups.length) return;
  const cartIds = new Set(state.cart.map((item) => item.productId));
  const suggestions = groups
    .flatMap((group) =>
      db.products
        .filter((product) => product.storeId === group.store.id && productAvailableForMode(product) && !cartIds.has(product.id))
        .slice(0, groups.length === 1 ? 2 : 1),
    )
    .slice(0, 3);

  els.upsellItems.innerHTML = suggestions.length
    ? suggestions
        .map(
          (product) => {
            const store = getStore(product.storeId);
            return `
          <article class="upsell-card">
            <img src="${product.image}" alt="${product.title}" />
            <div>
              <h3>${product.title}</h3>
              <small>${store?.name || "Tienda"}</small>
              <p>${product.description}</p>
              <div class="price-row">${priceMarkup(product)}</div>
              <button class="add-button" data-upsell-add="${product.id}" type="button">Agregar</button>
            </div>
          </article>
        `;
          },
        )
        .join("")
    : `<div class="cart-empty"><strong>Todo listo</strong><span>No hay sugeridos disponibles para estas tiendas.</span></div>`;

  els.skipUpsell.textContent = groups.length === 1 ? "No gracias, enviar" : "No gracias, enviar pedidos";
  els.sendFinalOrder.textContent = groups.length === 1 ? "Enviar pedido" : `Enviar ${groups.length} pedidos`;
  els.upsellModal.hidden = false;
}

function closeUpsellModal() {
  els.upsellModal.hidden = true;
}

function orderItemsForGroup(group) {
  return group.items
    .map((item) => {
      return {
        productId: item.product.id,
        title: item.product.title,
        qty: item.qty,
        price: finalPrice(item.product),
        note: item.note || "",
      };
    })
    .filter(Boolean);
}

function whatsAppMessageForOrder(order, store, client) {
  const orderLines = order.items
    .map((item) => `${item.qty} x ${item.title} (${money(item.qty * item.price)})${item.note ? ` - Nota: ${item.note}` : ""}`)
    .join("\n");
  return [
    `Hola, vi su menu en PuebloPedidos.`,
    ``,
    order.batchTotal > 1 ? `Pedido ${order.batchIndex} de ${order.batchTotal} de esta compra. Este mensaje es solo para ${store.name}.` : "",
    `Pedido para ${store.name}:`,
    orderLines,
    ``,
    `Total estimado: ${money(order.total)}`,
    `Modo: ${order.mode}`,
    `Cliente: ${client.name}`,
    `WhatsApp cliente: ${client.phone}`,
    `Direccion: ${client.address}`,
    client.reference ? `Referencia: ${client.reference}` : "",
    ``,
    `Me confirma disponibilidad?`,
  ]
    .filter(Boolean)
    .join("\n");
}

function sendOrder() {
  const client = currentClient();
  const groups = cartGroups();
  if (!client || !groups.length) return;

  const createdAt = new Date().toISOString();
  const batchId = `batch-${Date.now()}`;
  const queue = groups.map((group, index) => {
    const store = group.store;
    const items = orderItemsForGroup(group);
    const total = items.reduce((sum, item) => sum + item.qty * item.price, 0);
    const billable = store.credits > 0;
    if (billable) store.credits -= 1;

    const order = {
      id: `${batchId}-${index + 1}`,
      batchId,
      batchIndex: index + 1,
      batchTotal: groups.length,
      clientId: client.id,
      storeId: store.id,
      mode: state.orderMode,
      items,
      total,
      address: client.address,
      reference: client.reference,
      createdAt,
    };

    const lead = {
      id: `lead-${Date.now()}-${index + 1}`,
      clientId: client.id,
      storeId: store.id,
      orderId: order.id,
      batchId,
      total,
      billable,
      creditAfter: store.credits,
      createdAt,
    };

    db.orders.push(order);
    db.leads.push(lead);

    const message = whatsAppMessageForOrder(order, store, client);
    return {
      orderId: order.id,
      storeId: store.id,
      storeName: store.name,
      url: `https://wa.me/${normalizeWhatsApp(store.phone)}?text=${encodeURIComponent(message)}`,
      opened: false,
      billable,
    };
  });

  saveDb();

  state.cart = [];
  closeUpsellModal();
  if (queue.length === 1) {
    state.pendingWhatsApps = [];
    closeCartModal();
    renderClient();
    window.open(queue[0].url, "_blank", "noopener,noreferrer");
    showToast(queue[0].billable ? "Pedido enviado y contacto descontado." : "Pedido enviado. La tienda ya no tenia creditos.");
    return;
  }

  queue[0].opened = true;
  state.pendingWhatsApps = queue;
  renderClient();
  openCartModal();
  window.open(queue[0].url, "_blank", "noopener,noreferrer");
  showToast(`Se crearon ${queue.length} pedidos. Abre un WhatsApp por tienda.`);
}

function renderStore() {
  const store = currentStore();
  els.storeTitle.textContent = store.name;
  renderStoreMetrics();
  renderStoreProfile();
  renderStoreQuickActions();
  renderStoreCampaigns();
  renderStoreProducts();
  renderStoreContacts();
  renderStoreOrders();
}

function renderStoreProfile() {
  const store = currentStore();
  els.profileStoreName.value = store.name;
  els.profileStoreCategory.value = store.category;
  els.profileStorePhone.value = store.phone;
  els.profileStoreServiceModes.value = store.serviceModes || "both";
  els.profileStoreAddress.value = store.address;
  els.profileStoreDescription.value = store.description || "";
}

function creditPackagePrice(amount) {
  const prices = {
    20: 10,
    50: 25,
    120: 55,
  };
  return prices[amount] || amount * Number(db.leadPrice || 0.5);
}

function buyCredits(amount) {
  const store = currentStore();
  if (!store) return;
  const credits = Number(amount || 0);
  const price = creditPackagePrice(credits);
  store.credits = Number(store.credits || 0) + credits;
  store.creditSpend = Number(store.creditSpend || 0) + price;
  saveDb();
  renderStore();
  if (!els.ownerModal.hidden) renderOwnerPanel();
  showToast(`Recarga agregada: +${credits} contactos por ${money(price)}.`);
}

function renderStoreQuickActions() {
  const store = currentStore();
  const url = storePublicUrl(store.id);
  const contactsUsed = storeLeads().length;
  const conversion = contactsUsed ? Math.round((storeOrders().length / contactsUsed) * 100) : 0;
  els.storePublicLink.textContent = storeHash(store.id);
  els.storeQuickActions.innerHTML = `
    <article class="command-card">
      <span class="eyebrow">Link publico</span>
      <strong>${store.name}</strong>
      <small>${url}</small>
      <button class="ghost-button compact" data-copy-store-link="${store.id}" type="button">Copiar link de tienda</button>
    </article>
    <article class="command-card">
      <span class="eyebrow">Creditos</span>
      <strong>${store.credits} contactos</strong>
      <small>Cada WhatsApp generado descuenta 1 contacto.</small>
      <div class="package-row">
        <button class="add-button" data-buy-credits="20" type="button">+20 ${money(10)}</button>
        <button class="add-button" data-buy-credits="50" type="button">+50 ${money(25)}</button>
        <button class="add-button" data-buy-credits="120" type="button">+120 ${money(55)}</button>
      </div>
    </article>
    <article class="command-card">
      <span class="eyebrow">Conversion</span>
      <strong>${conversion}%</strong>
      <small>${storeOrders().length} venta(s) desde ${contactsUsed} contacto(s).</small>
      <button class="ghost-button compact" data-scroll-store-products type="button">Revisar productos</button>
    </article>
  `;
}

function renderStoreCampaigns() {
  const promoted = storeProducts().filter(isFeatured);
  els.storeCampaigns.innerHTML = `
    <div class="campaign-plans">
      <div>
        <strong>3 dias arriba del home</strong>
        <small>$89 por producto promocionado</small>
      </div>
      <div>
        <strong>7 dias arriba del home</strong>
        <small>$169 por producto promocionado</small>
      </div>
    </div>
    ${
      promoted.length
        ? promoted
            .map(
              (product) => `
              <div class="campaign-row">
                <div>
                  <strong>${product.title}</strong>
                  <small>Visible hasta ${new Date(product.featuredUntil).toLocaleDateString("es-MX")} - ${availabilityLabel(product.availability)}</small>
                </div>
                <span>${money(finalPrice(product))}</span>
              </div>
            `,
            )
            .join("")
        : `<p class="muted">Aun no tienes productos promocionados. Usa los botones de 3 o 7 dias en Mis productos.</p>`
    }
  `;
}

function storeProducts() {
  const store = currentStore();
  return db.products.filter((product) => product.storeId === store.id);
}

function storeOrders() {
  const store = currentStore();
  return db.orders.filter((order) => order.storeId === store.id);
}

function storeLeads() {
  const store = currentStore();
  return db.leads.filter((lead) => lead.storeId === store.id);
}

function platformStats() {
  const billableContacts = db.leads.filter((lead) => lead.billable).length;
  const contactRevenue = billableContacts * Number(db.leadPrice || 0.5);
  const creditRevenue = db.stores.reduce((sum, store) => sum + Number(store.creditSpend || 0), 0);
  const marketingRevenue = db.stores.reduce((sum, store) => sum + Number(store.marketingSpend || 0), 0);
  const salesTotal = db.orders.reduce((sum, order) => sum + Number(order.total || 0), 0);
  const activePromos = db.products.filter(isFeatured).length;
  const lowCreditStores = db.stores.filter((store) => Number(store.credits || 0) <= 5).length;
  return {
    billableContacts,
    contactRevenue,
    creditRevenue,
    marketingRevenue,
    salesTotal,
    activePromos,
    lowCreditStores,
    platformRevenue: contactRevenue + creditRevenue + marketingRevenue,
  };
}

function openOwnerPanel() {
  renderOwnerPanel();
  els.ownerModal.hidden = false;
}

function closeOwnerPanel() {
  els.ownerModal.hidden = true;
}

function renderOwnerPanel() {
  const stats = platformStats();
  const ownerMetrics = [
    ["Ingreso plataforma", money(stats.platformRevenue)],
    ["Contactos cobrados", stats.billableContacts],
    ["Creditos vendidos", money(stats.creditRevenue)],
    ["Publicidad vendida", money(stats.marketingRevenue)],
    ["Venta estimada locales", money(stats.salesTotal)],
    ["Tiendas activas", db.stores.length],
    ["Promos activas", stats.activePromos],
    ["Tiendas sin creditos", stats.lowCreditStores],
  ];

  els.ownerMetrics.innerHTML = ownerMetrics
    .map(
      ([label, value]) => `
        <div class="metric-card">
          <span>${label}</span>
          <strong>${value}</strong>
        </div>
      `,
    )
    .join("");

  els.ownerStores.innerHTML = db.stores
    .map((store) => {
      const leads = db.leads.filter((lead) => lead.storeId === store.id);
      const orders = db.orders.filter((order) => order.storeId === store.id);
      const products = db.products.filter((product) => product.storeId === store.id);
      const storeRevenue = leads.filter((lead) => lead.billable).length * Number(db.leadPrice || 0.5) + Number(store.creditSpend || 0) + Number(store.marketingSpend || 0);
      return `
        <div class="mini-row owner-store-row">
          <div>
            <strong>${store.name}</strong>
            <small>${store.category} - ${products.length} producto(s) - ${leads.length} contacto(s) - ${orders.length} pedido(s)</small>
            <small>${storeHash(store.id)}</small>
          </div>
          <div class="mini-actions">
            <span>${money(storeRevenue)}</span>
            <button class="ghost-button compact" data-copy-store-link="${store.id}" type="button">Copiar</button>
          </div>
        </div>
      `;
    })
    .join("");

  const activity = [
    ...db.leads.map((lead) => ({ type: "Contacto", createdAt: lead.createdAt, storeId: lead.storeId, total: lead.total })),
    ...db.orders.map((order) => ({ type: "Pedido", createdAt: order.createdAt, storeId: order.storeId, total: order.total })),
    ...db.products.filter(isFeatured).map((product) => ({ type: "Promo activa", createdAt: product.featuredUntil, storeId: product.storeId, total: finalPrice(product) })),
  ]
    .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())
    .slice(0, 10);

  els.ownerActivity.innerHTML = activity.length
    ? activity
        .map((item) => {
          const store = getStore(item.storeId);
          return `
            <div class="mini-row">
              <div>
                <strong>${item.type}</strong>
                <small>${store?.name || "Tienda"} - ${new Date(item.createdAt).toLocaleString("es-MX")}</small>
              </div>
              <span>${money(item.total)}</span>
            </div>
          `;
        })
        .join("")
    : `<p class="muted">Aun no hay actividad registrada.</p>`;
}

function renderStoreMetrics() {
  const store = currentStore();
  const orders = storeOrders();
  const leads = storeLeads();
  const revenue = orders.reduce((sum, order) => sum + order.total, 0);
  const platformSpend = Number(store.creditSpend || 0) + Number(store.marketingSpend || 0) + leads.filter((lead) => lead.billable).length * Number(db.leadPrice || 0.5);
  const metrics = [
    ["Creditos restantes", store.credits],
    ["Contactos recibidos", leads.length],
    ["Ventas WhatsApp", orders.length],
    ["Venta estimada", money(revenue)],
    ["Productos activos", storeProducts().length],
    ["Pagado plataforma", money(platformSpend)],
    ["Costo lead", money(db.leadPrice)],
    ["Recarga sugerida", store.credits <= 5 ? "Urgente" : "Bien"],
  ];

  els.storeMetrics.innerHTML = metrics
    .map(
      ([label, value]) => `
      <div class="metric-card">
        <span>${label}</span>
        <strong>${value}</strong>
      </div>
    `,
    )
    .join("");
  els.creditStatus.textContent = `${store.credits} contactos disponibles`;
}

function renderStoreProducts() {
  const products = storeProducts();
  els.storeProductCount.textContent = products.length;
  els.storeProducts.innerHTML = products.length
    ? products
        .map(
          (product) => `
          <div class="store-product-row">
            <img src="${product.image}" alt="${product.title}" />
            <div>
              <strong>${product.title}</strong>
              <small>${isFeatured(product) ? "Promocionado activo" : "Sin promocion"} - ${productTypeLabel(product.type)} - ${product.productCategory || "Sin categoria interna"} - ${availabilityLabel(product.availability)} - ${product.description}</small>
              <div class="price-row">${priceMarkup(product)}</div>
            </div>
            <div class="row-actions">
              <button class="ghost-button compact" data-edit-product="${product.id}" type="button">Editar</button>
              <button class="ghost-button compact" data-feature-product="${product.id}" data-days="3" type="button">Promocionar 3 dias</button>
              <button class="ghost-button compact" data-feature-product="${product.id}" data-days="7" type="button">Promocionar 7 dias</button>
              <button class="danger-button compact" data-delete-product="${product.id}" type="button">Eliminar</button>
            </div>
          </div>
        `,
        )
        .join("")
    : `<p class="muted">Aun no tienes productos publicados.</p>`;
}

function resetProductForm() {
  state.pendingImage = "";
  state.pendingImageFile = null;
  state.editingProductId = "";
  els.imagePreview.textContent = "Sin imagen seleccionada";
  els.productForm.reset();
  els.productSubmitBtn.textContent = "Publicar producto";
  els.cancelEditProduct.hidden = true;
  els.productAvailability.value = "both";
  els.productType.value = "food";
  syncProductTypeFields();
  syncDiscountField();
}

function editProduct(productId) {
  const product = getProduct(productId);
  if (!product) return;
  state.editingProductId = product.id;
  state.pendingImage = product.image;
  document.getElementById("productTitle").value = product.title;
  els.productType.value = product.type || "food";
  els.productCategory.value = product.productCategory || "";
  document.getElementById("productDescription").value = product.description;
  els.productIngredients.value = product.ingredients || "";
  els.productAllergens.value = product.allergens || "";
  els.productPortion.value = product.portion || "";
  els.productBrand.value = product.brand || "";
  els.productStock.value = product.stock ?? "";
  els.productSpecs.value = product.specs || "";
  els.productDuration.value = product.duration || "";
  els.productServiceArea.value = product.serviceArea || "";
  els.productRequirements.value = product.requirements || "";
  els.productOptions.value = product.options || "";
  document.getElementById("productPrice").value = product.price;
  els.productAvailability.value = product.availability || "both";
  els.discountType.value = product.discountType || "none";
  els.discountValue.value = product.discountValue || "";
  els.featuredPlan.value = "none";
  els.imagePreview.innerHTML = `<img src="${product.image}" alt="Vista previa" />`;
  els.productSubmitBtn.textContent = "Guardar cambios";
  els.cancelEditProduct.hidden = false;
  syncProductTypeFields();
  syncDiscountField();
  document.getElementById("productTitle").focus();
  showToast("Editando producto.");
}

function featureProduct(productId, days) {
  const product = getProduct(productId);
  const store = currentStore();
  if (!product || !store) return;
  product.featuredUntil = futureDate(days);
  store.marketingSpend = Number(store.marketingSpend || 0) + (days === 7 ? 169 : 89);
  saveDb();
  renderStore();
  showToast(`Producto destacado por ${days} dias.`);
}

function renderStoreContacts() {
  const leads = storeLeads().reverse();
  els.storeContacts.innerHTML = leads.length
    ? leads
        .map((lead) => {
          const client = db.clients.find((item) => item.id === lead.clientId);
          return `
            <div class="mini-row">
              <div>
                <strong>${client?.name || "Cliente"}</strong>
                <small>${new Date(lead.createdAt).toLocaleString("es-MX")} - ${client?.address || ""}</small>
              </div>
              <span>${lead.billable ? `Quedan ${lead.creditAfter}` : "Sin credito"}</span>
            </div>
          `;
        })
        .join("")
    : `<p class="muted">Todavia no hay contactos.</p>`;
}

function renderStoreOrders() {
  const orders = storeOrders().reverse();
  els.storeSalesCount.textContent = orders.length;
  els.storeOrders.innerHTML = orders.length
    ? orders
        .map(
          (order) => `
          <div class="mini-row">
            <div>
              <strong>${order.items.map((item) => `${item.qty} x ${item.title}`).join(", ")}</strong>
              <small>${new Date(order.createdAt).toLocaleString("es-MX")} - ${order.mode}</small>
            </div>
            <span>${money(order.total)}</span>
          </div>
        `,
        )
        .join("")
    : `<p class="muted">Aun no hay ventas registradas.</p>`;
}

async function publishProduct(event) {
  event.preventDefault();
  const store = currentStore();
  const editingProduct = state.editingProductId ? getProduct(state.editingProductId) : null;
  const title = document.getElementById("productTitle").value.trim();
  const type = els.productType.value;
  const productCategory = els.productCategory.value.trim();
  const description = document.getElementById("productDescription").value.trim();
  const price = Number(document.getElementById("productPrice").value);
  const availability = els.productAvailability.value;
  const discountType = document.getElementById("discountType").value;
  const discountValue = Number(document.getElementById("discountValue").value || 0);
  const featuredPlan = document.getElementById("featuredPlan").value;
  if (!title || !description || !price) {
    showToast("Completa titulo, descripcion y precio.");
    return;
  }

  let featuredUntil = editingProduct?.featuredUntil || "";
  if (featuredPlan === "3") {
    featuredUntil = futureDate(3);
    store.marketingSpend = Number(store.marketingSpend || 0) + 89;
  }
  if (featuredPlan === "7") {
    featuredUntil = futureDate(7);
    store.marketingSpend = Number(store.marketingSpend || 0) + 169;
  }

  const productData = {
    storeId: store.id,
    title,
    type,
    productCategory,
    description,
    price,
    image: state.pendingImage || editingProduct?.image || store.image || defaultImageForCategory(store.category),
    availability,
    discountType,
    discountValue: discountType === "none" ? 0 : discountValue,
    featuredUntil,
    ingredients: type === "food" ? els.productIngredients.value.trim() : "",
    allergens: type === "food" ? els.productAllergens.value.trim() : "",
    portion: type === "food" ? els.productPortion.value.trim() : "",
    brand: type === "retail" ? els.productBrand.value.trim() : "",
    stock: type === "retail" ? Number(els.productStock.value || 0) : "",
    specs: type === "retail" ? els.productSpecs.value.trim() : "",
    duration: type === "service" ? els.productDuration.value.trim() : "",
    serviceArea: type === "service" ? els.productServiceArea.value.trim() : "",
    requirements: type === "service" ? els.productRequirements.value.trim() : "",
    options: els.productOptions.value.trim(),
  };

  let remoteProductId = "";
  const api = remoteApi();
  if (api && store.remote) {
    try {
      const remotePayload = {
        store_id: store.id,
        type,
        title,
        category: productCategory,
        description,
        price,
        discount_type: discountType,
        discount_value: discountType === "none" ? 0 : discountValue,
        availability_modes: toRemoteServiceModes(availability),
        is_active: true,
        featured_until: featuredUntil || null,
      };
      let remoteProduct = editingProduct?.remote
        ? await api.updateProduct(editingProduct.id, remotePayload)
        : await api.createProduct(remotePayload);

      remoteProduct = await uploadRemoteProductImage(api, store, remoteProduct);
      remoteProductId = remoteProduct.id;

      if (type === "food") {
        await api.upsertFoodDetails({
          product_id: remoteProduct.id,
          ingredients: productData.ingredients,
          allergens: productData.allergens,
          portion_size: productData.portion,
        });
      }

      if (type === "retail") {
        await api.upsertRetailDetails({
          product_id: remoteProduct.id,
          brand: productData.brand,
          stock: Number(productData.stock || 0),
          unit: "",
          condition: "",
          specs: {
            notes: productData.specs,
            options: productData.options,
          },
        });
      }

      if (type === "service") {
        await api.upsertServiceDetails({
          product_id: remoteProduct.id,
          duration_text: productData.duration,
          service_area: productData.serviceArea,
          requirements: [productData.requirements, productData.options].filter(Boolean).join(" | "),
        });
      }

      Object.assign(productData, mapRemoteProduct(remoteProduct, store), {
        ingredients: productData.ingredients,
        allergens: productData.allergens,
        portion: productData.portion,
        brand: productData.brand,
        stock: productData.stock,
        specs: productData.specs,
        duration: productData.duration,
        serviceArea: productData.serviceArea,
        requirements: productData.requirements,
        options: productData.options,
      });
    } catch (error) {
      showToast(error.message || "No se pudo guardar producto en Supabase.");
      return;
    }
  }

  if (editingProduct) {
    Object.assign(editingProduct, productData);
  } else {
    db.products.unshift({
      id: remoteProductId || `product-${Date.now()}`,
      ...productData,
    });
  }

  resetProductForm();
  saveDb();
  renderStore();
  showToast(editingProduct ? "Producto actualizado." : "Producto publicado.");
}

function exportStoreReport() {
  const store = currentStore();
  const rows = [["tipo", "fecha", "cliente", "detalle", "total", "creditos_restantes"]];
  storeLeads().forEach((lead) => {
    const client = db.clients.find((item) => item.id === lead.clientId);
    const order = db.orders.find((item) => item.id === lead.orderId);
    rows.push([
      "contacto",
      lead.createdAt,
      client?.name || "",
      order?.items.map((item) => `${item.qty} x ${item.title}`).join(" | ") || "",
      lead.total,
      lead.creditAfter,
    ]);
  });
  storeOrders().forEach((order) => {
    const client = db.clients.find((item) => item.id === order.clientId);
    rows.push([
      "venta",
      order.createdAt,
      client?.name || "",
      order.items.map((item) => `${item.qty} x ${item.title}`).join(" | "),
      order.total,
      "",
    ]);
  });

  downloadCsv(`${store.name.toLowerCase().replaceAll(" ", "-")}-reporte.csv`, rows);
}

function exportOwnerReport() {
  const rows = [["tienda", "categoria", "productos", "contactos", "pedidos", "creditos", "creditos_vendidos", "publicidad", "ventas_estimadas", "link"]];
  db.stores.forEach((store) => {
    const products = db.products.filter((product) => product.storeId === store.id);
    const leads = db.leads.filter((lead) => lead.storeId === store.id);
    const orders = db.orders.filter((order) => order.storeId === store.id);
    rows.push([
      store.name,
      store.category,
      products.length,
      leads.length,
      orders.length,
      store.credits,
      Number(store.creditSpend || 0),
      Number(store.marketingSpend || 0),
      orders.reduce((sum, order) => sum + Number(order.total || 0), 0),
      storePublicUrl(store.id),
    ]);
  });
  downloadCsv("pueblopedidos-reporte-central.csv", rows);
}

function findClientByIdentifier(identifier) {
  return db.clients.find((client) => sameIdentifier(identifier, client));
}

function findStoreByIdentifier(identifier) {
  return db.stores.find((store) => sameIdentifier(identifier, store));
}

async function restoreRemoteSession() {
  const api = remoteApi();
  if (!api || db.session) return;
  try {
    const { data } = await api.getSession();
    if (!data.session?.user) return;
    const profile = await api.getProfile();
    if (profile?.role === "store_owner") {
      const store = await api.getOwnedStore();
      if (!store) return;
      const localStore = mapRemoteStore(store);
      upsertById(db.stores, localStore);
      const products = await api.listProductsByStore(store.id);
      products.forEach((product) => upsertById(db.products, mapRemoteProduct(product, localStore)));
      db.session = { role: "store", id: localStore.id };
    } else {
      const client = {
        id: data.session.user.id,
        remote: true,
        name: profile?.full_name || data.session.user.email,
        email: data.session.user.email,
        phone: profile?.phone || "",
        password: "",
        address: profile?.default_address || "",
        reference: profile?.default_reference || "",
      };
      upsertById(db.clients, client);
      db.session = { role: "client", id: client.id };
    }
    saveDb();
    render();
  } catch (error) {
    console.warn("No se pudo restaurar sesion Supabase", error);
  }
}

els.clientLoginForm.addEventListener("submit", async (event) => {
  event.preventDefault();
  const api = remoteApi();
  if (api) {
    const identifier = els.clientLoginPhone.value.trim();
    if (!identifier.includes("@")) {
      showToast("Para produccion inicia sesion con correo y contrasena.");
      return;
    }
    try {
      const { data, error } = await api.signInWithEmail(identifier, els.clientLoginPassword.value);
      if (error) throw error;
      const profile = await api.getProfile();
      const client = {
        id: data.user.id,
        remote: true,
        name: profile?.full_name || data.user.email,
        email: data.user.email,
        phone: profile?.phone || "",
        password: "",
        address: profile?.default_address || "",
        reference: profile?.default_reference || "",
      };
      upsertById(db.clients, client);
      closeAuthModal();
      setSession("client", client.id);
      showToast("Sesion iniciada con Supabase.");
      return;
    } catch (error) {
      showToast(error.message || "No se pudo iniciar sesion.");
      return;
    }
  }
  const client = findClientByIdentifier(els.clientLoginPhone.value);
  if (!client || !passwordMatches(client, els.clientLoginPassword.value)) {
    showToast("Usuario o contrasena incorrectos.");
    return;
  }
  closeAuthModal();
  setSession("client", client.id);
});

els.storeLoginForm.addEventListener("submit", async (event) => {
  event.preventDefault();
  const api = remoteApi();
  if (api) {
    const identifier = els.storeLoginPhone.value.trim();
    if (!identifier.includes("@")) {
      showToast("Para produccion inicia sesion con correo y contrasena.");
      return;
    }
    try {
      const { error } = await api.signInWithEmail(identifier, els.storeLoginPassword.value);
      if (error) throw error;
      const store = await api.getOwnedStore();
      if (!store) {
        showToast("Sesion correcta, pero aun no hay tienda registrada.");
        return;
      }
      const localStore = mapRemoteStore(store);
      upsertById(db.stores, localStore);
      const products = await api.listProductsByStore(store.id);
      products.forEach((product) => upsertById(db.products, mapRemoteProduct(product, localStore)));
      closeAuthModal();
      setSession("store", localStore.id);
      showToast("Tienda conectada con Supabase.");
      return;
    } catch (error) {
      showToast(error.message || "No se pudo iniciar sesion.");
      return;
    }
  }
  const store = findStoreByIdentifier(els.storeLoginPhone.value);
  if (!store || !passwordMatches(store, els.storeLoginPassword.value)) {
    showToast("Usuario o contrasena incorrectos.");
    return;
  }
  closeAuthModal();
  setSession("store", store.id);
});

els.clientForm.addEventListener("submit", async (event) => {
  event.preventDefault();
  const phone = document.getElementById("clientPhone").value.trim();
  const email = els.clientEmail.value.trim();
  const password = els.clientPassword.value;
  const name = document.getElementById("clientName").value.trim();
  const address = document.getElementById("clientAddress").value.trim();
  const reference = document.getElementById("clientReference").value.trim();
  const api = remoteApi();
  const existingClient = findClientByIdentifier(phone) || findClientByIdentifier(email);
  if (existingClient) {
    showToast("Ese cliente ya esta registrado. Inicia sesion.");
    els.clientLoginPhone.value = phone;
    return;
  }
  if (password.length < 8) {
    showToast("La contrasena debe tener al menos 8 caracteres.");
    return;
  }
  if (api) {
    try {
      const { data, error } = await api.signUpCustomer({ email, password, name, phone });
      if (error) throw error;
      if (!data.session) {
        showToast("Cuenta creada. Confirma tu correo y luego inicia sesion.");
        return;
      }
      await api.upsertProfile({
        id: data.user.id,
        role: "customer",
        full_name: name,
        phone,
        default_address: address,
        default_reference: reference,
      });
      const client = {
        id: data.user.id,
        remote: true,
        name,
        email,
        phone,
        password: "",
        address,
        reference,
      };
      upsertById(db.clients, client);
      closeAuthModal();
      setSession("client", client.id);
      showToast("Cliente creado en Supabase.");
      return;
    } catch (error) {
      showToast(error.message || "No se pudo crear cliente.");
      return;
    }
  }
  const client = {
    id: `client-${Date.now()}`,
    name,
    email,
    phone,
    password,
    address,
    reference,
  };
  db.clients.push(client);
  closeAuthModal();
  setSession("client", client.id);
});

els.storeForm.addEventListener("submit", async (event) => {
  event.preventDefault();
  const category = document.getElementById("storeCategory").value;
  const phone = normalizeWhatsApp(document.getElementById("storePhone").value);
  const email = els.storeEmail.value.trim();
  const password = els.storePassword.value;
  const name = document.getElementById("storeName").value.trim();
  const owner = document.getElementById("storeOwner").value.trim();
  const address = document.getElementById("storeAddress").value.trim();
  const description = els.storeDescription.value.trim();
  const credits = Number(document.getElementById("storeCredits").value || 0);
  const api = remoteApi();
  const existingStore = findStoreByIdentifier(phone) || findStoreByIdentifier(email);
  if (existingStore) {
    showToast("Esa tienda ya esta registrada. Inicia sesion.");
    els.storeLoginPhone.value = document.getElementById("storePhone").value;
    return;
  }
  if (password.length < 8) {
    showToast("La contrasena debe tener al menos 8 caracteres.");
    return;
  }
  if (api) {
    try {
      const { data, error } = await api.signUpStoreOwner({ email, password, owner, phone });
      if (error) throw error;
      if (!data.session) {
        showToast("Cuenta creada. Confirma tu correo y luego inicia sesion para crear la tienda.");
        return;
      }
      await api.upsertProfile({
        id: data.user.id,
        role: "store_owner",
        full_name: owner,
        phone,
      });
      let remoteStore = await api.createStore({
        owner_id: data.user.id,
        slug: `${slugify(name)}-${Date.now().toString(36)}`,
        name,
        category,
        description,
        address,
        whatsapp: phone,
        public_phone: phone,
        service_modes: toRemoteServiceModes(els.storeServiceModes.value),
        status: "active",
        credits,
        responsible_name: owner,
        responsible_email: email,
        responsible_phone: phone,
      });
      remoteStore = await uploadRemoteStoreImages(api, remoteStore);
      const localStore = mapRemoteStore(remoteStore);
      upsertById(db.stores, localStore);
      state.pendingStoreLogo = "";
      state.pendingStoreLogoFile = null;
      state.pendingStoreCover = "";
      state.pendingStoreCoverFile = null;
      closeAuthModal();
      setSession("store", localStore.id);
      showToast("Tienda creada en Supabase.");
      return;
    } catch (error) {
      showToast(error.message || "No se pudo crear tienda.");
      return;
    }
  }
  const store = {
    id: `store-${Date.now()}`,
    name,
    owner,
    email,
    password,
    phone,
    category,
    address,
    description,
    serviceModes: els.storeServiceModes.value,
    image: state.pendingStoreLogo || defaultImageForCategory(category),
    coverImage: state.pendingStoreCover || "",
    rating: "Nuevo",
    time: "15-35 min",
    credits,
    marketingSpend: 0,
    creditSpend: 0,
  };
  db.stores.push(store);
  state.pendingStoreLogo = "";
  state.pendingStoreCover = "";
  closeAuthModal();
  setSession("store", store.id);
});

els.clientProfileForm.addEventListener("submit", async (event) => {
  event.preventDefault();
  const client = currentClient();
  client.name = els.profileName.value.trim();
  client.phone = els.profilePhone.value.trim();
  client.address = els.profileAddress.value.trim();
  client.reference = els.profileReference.value.trim();
  const api = remoteApi();
  if (api && client.remote) {
    try {
      await api.upsertProfile({
        id: client.id,
        role: "customer",
        full_name: client.name,
        phone: client.phone,
        default_address: client.address,
        default_reference: client.reference,
      });
    } catch (error) {
      showToast(error.message || "No se pudo actualizar Supabase.");
      return;
    }
  }
  saveDb();
  renderClient();
  renderHeader();
  closeProfileModal();
  showToast("Perfil actualizado.");
});

els.storeProfileForm.addEventListener("submit", async (event) => {
  event.preventDefault();
  const store = currentStore();
  store.name = els.profileStoreName.value.trim();
  store.category = els.profileStoreCategory.value;
  store.phone = normalizeWhatsApp(els.profileStorePhone.value);
  store.serviceModes = els.profileStoreServiceModes.value;
  store.address = els.profileStoreAddress.value.trim();
  store.description = els.profileStoreDescription.value.trim();
  const api = remoteApi();
  if (api && store.remote) {
    try {
      await api.updateStore(store.id, {
        name: store.name,
        category: store.category,
        whatsapp: store.phone,
        public_phone: store.phone,
        service_modes: toRemoteServiceModes(store.serviceModes),
        address: store.address,
        description: store.description,
      });
    } catch (error) {
      showToast(error.message || "No se pudo actualizar Supabase.");
      return;
    }
  }
  saveDb();
  renderStore();
  renderHeader();
  showToast("Datos de tienda actualizados.");
});

els.productForm.addEventListener("submit", publishProduct);

els.discountType.addEventListener("change", syncDiscountField);

els.productType.addEventListener("change", syncProductTypeFields);

els.cancelEditProduct.addEventListener("click", resetProductForm);

els.storeLogo.addEventListener("change", (event) => {
  const file = event.target.files?.[0];
  state.pendingStoreLogoFile = file || null;
  readImageFile(file, (image) => {
    state.pendingStoreLogo = image;
    showToast("Logo cargado para la tienda.");
  });
});

els.storeCover.addEventListener("change", (event) => {
  const file = event.target.files?.[0];
  state.pendingStoreCoverFile = file || null;
  readImageFile(file, (image) => {
    state.pendingStoreCover = image;
    showToast("Portada cargada para la tienda.");
  });
});

els.profileStoreLogo.addEventListener("change", (event) => {
  const store = currentStore();
  if (!store) return;
  const file = event.target.files?.[0];
  readImageFile(file, async (image) => {
    store.image = image;
    const api = remoteApi();
    if (api && store.remote && file) {
      try {
        const logoPath = await api.uploadFile("store-assets", `${store.id}/logo.${fileExtension(file)}`, file);
        await api.updateStore(store.id, { logo_path: logoPath });
      } catch (error) {
        showToast(error.message || "No se pudo subir logo.");
        return;
      }
    }
    saveDb();
    renderStore();
    renderClient();
    showToast("Imagen de tienda actualizada.");
  });
});

els.productImage.addEventListener("change", (event) => {
  const file = event.target.files?.[0];
  state.pendingImageFile = file || null;
  readImageFile(file, (image) => {
    state.pendingImage = image;
    els.imagePreview.innerHTML = `<img src="${state.pendingImage}" alt="Vista previa" />`;
  });
});

els.openProfileBtn.addEventListener("click", openProfileModal);
els.openCartBtn.addEventListener("click", openCartModal);
els.openOwnerPanelBtn.addEventListener("click", openOwnerPanel);
els.closeOwnerModal.addEventListener("click", closeOwnerPanel);
els.stickyCartBar.addEventListener("click", openCartModal);
els.editClientProfileBtn.addEventListener("click", () => {
  if (currentClient()) {
    openProfileModal();
  } else {
    openAuthModal("client");
  }
});
els.openOrdersBtn.addEventListener("click", openProfileModal);
els.closeProfileModal.addEventListener("click", closeProfileModal);
els.closeAuthModal.addEventListener("click", closeAuthModal);
els.closeCartModal.addEventListener("click", closeCartModal);
els.closeProductModal.addEventListener("click", closeProductModal);
els.backToStoresBtn.addEventListener("click", () => {
  state.selectedStoreId = "";
  renderSelectedStore();
  updateStoreRoute("");
});
els.confirmAddProduct.addEventListener("click", () => {
  if (!state.selectedProductId) return;
  addToCart(state.selectedProductId, false, els.productComment.value);
  closeProductModal();
});

els.searchInput.addEventListener("input", (event) => {
  state.query = event.target.value;
  renderProducts();
});

els.logoutBtn.addEventListener("click", async () => {
  const api = remoteApi();
  if (api) {
    try {
      await api.signOut();
    } catch (error) {
      console.warn("No se pudo cerrar Supabase", error);
    }
  }
  db.session = null;
  saveDb();
  state.cart = [];
  state.pendingWhatsApps = [];
  closeProfileModal();
  closeCartModal();
  closeUpsellModal();
  closeOwnerPanel();
  closeAuthModal();
  render();
});

els.exportStoreCsv.addEventListener("click", exportStoreReport);
els.exportOwnerCsv.addEventListener("click", exportOwnerReport);

els.addCreditsBtn.addEventListener("click", () => {
  buyCredits(50);
});

els.closeUpsell.addEventListener("click", closeUpsellModal);
els.skipUpsell.addEventListener("click", sendOrder);
els.sendFinalOrder.addEventListener("click", sendOrder);

window.addEventListener("hashchange", () => {
  syncRouteFromHash();
  renderClient();
});

document.addEventListener("click", (event) => {
  const roleSwitch = event.target.closest("[data-role-switch]");
  if (roleSwitch) {
    const role = roleSwitch.dataset.roleSwitch;
    if (!db.session || db.session.role !== role) {
      openAuthModal(role);
      return;
    }
    if (role === "client") {
      openProfileModal();
      return;
    }
    setVisibleView("store");
    return;
  }

  const modeButton = event.target.closest("[data-order-mode]");
  if (modeButton) {
    state.orderMode = modeButton.dataset.orderMode;
    document.querySelectorAll("[data-order-mode]").forEach((button) => {
      button.classList.toggle("active", button === modeButton);
    });
    renderClient();
    return;
  }

  const showRegister = event.target.closest("[data-show-register]");
  if (showRegister) {
    setAuthMode(showRegister.dataset.showRegister, "register");
    return;
  }

  const showLogin = event.target.closest("[data-show-login]");
  if (showLogin) {
    setAuthMode(showLogin.dataset.showLogin, "login");
    return;
  }

  const forgotPassword = event.target.closest("[data-forgot-password]");
  if (forgotPassword) {
    showToast("Recuperacion pendiente: en produccion enviariamos un correo seguro.");
    return;
  }

  const copyStoreLink = event.target.closest("[data-copy-store-link]");
  if (copyStoreLink) {
    copyText(storePublicUrl(copyStoreLink.dataset.copyStoreLink), "Link de tienda copiado.");
    return;
  }

  const buyCreditPackage = event.target.closest("[data-buy-credits]");
  if (buyCreditPackage) {
    buyCredits(Number(buyCreditPackage.dataset.buyCredits));
    return;
  }

  if (event.target.closest("[data-scroll-store-products]")) {
    els.storeProducts.scrollIntoView({ behavior: "smooth", block: "start" });
    return;
  }

  const openStore = event.target.closest("[data-open-store]");
  if (openStore) {
    event.preventDefault();
    state.selectedStoreId = openStore.dataset.openStore;
    renderSelectedStore();
    updateStoreRoute(state.selectedStoreId);
    els.storeProfileSection.scrollIntoView({ behavior: "smooth", block: "start" });
    return;
  }

  const categoryButton = event.target.closest("[data-category]");
  if (categoryButton) {
    state.selectedCategory = categoryButton.dataset.category;
    renderCategories();
    renderProducts();
    return;
  }

  const viewProduct = event.target.closest("[data-view-product]");
  if (viewProduct) {
    openProductModal(viewProduct.dataset.viewProduct);
    return;
  }

  const removeButton = event.target.closest("[data-remove-line]");
  if (removeButton) {
    removeFromCart(removeButton.dataset.removeLine);
    return;
  }

  if (event.target.closest("#openUpsell")) {
    openUpsellModal();
    return;
  }

  const upsellAdd = event.target.closest("[data-upsell-add]");
  if (upsellAdd) {
    addToCart(upsellAdd.dataset.upsellAdd, true);
    renderOrderPanel();
    openUpsellModal();
    showToast("Agregado al carrito.");
    return;
  }

  const openWhatsApp = event.target.closest("[data-open-whatsapp]");
  if (openWhatsApp) {
    const item = (state.pendingWhatsApps || []).find((entry) => entry.orderId === openWhatsApp.dataset.openWhatsapp);
    if (item) {
      item.opened = true;
      renderOrderPanel();
      window.open(item.url, "_blank", "noopener,noreferrer");
    }
    return;
  }

  if (event.target.closest("[data-clear-whatsapp-queue]")) {
    state.pendingWhatsApps = [];
    closeCartModal();
    renderClient();
    return;
  }

  const editButton = event.target.closest("[data-edit-product]");
  if (editButton) {
    editProduct(editButton.dataset.editProduct);
    return;
  }

  const featureButton = event.target.closest("[data-feature-product]");
  if (featureButton) {
    featureProduct(featureButton.dataset.featureProduct, Number(featureButton.dataset.days));
    return;
  }

  const deleteButton = event.target.closest("[data-delete-product]");
  if (deleteButton) {
    db.products = db.products.filter((product) => product.id !== deleteButton.dataset.deleteProduct);
    saveDb();
    renderStore();
    showToast("Producto eliminado.");
  }
});

document.addEventListener("keydown", (event) => {
  if (event.key !== "Enter" && event.key !== " ") return;
  const viewProduct = event.target.closest(".menu-item[data-view-product]");
  if (!viewProduct) return;
  event.preventDefault();
  openProductModal(viewProduct.dataset.viewProduct);
});

cleanStaticText();
syncRouteFromHash();
syncProductTypeFields();
syncDiscountField();
render();
restoreRemoteSession();

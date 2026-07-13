const STORAGE_KEY = "pueblopedidos-v8";

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
    image: "./assets/hamburguesas.png",
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
    image: "./assets/tacos.png",
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
    image: "./assets/pizza.png",
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
    image: "./assets/postres.png",
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
    image: "./assets/hamburguesas.png",
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
    image: "./assets/hamburguesas.png",
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
    image: "./assets/tacos.png",
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
    image: "./assets/pizza.png",
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
    image: "./assets/postres.png",
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
    image: "./assets/pizza.png",
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
    leadPrice: 1,
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
  editingProductId: "",
  selectedStoreId: "",
  selectedProductId: "",
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
  storeEmail: document.getElementById("storeEmail"),
  storePassword: document.getElementById("storePassword"),
  storeServiceModes: document.getElementById("storeServiceModes"),
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
  exportStoreCsv: document.getElementById("exportStoreCsv"),
  addCreditsBtn: document.getElementById("addCreditsBtn"),
  storeCampaigns: document.getElementById("storeCampaigns"),
  storeProfileForm: document.getElementById("storeProfileForm"),
  profileStoreName: document.getElementById("profileStoreName"),
  profileStoreCategory: document.getElementById("profileStoreCategory"),
  profileStorePhone: document.getElementById("profileStorePhone"),
  profileStoreServiceModes: document.getElementById("profileStoreServiceModes"),
  profileStoreAddress: document.getElementById("profileStoreAddress"),
  upsellModal: document.getElementById("upsellModal"),
  upsellItems: document.getElementById("upsellItems"),
  closeUpsell: document.getElementById("closeUpsell"),
  skipUpsell: document.getElementById("skipUpsell"),
  sendFinalOrder: document.getElementById("sendFinalOrder"),
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

function showToast(message) {
  els.toast.textContent = message;
  els.toast.classList.add("show");
  window.clearTimeout(showToast.timer);
  showToast.timer = window.setTimeout(() => els.toast.classList.remove("show"), 2600);
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
    Hamburguesas: "./assets/hamburguesas.png",
    Tacos: "./assets/tacos.png",
    Pizza: "./assets/pizza.png",
    Postres: "./assets/postres.png",
    Pollos: "./assets/pollo.png",
    Sushi: "./assets/sushi.png",
  };
  return map[category] || "./assets/hamburguesas.png";
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
}

function closeCartModal() {
  els.cartModal.hidden = true;
}

function cartItemsCount() {
  return state.cart.reduce((sum, item) => sum + item.qty, 0);
}

function renderCartBadge() {
  const count = cartItemsCount();
  els.cartCount.textContent = count;
  els.openCartBtn.classList.toggle("has-items", count > 0);
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
      const haystack = `${product.title} ${product.description} ${store.name} ${store.category}`.toLowerCase();
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
                <small>${new Date(order.createdAt).toLocaleString("es-MX")} - ${order.items.length} producto(s)</small>
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
      <div class="product-meta">
        <span>${store.rating} - ${store.time}</span>
        <span>${availabilityLabel(store.serviceModes)}</span>
      </div>
    </div>
  `;
  els.publicStoreProducts.innerHTML = products.length
    ? products.map(menuItemMarkup).join("")
    : `<div class="cart-empty"><strong>Sin productos para ${state.orderMode.toLowerCase()}</strong><span>Prueba cambiar el modo de pedido.</span></div>`;
}

function cartStore() {
  const first = state.cart[0];
  if (!first) return null;
  return getStore(getProduct(first.productId)?.storeId);
}

function cartTotal() {
  return state.cart.reduce((sum, item) => {
    const product = getProduct(item.productId);
    return product ? sum + finalPrice(product) * item.qty : sum;
  }, 0);
}

function renderOrderPanel() {
  renderCartBadge();
  const client = currentClient();
  const store = cartStore();
  if (!state.cart.length) {
    els.orderPanel.innerHTML = `
      <div class="cart-empty">
        <strong>Tu pedido esta vacio</strong>
        <span>Agrega productos y el sistema preparara el WhatsApp.</span>
      </div>
    `;
    return;
  }

  els.orderPanel.innerHTML = `
    <span class="eyebrow">${state.orderMode}</span>
    <h2>Pedido para ${store?.name || "tienda"}</h2>
    <div class="address-box">
      <strong>${client ? "Direccion guardada" : "Direccion pendiente"}</strong><br />
      ${client ? client.address : "Registrate como cliente para agregar direccion al WhatsApp."}<br />
      ${client?.reference ? `<small>${client.reference}</small>` : ""}
    </div>
    <div class="cart-list">
      ${state.cart
        .map((item) => {
          const product = getProduct(item.productId);
          return `
            <div class="cart-row">
              <div>
                <strong>${item.qty} x ${product.title}</strong>
                <small>${money(finalPrice(product) * item.qty)}</small>
                ${item.note ? `<small>Nota: ${item.note}</small>` : ""}
              </div>
              <button class="remove-button" data-remove-line="${item.lineId}" type="button">Quitar</button>
            </div>
          `;
        })
        .join("")}
    </div>
    <div class="total-row">
      <span>Total estimado</span>
      <span>${money(cartTotal())}</span>
    </div>
    <button class="primary-button" id="openUpsell" type="button">${client ? "Continuar por WhatsApp" : "Iniciar sesion para enviar"}</button>
    <p class="muted">Antes de enviar se mostraran dos sugeridos de la tienda.</p>
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
  els.productModalDescription.textContent = product.description;
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
  const currentStore = cartStore();
  if (currentStore && currentStore.id !== product.storeId) {
    state.cart = [];
    if (!silent) showToast("El pedido solo puede ser de una tienda. Reiniciamos el carrito.");
  }

  const cleanNote = note.trim();
  const existing = state.cart.find((item) => item.productId === productId && (item.note || "") === cleanNote);
  if (existing) {
    existing.qty += 1;
  } else {
    state.cart.push({ lineId: `line-${Date.now()}-${Math.random().toString(16).slice(2)}`, productId, qty: 1, note: cleanNote });
  }
  renderClient();
  if (!silent) {
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

  const store = cartStore();
  const cartIds = new Set(state.cart.map((item) => item.productId));
  const suggestions = db.products
    .filter((product) => product.storeId === store.id && !cartIds.has(product.id))
    .slice(0, 2);

  els.upsellItems.innerHTML = suggestions.length
    ? suggestions
        .map(
          (product) => `
          <article class="upsell-card">
            <img src="${product.image}" alt="${product.title}" />
            <div>
              <h3>${product.title}</h3>
              <p>${product.description}</p>
              <div class="price-row">${priceMarkup(product)}</div>
              <button class="add-button" data-upsell-add="${product.id}" type="button">Agregar y enviar</button>
            </div>
          </article>
        `,
        )
        .join("")
    : `<div class="cart-empty"><strong>Todo listo</strong><span>No hay sugeridos de esta tienda por ahora.</span></div>`;

  els.upsellModal.hidden = false;
}

function closeUpsellModal() {
  els.upsellModal.hidden = true;
}

function sendOrder() {
  const client = currentClient();
  const store = cartStore();
  if (!client || !store || !state.cart.length) return;

  const items = state.cart
    .map((item) => {
      const product = getProduct(item.productId);
      return {
        productId: item.productId,
        title: product.title,
        qty: item.qty,
        price: finalPrice(product),
        note: item.note || "",
      };
    })
    .filter(Boolean);
  const total = cartTotal();
  const billable = store.credits > 0;
  if (billable) store.credits -= 1;

  const order = {
    id: `order-${Date.now()}`,
    clientId: client.id,
    storeId: store.id,
    mode: state.orderMode,
    items,
    total,
    address: client.address,
    reference: client.reference,
    createdAt: new Date().toISOString(),
  };

  const lead = {
    id: `lead-${Date.now()}`,
    clientId: client.id,
    storeId: store.id,
    orderId: order.id,
    total,
    billable,
    creditAfter: store.credits,
    createdAt: order.createdAt,
  };

  db.orders.push(order);
  db.leads.push(lead);
  saveDb();

  const orderLines = items
    .map((item) => `${item.qty} x ${item.title} (${money(item.qty * item.price)})${item.note ? ` - Nota: ${item.note}` : ""}`)
    .join("\n");
  const message = [
    `Hola, vi su menu en PuebloPedidos.`,
    ``,
    `Pedido:`,
    orderLines,
    ``,
    `Total estimado: ${money(total)}`,
    `Modo: ${state.orderMode}`,
    `Cliente: ${client.name}`,
    `WhatsApp cliente: ${client.phone}`,
    `Direccion: ${client.address}`,
    client.reference ? `Referencia: ${client.reference}` : "",
    ``,
    `Me confirma disponibilidad?`,
  ]
    .filter(Boolean)
    .join("\n");

  state.cart = [];
  closeUpsellModal();
  closeCartModal();
  renderClient();
  window.open(`https://wa.me/${normalizeWhatsApp(store.phone)}?text=${encodeURIComponent(message)}`, "_blank", "noopener,noreferrer");
  showToast(billable ? "Pedido enviado y contacto descontado." : "Pedido enviado. La tienda ya no tenia creditos.");
}

function renderStore() {
  const store = currentStore();
  els.storeTitle.textContent = store.name;
  renderStoreMetrics();
  renderStoreProfile();
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

function renderStoreMetrics() {
  const store = currentStore();
  const orders = storeOrders();
  const leads = storeLeads();
  const revenue = orders.reduce((sum, order) => sum + order.total, 0);
  const metrics = [
    ["Creditos restantes", store.credits],
    ["Contactos recibidos", leads.length],
    ["Ventas WhatsApp", orders.length],
    ["Venta estimada", money(revenue)],
    ["Productos activos", storeProducts().length],
    ["Publicidad usada", money(store.marketingSpend || 0)],
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
              <small>${isFeatured(product) ? "Promocionado activo" : "Sin promocion"} - ${availabilityLabel(product.availability)} - ${product.description}</small>
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
  state.editingProductId = "";
  els.imagePreview.textContent = "Sin imagen seleccionada";
  els.productForm.reset();
  els.productSubmitBtn.textContent = "Publicar producto";
  els.cancelEditProduct.hidden = true;
  els.productAvailability.value = "both";
  syncDiscountField();
}

function editProduct(productId) {
  const product = getProduct(productId);
  if (!product) return;
  state.editingProductId = product.id;
  state.pendingImage = product.image;
  document.getElementById("productTitle").value = product.title;
  document.getElementById("productDescription").value = product.description;
  document.getElementById("productPrice").value = product.price;
  els.productAvailability.value = product.availability || "both";
  els.discountType.value = product.discountType || "none";
  els.discountValue.value = product.discountValue || "";
  els.featuredPlan.value = "none";
  els.imagePreview.innerHTML = `<img src="${product.image}" alt="Vista previa" />`;
  els.productSubmitBtn.textContent = "Guardar cambios";
  els.cancelEditProduct.hidden = false;
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

function publishProduct(event) {
  event.preventDefault();
  const store = currentStore();
  const editingProduct = state.editingProductId ? getProduct(state.editingProductId) : null;
  const title = document.getElementById("productTitle").value.trim();
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
    description,
    price,
    image: state.pendingImage || editingProduct?.image || store.image || defaultImageForCategory(store.category),
    availability,
    discountType,
    discountValue: discountType === "none" ? 0 : discountValue,
    featuredUntil,
  };

  if (editingProduct) {
    Object.assign(editingProduct, productData);
  } else {
    db.products.unshift({
      id: `product-${Date.now()}`,
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

  const csv = rows.map((row) => row.map((cell) => `"${String(cell).replaceAll('"', '""')}"`).join(",")).join("\n");
  const blob = new Blob([csv], { type: "text/csv;charset=utf-8" });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = `${store.name.toLowerCase().replaceAll(" ", "-")}-reporte.csv`;
  link.click();
  URL.revokeObjectURL(url);
}

function findClientByIdentifier(identifier) {
  return db.clients.find((client) => sameIdentifier(identifier, client));
}

function findStoreByIdentifier(identifier) {
  return db.stores.find((store) => sameIdentifier(identifier, store));
}

els.clientLoginForm.addEventListener("submit", (event) => {
  event.preventDefault();
  const client = findClientByIdentifier(els.clientLoginPhone.value);
  if (!client || !passwordMatches(client, els.clientLoginPassword.value)) {
    showToast("Usuario o contrasena incorrectos.");
    return;
  }
  closeAuthModal();
  setSession("client", client.id);
});

els.storeLoginForm.addEventListener("submit", (event) => {
  event.preventDefault();
  const store = findStoreByIdentifier(els.storeLoginPhone.value);
  if (!store || !passwordMatches(store, els.storeLoginPassword.value)) {
    showToast("Usuario o contrasena incorrectos.");
    return;
  }
  closeAuthModal();
  setSession("store", store.id);
});

els.clientForm.addEventListener("submit", (event) => {
  event.preventDefault();
  const phone = document.getElementById("clientPhone").value.trim();
  const email = els.clientEmail.value.trim();
  const password = els.clientPassword.value;
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
  const client = {
    id: `client-${Date.now()}`,
    name: document.getElementById("clientName").value.trim(),
    email,
    phone,
    password,
    address: document.getElementById("clientAddress").value.trim(),
    reference: document.getElementById("clientReference").value.trim(),
  };
  db.clients.push(client);
  closeAuthModal();
  setSession("client", client.id);
});

els.storeForm.addEventListener("submit", (event) => {
  event.preventDefault();
  const category = document.getElementById("storeCategory").value;
  const phone = normalizeWhatsApp(document.getElementById("storePhone").value);
  const email = els.storeEmail.value.trim();
  const password = els.storePassword.value;
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
  const store = {
    id: `store-${Date.now()}`,
    name: document.getElementById("storeName").value.trim(),
    owner: document.getElementById("storeOwner").value.trim(),
    email,
    password,
    phone,
    category,
    address: document.getElementById("storeAddress").value.trim(),
    serviceModes: els.storeServiceModes.value,
    image: defaultImageForCategory(category),
    rating: "Nuevo",
    time: "15-35 min",
    credits: Number(document.getElementById("storeCredits").value || 0),
    marketingSpend: 0,
  };
  db.stores.push(store);
  closeAuthModal();
  setSession("store", store.id);
});

els.clientProfileForm.addEventListener("submit", (event) => {
  event.preventDefault();
  const client = currentClient();
  client.name = els.profileName.value.trim();
  client.phone = els.profilePhone.value.trim();
  client.address = els.profileAddress.value.trim();
  client.reference = els.profileReference.value.trim();
  saveDb();
  renderClient();
  renderHeader();
  closeProfileModal();
  showToast("Perfil actualizado.");
});

els.storeProfileForm.addEventListener("submit", (event) => {
  event.preventDefault();
  const store = currentStore();
  store.name = els.profileStoreName.value.trim();
  store.category = els.profileStoreCategory.value;
  store.phone = normalizeWhatsApp(els.profileStorePhone.value);
  store.serviceModes = els.profileStoreServiceModes.value;
  store.address = els.profileStoreAddress.value.trim();
  saveDb();
  renderStore();
  renderHeader();
  showToast("Datos de tienda actualizados.");
});

els.productForm.addEventListener("submit", publishProduct);

els.discountType.addEventListener("change", syncDiscountField);

els.cancelEditProduct.addEventListener("click", resetProductForm);

els.productImage.addEventListener("change", (event) => {
  const file = event.target.files?.[0];
  if (!file) return;
  const reader = new FileReader();
  reader.onload = () => {
    state.pendingImage = String(reader.result);
    els.imagePreview.innerHTML = `<img src="${state.pendingImage}" alt="Vista previa" />`;
  };
  reader.readAsDataURL(file);
});

els.openProfileBtn.addEventListener("click", openProfileModal);
els.openCartBtn.addEventListener("click", openCartModal);
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

els.logoutBtn.addEventListener("click", () => {
  db.session = null;
  saveDb();
  state.cart = [];
  closeProfileModal();
  closeCartModal();
  closeUpsellModal();
  closeAuthModal();
  render();
});

els.exportStoreCsv.addEventListener("click", exportStoreReport);

els.addCreditsBtn.addEventListener("click", () => {
  const store = currentStore();
  store.credits += 50;
  saveDb();
  renderStore();
  showToast("Recarga agregada: +50 contactos.");
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
    sendOrder();
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
syncDiscountField();
render();

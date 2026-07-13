const restaurants = [
  {
    id: "tacos-don-luis",
    name: "Tacos Don Luis",
    category: "Tacos",
    image: "./assets/tacos.png",
    phone: "5215550100101",
    rating: "4.8",
    time: "15-25 min",
    neighborhood: "Centro",
    tags: ["Pastor", "Suadero", "Para recoger"],
    menu: [
      { name: "Orden de pastor", description: "5 tacos con pina y salsa verde", price: 68 },
      { name: "Campechana", description: "Pastor, suadero y queso", price: 38 },
      { name: "Agua de jamaica", description: "Medio litro", price: 22 },
    ],
  },
  {
    id: "burger-plaza",
    name: "Burger Plaza",
    category: "Hamburguesas",
    image: "./assets/hamburguesas.png",
    phone: "5215550100202",
    rating: "4.6",
    time: "20-30 min",
    neighborhood: "Plaza principal",
    tags: ["Papas", "Combos", "Noche"],
    menu: [
      { name: "Clásica con queso", description: "Carne, queso, lechuga y aderezo", price: 89 },
      { name: "Doble plaza", description: "Doble carne, tocino y queso", price: 128 },
      { name: "Papas grandes", description: "Papas crujientes con sal de casa", price: 45 },
    ],
  },
  {
    id: "pizza-la-esquina",
    name: "Pizza La Esquina",
    category: "Pizza",
    image: "./assets/pizza.png",
    phone: "5215550100303",
    rating: "4.7",
    time: "25-40 min",
    neighborhood: "La Esquina",
    tags: ["Familiar", "Entrega local", "Promo"],
    menu: [
      { name: "Pepperoni mediana", description: "8 rebanadas con extra queso", price: 149 },
      { name: "Mexicana grande", description: "Chorizo, jalapeno, cebolla y queso", price: 219 },
      { name: "Refresco 2 L", description: "Sabor disponible del día", price: 42 },
    ],
  },
  {
    id: "sushi-norte",
    name: "Sushi Norte",
    category: "Sushi",
    image: "./assets/sushi.png",
    phone: "5215550100404",
    rating: "4.5",
    time: "30-45 min",
    neighborhood: "Zona norte",
    tags: ["Rollos", "Charolas", "Viernes"],
    menu: [
      { name: "California roll", description: "Surimi, aguacate, pepino y ajonjoli", price: 105 },
      { name: "Rollo empanizado", description: "Queso crema, camarón y salsa de anguila", price: 132 },
      { name: "Charola pareja", description: "3 rollos mixtos y aderezos", price: 299 },
    ],
  },
  {
    id: "postres-mia",
    name: "Postres Mia",
    category: "Postres",
    image: "./assets/postres.png",
    phone: "5215550100505",
    rating: "4.9",
    time: "10-20 min",
    neighborhood: "Mercado",
    tags: ["Pastel", "Pay", "Café"],
    menu: [
      { name: "Rebanada de pastel", description: "Chocolate o tres leches", price: 55 },
      { name: "Pay de queso", description: "Porción individual con frutos rojos", price: 48 },
      { name: "Caja mini postres", description: "6 piezas surtidas", price: 155 },
    ],
  },
  {
    id: "pollos-el-guero",
    name: "Pollos El Guero",
    category: "Pollos",
    image: "./assets/pollo.png",
    phone: "5215550100606",
    rating: "4.4",
    time: "20-35 min",
    neighborhood: "Salida sur",
    tags: ["Asado", "Familia", "Salsas"],
    menu: [
      { name: "Pollo entero", description: "Incluye tortillas, salsa y cebollitas", price: 185 },
      { name: "Medio pollo", description: "Con arroz y salsa de casa", price: 105 },
      { name: "Paquete familiar", description: "Pollo, papas, arroz y refresco", price: 289 },
    ],
  },
];

const state = {
  selectedCategory: "Todos",
  selectedRestaurantId: restaurants[0].id,
  query: "",
  cart: [],
  leadPrice: Number(localStorage.getItem("puebloLeadPrice") || "0.5"),
  leads: JSON.parse(localStorage.getItem("puebloLeads") || "[]"),
};

const els = {
  navButtons: document.querySelectorAll(".nav-button"),
  panels: document.querySelectorAll(".view"),
  categoryList: document.getElementById("categoryList"),
  restaurantGrid: document.getElementById("restaurantGrid"),
  restaurantDetail: document.getElementById("restaurantDetail"),
  searchInput: document.getElementById("searchInput"),
  leadPrice: document.getElementById("leadPrice"),
  metricGrid: document.getElementById("metricGrid"),
  businessRows: document.getElementById("businessRows"),
  leadRows: document.getElementById("leadRows"),
  billingLabel: document.getElementById("billingLabel"),
  exportCsv: document.getElementById("exportCsv"),
  clearLeads: document.getElementById("clearLeads"),
  clearDemo: document.getElementById("clearDemo"),
  toast: document.getElementById("toast"),
};

els.leadPrice.value = state.leadPrice.toFixed(2);

function money(value) {
  return value.toLocaleString("es-MX", { style: "currency", currency: "MXN" });
}

function showToast(message) {
  els.toast.textContent = message;
  els.toast.classList.add("show");
  window.clearTimeout(showToast.timer);
  showToast.timer = window.setTimeout(() => els.toast.classList.remove("show"), 2600);
}

function saveLeads() {
  localStorage.setItem("puebloLeads", JSON.stringify(state.leads));
}

function categories() {
  return ["Todos", ...new Set(restaurants.map((restaurant) => restaurant.category))];
}

function filteredRestaurants() {
  const query = state.query.trim().toLowerCase();
  return restaurants.filter((restaurant) => {
    const categoryMatch =
      state.selectedCategory === "Todos" || restaurant.category === state.selectedCategory;
    const searchMatch =
      !query ||
      restaurant.name.toLowerCase().includes(query) ||
      restaurant.category.toLowerCase().includes(query) ||
      restaurant.tags.join(" ").toLowerCase().includes(query) ||
      restaurant.menu.some((item) => item.name.toLowerCase().includes(query));
    return categoryMatch && searchMatch;
  });
}

function selectedRestaurant() {
  return restaurants.find((restaurant) => restaurant.id === state.selectedRestaurantId) || restaurants[0];
}

function renderCategories() {
  els.categoryList.innerHTML = categories()
    .map((category) => {
      const count =
        category === "Todos"
          ? restaurants.length
          : restaurants.filter((restaurant) => restaurant.category === category).length;
      return `
        <button class="category-button ${state.selectedCategory === category ? "active" : ""}" data-category="${category}" type="button">
          <span>${category}</span>
          <span class="category-count">${count}</span>
        </button>
      `;
    })
    .join("");
}

function renderRestaurants() {
  const list = filteredRestaurants();
  if (!list.length) {
    els.restaurantGrid.innerHTML = `<div class="detail-empty"><strong>No hay resultados</strong><span>Prueba con otra categoría.</span></div>`;
    return;
  }

  els.restaurantGrid.innerHTML = list
    .map(
      (restaurant) => `
      <article class="restaurant-card ${restaurant.id === state.selectedRestaurantId ? "active" : ""}">
        <button class="card-hit" data-restaurant="${restaurant.id}" type="button" aria-label="Ver ${restaurant.name}">
          <div class="restaurant-image">
            <img src="${restaurant.image}" alt="${restaurant.name}" />
            <span class="status-pill">Abierto</span>
          </div>
          <div class="card-body">
            <h3>${restaurant.name}</h3>
            <div class="meta-row">
              <span>${restaurant.category}</span>
              <span>${restaurant.rating} · ${restaurant.time}</span>
            </div>
            <div class="tag-row">
              ${restaurant.tags.map((tag) => `<span class="tag">${tag}</span>`).join("")}
            </div>
          </div>
        </button>
      </article>
    `,
    )
    .join("");
}

function renderDetail() {
  const restaurant = selectedRestaurant();
  const cartTotal = state.cart.reduce((sum, item) => sum + item.price * item.qty, 0);

  els.restaurantDetail.className = "detail-card";
  els.restaurantDetail.innerHTML = `
    <div class="detail-hero">
      <img src="${restaurant.image}" alt="${restaurant.name}" />
      <span class="status-pill">${restaurant.neighborhood}</span>
    </div>
    <div class="detail-content">
      <span class="eyebrow">${restaurant.category}</span>
      <h2>${restaurant.name}</h2>
      <p>${restaurant.rating} de calificación · ${restaurant.time} · Pedido por WhatsApp</p>
      <div class="menu-list">
        ${restaurant.menu
          .map(
            (item, index) => `
              <div class="item-row">
                <div>
                  <strong>${item.name}</strong>
                  <p>${item.description}</p>
                </div>
                <div>
                  <div class="price">${money(item.price)}</div>
                  <button class="add-button" data-add="${index}" type="button">Agregar</button>
                </div>
              </div>
            `,
          )
          .join("")}
      </div>
      <div class="cart-box">
        <h3>Pedido</h3>
        <div class="cart-list">
          ${
            state.cart.length
              ? state.cart
                  .map(
                    (item, index) => `
                    <div class="cart-row">
                      <span>${item.qty} x ${item.name}</span>
                      <span>${money(item.qty * item.price)} <button class="remove-button" data-remove="${index}" type="button">Quitar</button></span>
                    </div>
                  `,
                  )
                  .join("")
              : `<p class="small-note">Agrega productos para preparar el mensaje.</p>`
          }
        </div>
        <div class="total-row">
          <span>Total estimado</span>
          <span>${money(cartTotal)}</span>
        </div>
        <button class="whatsapp-button" id="sendWhatsapp" type="button">Pedir por WhatsApp</button>
        <p class="small-note">Al tocar el botón se registra el contacto para el negocio.</p>
      </div>
    </div>
  `;
}

function renderMetrics() {
  const billable = state.leads.filter((lead) => lead.billable).length;
  const total = state.leads.length;
  const businesses = new Set(state.leads.map((lead) => lead.restaurantId)).size;
  const revenue = billable * state.leadPrice;
  els.billingLabel.textContent = `${money(state.leadPrice)} por contacto`;

  const metrics = [
    ["Contactos", total],
    ["Cobrables", billable],
    ["Locales activos", businesses],
    ["Ingreso estimado", money(revenue)],
  ];

  els.metricGrid.innerHTML = metrics
    .map(
      ([label, value]) => `
      <div class="metric-card">
        <span>${label}</span>
        <strong>${value}</strong>
      </div>
    `,
    )
    .join("");
}

function renderBusinessRows() {
  const rows = restaurants
    .map((restaurant) => {
      const leads = state.leads.filter((lead) => lead.restaurantId === restaurant.id);
      const billable = leads.filter((lead) => lead.billable).length;
      return { restaurant, leads: leads.length, billable, amount: billable * state.leadPrice };
    })
    .sort((a, b) => b.billable - a.billable);

  els.businessRows.innerHTML = rows
    .map(
      (row) => `
      <div class="business-row">
        <div>
          <strong>${row.restaurant.name}</strong>
          <small>${row.leads} clics · ${row.billable} cobrables</small>
        </div>
        <span class="row-amount">${money(row.amount)}</span>
      </div>
    `,
    )
    .join("");
}

function renderLeadRows() {
  const recent = [...state.leads].reverse().slice(0, 10);

  els.leadRows.innerHTML = recent.length
    ? recent
        .map((lead) => {
          const restaurant = restaurants.find((item) => item.id === lead.restaurantId);
          return `
            <div class="lead-row">
              <div>
                <strong>${restaurant ? restaurant.name : "Local"}</strong>
                <small>${new Date(lead.createdAt).toLocaleString("es-MX")} · ${lead.items} producto${lead.items === 1 ? "" : "s"}</small>
              </div>
              <span class="row-amount">${lead.billable ? "Cobrable" : "Repetido"}</span>
            </div>
          `;
        })
        .join("")
    : `<p class="small-note">Todavía no hay contactos registrados.</p>`;
}

function renderOwner() {
  renderMetrics();
  renderBusinessRows();
  renderLeadRows();
}

function render() {
  renderCategories();
  renderRestaurants();
  renderDetail();
  renderOwner();
}

function addItem(index) {
  const restaurant = selectedRestaurant();
  const item = restaurant.menu[index];
  const existing = state.cart.find((cartItem) => cartItem.name === item.name);
  if (existing) {
    existing.qty += 1;
  } else {
    state.cart.push({ ...item, qty: 1 });
  }
  renderDetail();
}

function removeItem(index) {
  state.cart.splice(index, 1);
  renderDetail();
}

function registerLead() {
  const restaurant = selectedRestaurant();
  const now = Date.now();
  const hasRecentBillable = state.leads.some(
    (lead) =>
      lead.restaurantId === restaurant.id &&
      lead.billable &&
      now - new Date(lead.createdAt).getTime() < 24 * 60 * 60 * 1000,
  );
  const billable = !hasRecentBillable;
  const items = state.cart.reduce((sum, item) => sum + item.qty, 0);

  state.leads.push({
    id: `${restaurant.id}-${now}`,
    restaurantId: restaurant.id,
    createdAt: new Date(now).toISOString(),
    billable,
    items,
  });
  saveLeads();
  renderOwner();

  const orderLines = state.cart.length
    ? state.cart.map((item) => `${item.qty} x ${item.name} (${money(item.price * item.qty)})`).join("\n")
    : "Quiero información para pedir.";
  const total = state.cart.reduce((sum, item) => sum + item.price * item.qty, 0);
  const text = `Hola, vi su menú en PuebloPedidos.\n\n${orderLines}\n\nTotal estimado: ${money(total)}\n¿Me confirma disponibilidad?`;
  const url = `https://wa.me/${restaurant.phone}?text=${encodeURIComponent(text)}`;
  window.open(url, "_blank", "noopener,noreferrer");

  showToast(billable ? "Contacto cobrable registrado." : "Contacto repetido: registrado sin cobro.");
}

function exportCsv() {
  const rows = [["fecha", "local", "categoria", "productos", "cobrable", "monto"]];
  state.leads.forEach((lead) => {
    const restaurant = restaurants.find((item) => item.id === lead.restaurantId);
    rows.push([
      lead.createdAt,
      restaurant?.name || "",
      restaurant?.category || "",
      String(lead.items),
      lead.billable ? "si" : "no",
      lead.billable ? state.leadPrice.toFixed(2) : "0.00",
    ]);
  });
  const csv = rows.map((row) => row.map((cell) => `"${String(cell).replaceAll('"', '""')}"`).join(",")).join("\n");
  const blob = new Blob([csv], { type: "text/csv;charset=utf-8" });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = "pueblopedidos-leads.csv";
  link.click();
  URL.revokeObjectURL(url);
}

document.addEventListener("click", (event) => {
  const nav = event.target.closest("[data-view]");
  if (nav) {
    els.navButtons.forEach((button) => button.classList.toggle("active", button === nav));
    els.panels.forEach((panel) => panel.classList.toggle("active", panel.dataset.panel === nav.dataset.view));
    return;
  }

  const categoryButton = event.target.closest("[data-category]");
  if (categoryButton) {
    state.selectedCategory = categoryButton.dataset.category;
    renderCategories();
    renderRestaurants();
    return;
  }

  const restaurantButton = event.target.closest("[data-restaurant]");
  if (restaurantButton) {
    state.selectedRestaurantId = restaurantButton.dataset.restaurant;
    state.cart = [];
    renderRestaurants();
    renderDetail();
    return;
  }

  const addButton = event.target.closest("[data-add]");
  if (addButton) {
    addItem(Number(addButton.dataset.add));
    return;
  }

  const removeButton = event.target.closest("[data-remove]");
  if (removeButton) {
    removeItem(Number(removeButton.dataset.remove));
    return;
  }

  if (event.target.closest("#sendWhatsapp")) {
    registerLead();
  }
});

els.searchInput.addEventListener("input", (event) => {
  state.query = event.target.value;
  renderRestaurants();
});

els.leadPrice.addEventListener("input", (event) => {
  state.leadPrice = Number(event.target.value || "0.5");
  localStorage.setItem("puebloLeadPrice", String(state.leadPrice));
  renderOwner();
});

els.exportCsv.addEventListener("click", exportCsv);

els.clearLeads.addEventListener("click", () => {
  state.leads = [];
  saveLeads();
  renderOwner();
  showToast("Leads borrados.");
});

els.clearDemo.addEventListener("click", () => {
  state.cart = [];
  state.selectedCategory = "Todos";
  state.query = "";
  els.searchInput.value = "";
  state.selectedRestaurantId = restaurants[0].id;
  render();
  showToast("Demo reiniciada.");
});

render();

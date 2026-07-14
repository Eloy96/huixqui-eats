<!doctype html>
<html lang="es">
  <head>
    <meta charset="utf-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1" />
    <title>PuebloPedidos - Marketplace local por WhatsApp</title>
    <meta
      name="description"
      content="Marketplace local de comida con perfil de cliente, perfil de tienda, productos, descuentos, destacados y pedidos por WhatsApp."
    />
    <link rel="stylesheet" href="./styles.css" />
  </head>
  <body>
    <header class="topbar">
      <a class="brand" href="#inicio" aria-label="PuebloPedidos inicio">
        <span class="brand-mark">P</span>
        <span>
          <strong>PuebloPedidos</strong>
          <small id="sessionLabel">Sin sesion</small>
        </span>
      </a>
      <div class="top-actions">
        <nav class="role-nav" id="roleNav" aria-label="Registro y perfiles">
          <button class="role-button" data-role-switch="client" type="button">Cliente</button>
          <button class="role-button" data-role-switch="store" type="button">Tienda</button>
        </nav>
        <button id="openOwnerPanelBtn" class="ghost-button compact owner-button" type="button">Admin</button>
        <button id="openCartBtn" class="cart-button" type="button">Carrito <span id="cartCount">0</span></button>
        <button id="openProfileBtn" class="ghost-button compact" type="button" hidden>Perfil</button>
        <button id="logoutBtn" class="ghost-button compact" type="button" hidden>Cerrar sesion</button>
      </div>
    </header>

    <main id="inicio">
      <section id="authView" class="modal auth-modal" hidden aria-label="Registro">
        <div class="modal-card auth-modal-card" role="dialog" aria-modal="true" aria-labelledby="authTitle">
          <div class="section-title compact-title">
            <div>
              <span class="eyebrow" id="authEyebrow">Cliente</span>
              <h2 id="authTitle">Iniciar sesion</h2>
            </div>
            <button id="closeAuthModal" class="icon-button" type="button" aria-label="Cerrar">x</button>
          </div>
          <p class="modal-copy clean-copy">Entra con correo o WhatsApp y contrasena. El WhatsApp queda solo como contacto para pedidos.</p>
          <p class="modal-copy">Inicia sesion con correo o WhatsApp y contraseña. El WhatsApp se usa para contacto y pedidos, no como contraseña.</p>

          <div class="auth-grid">
          <section class="auth-card" data-auth-card="client">
            <div class="card-kicker">Cliente</div>
            <h2>Entrar como cliente</h2>
            <p>Usa tu WhatsApp para recuperar direccion, pedidos y enviar compras mas rapido.</p>
            <form id="clientLoginForm" class="stacked-form auth-login-form">
              <label>
                Correo o WhatsApp
                <input id="clientLoginPhone" required placeholder="Ej. 5551234567" />
              </label>
              <label>
                Contraseña
                <input id="clientLoginPassword" required type="password" minlength="8" placeholder="Minimo 8 caracteres" />
              </label>
              <button class="primary-button" type="submit">Iniciar sesion</button>
            </form>
            <div class="auth-links">
              <button class="link-button" data-forgot-password="client" type="button">Olvidaste tu contrasena?</button>
              <button class="link-button" data-show-register="client" type="button">Registrarse ahora</button>
            </div>
            <form id="clientForm" class="stacked-form register-form" hidden>
              <div class="auth-divider">Crear cuenta nueva</div>
              <label>
                Nombre
                <input id="clientName" required placeholder="Ej. Erika Rosales" />
              </label>
              <label>
                Correo
                <input id="clientEmail" required type="email" placeholder="erika@email.com" />
              </label>
              <label>
                WhatsApp
                <input id="clientPhone" required placeholder="Ej. 5551234567" />
              </label>
              <label>
                Contraseña
                <input id="clientPassword" required type="password" minlength="8" placeholder="Minimo 8 caracteres" />
              </label>
              <label>
                Direccion de entrega
                <textarea id="clientAddress" required rows="3" placeholder="Calle, numero, colonia y referencias"></textarea>
              </label>
              <label>
                Referencia rapida
                <input id="clientReference" placeholder="Ej. Casa azul frente a la primaria" />
              </label>
              <button class="ghost-button" type="submit">Crear cliente</button>
              <button class="link-button" data-show-login="client" type="button">Ya tengo cuenta</button>
            </form>
          </section>

          <section class="auth-card store-card" data-auth-card="store">
            <div class="card-kicker">Tienda</div>
            <h2>Entrar como tienda</h2>
            <p>El responsable entra con el WhatsApp del local para administrar productos y reportes.</p>
            <form id="storeLoginForm" class="stacked-form auth-login-form">
              <label>
                Correo o WhatsApp del local
                <input id="storeLoginPhone" required placeholder="Ej. tienda@email.com" />
              </label>
              <label>
                Contraseña
                <input id="storeLoginPassword" required type="password" minlength="8" placeholder="Minimo 8 caracteres" />
              </label>
              <button class="primary-button" type="submit">Iniciar sesion</button>
            </form>
            <div class="auth-links">
              <button class="link-button" data-forgot-password="store" type="button">Olvidaste tu contrasena?</button>
              <button class="link-button" data-show-register="store" type="button">Registrarse ahora</button>
            </div>
            <form id="storeForm" class="stacked-form register-form" hidden>
              <div class="auth-divider">Registrar negocio nuevo</div>
              <label>
                Nombre del local
                <input id="storeName" required placeholder="Ej. Burger Plaza" />
              </label>
              <label>
                Responsable
                <input id="storeOwner" required placeholder="Nombre del dueno" />
              </label>
              <label>
                Correo del responsable
                <input id="storeEmail" required type="email" placeholder="dueno@email.com" />
              </label>
              <label>
                WhatsApp del local
                <input id="storePhone" required placeholder="Ej. 5559876543" />
              </label>
              <label>
                Contraseña
                <input id="storePassword" required type="password" minlength="8" placeholder="Minimo 8 caracteres" />
              </label>
              <div class="form-grid">
              <label>
                Categoria
                <select id="storeCategory">
                  <option>Hamburguesas</option>
                  <option>Tacos</option>
                  <option>Pizza</option>
                  <option>Postres</option>
                  <option>Pollos</option>
                  <option>Sushi</option>
                </select>
              </label>
              <label>
                Creditos iniciales
                <input id="storeCredits" type="number" min="0" value="30" />
              </label>
              <label>
                Servicio
                <select id="storeServiceModes">
                  <option value="both">Entrega y recoger</option>
                  <option value="delivery">Solo entrega</option>
                  <option value="pickup">Solo recoger</option>
                </select>
              </label>
              </div>
              <label>
                Direccion del local
                <textarea id="storeAddress" required rows="3" placeholder="Direccion visible para recoger pedidos"></textarea>
              </label>
              <button class="ghost-button" type="submit">Registrar tienda</button>
              <button class="link-button" data-show-login="store" type="button">Ya tengo cuenta</button>
            </form>
          </section>
          </div>
        </div>
      </section>

      <section id="clientView" class="view" aria-label="Pantalla cliente">
        <div class="client-shell">
          <section class="market-area">
            <div class="client-toolbar panel-card home-only">
              <div>
                <span class="eyebrow">Entregar en</span>
                <strong id="clientAddressLabel">Direccion guardada</strong>
                <small id="clientReferenceLabel">Referencia</small>
              </div>
              <div class="toolbar-actions">
                <button class="ghost-button compact" id="editClientProfileBtn" type="button">Editar perfil</button>
                <button class="ghost-button compact" id="openOrdersBtn" type="button">Mis pedidos <span id="clientOrderCount">0</span></button>
              </div>
            </div>

            <div class="market-hero compact-hero home-only">
              <div>
                <span class="eyebrow">Centro del pueblo</span>
                <h1>Pide comida en pocos toques.</h1>
                <p>Elige producto, confirma sugeridos y manda el pedido con tu direccion por WhatsApp.</p>
              </div>
              <div class="mode-switch" aria-label="Tipo de pedido">
                <button class="mode-button active" data-order-mode="Entrega" type="button">Entrega</button>
                <button class="mode-button" data-order-mode="Recoger" type="button">Recoger</button>
              </div>
            </div>

            <div class="flow-strip home-only" aria-label="Flujo de compra">
              <div>
                <span>1</span>
                <strong>Explora</strong>
                <small>Tiendas, categorias y promos.</small>
              </div>
              <div>
                <span>2</span>
                <strong>Agrega</strong>
                <small>Notas por producto y carrito por tienda.</small>
              </div>
              <div>
                <span>3</span>
                <strong>Envia</strong>
                <small>Un WhatsApp separado a cada local.</small>
              </div>
            </div>

            <div class="section-title home-only">
              <div>
                <span class="eyebrow">Espacios pagados</span>
                <h2>Promocionados cerca de ti</h2>
              </div>
              <span class="muted">Los locales pueden comprar 3 o 7 dias</span>
            </div>
            <div id="featuredCarousel" class="featured-carousel home-only"></div>

            <div class="section-title home-only">
              <div>
                <span class="eyebrow">Locales asociados</span>
                <h2>Tiendas del pueblo</h2>
              </div>
              <span class="muted">Abiertos y listos para WhatsApp</span>
            </div>
            <div id="storeStrip" class="store-strip home-only"></div>
            <div id="storeSections" class="store-sections home-only"></div>

            <section id="storeProfileSection" class="store-profile-public" hidden>
              <div id="publicStoreBanner" class="public-store-banner"></div>
              <div class="section-title compact-title">
                <div>
                  <span class="eyebrow">Menu de tienda</span>
                  <h2>Productos disponibles</h2>
                </div>
                <button id="backToStoresBtn" class="ghost-button compact" type="button">Ver otras tiendas</button>
              </div>
              <div id="publicStoreProducts" class="menu-list"></div>
            </section>

            <div class="search-row home-only">
              <input id="searchInput" class="search" type="search" placeholder="Buscar hamburguesa, tacos, postres..." />
            </div>
            <div id="categoryList" class="category-list home-only" aria-label="Categorias"></div>
            <div id="productGrid" class="product-grid home-only"></div>
          </section>

        </div>
      </section>

      <section id="storeView" class="view" aria-label="Pantalla tienda">
        <div class="store-shell">
          <div class="dashboard-head">
            <div>
              <span class="eyebrow">Panel de tienda</span>
              <h1 id="storeTitle">Mi tienda</h1>
              <p>Sube productos, revisa contactos, ventas y creditos disponibles.</p>
            </div>
            <div class="dashboard-actions">
              <button id="exportStoreCsv" class="primary-button" type="button">Descargar reporte</button>
              <button id="addCreditsBtn" class="ghost-button" type="button">Comprar creditos</button>
            </div>
          </div>

          <div id="storeMetrics" class="metric-grid"></div>

          <section class="panel-card store-command-panel">
            <div class="section-title compact-title">
              <div>
                <span class="eyebrow">Operacion rapida</span>
                <h2>Link, creditos y acciones</h2>
              </div>
              <span id="storePublicLink" class="muted"></span>
            </div>
            <div id="storeQuickActions" class="command-grid"></div>
          </section>

          <section class="panel-card campaign-panel">
            <div class="section-title compact-title">
              <div>
                <span class="eyebrow">Publicidad</span>
                <h2>Espacios promocionados</h2>
              </div>
              <span class="muted">3 dias $89 | 7 dias $169</span>
            </div>
            <div id="storeCampaigns" class="campaign-list"></div>
          </section>

          <section class="panel-card">
            <div class="section-title compact-title">
              <div>
                <span class="eyebrow">Mi tienda</span>
                <h2>Datos del negocio</h2>
              </div>
            </div>
            <form id="storeProfileForm" class="store-profile-form">
              <label>
                Nombre del local
                <input id="profileStoreName" />
              </label>
              <label>
                Categoria
                <select id="profileStoreCategory">
                  <option>Hamburguesas</option>
                  <option>Tacos</option>
                  <option>Pizza</option>
                  <option>Postres</option>
                  <option>Pollos</option>
                  <option>Sushi</option>
                </select>
              </label>
              <label>
                WhatsApp del local
                <input id="profileStorePhone" />
              </label>
              <label>
                Servicio
                <select id="profileStoreServiceModes">
                  <option value="both">Entrega y recoger</option>
                  <option value="delivery">Solo entrega</option>
                  <option value="pickup">Solo recoger</option>
                </select>
              </label>
              <label class="wide-field">
                Direccion del local
                <textarea id="profileStoreAddress" rows="2"></textarea>
              </label>
              <button class="primary-button compact" type="submit">Guardar tienda</button>
            </form>
          </section>

          <div class="store-layout">
            <section class="panel-card">
              <span class="eyebrow">Producto nuevo</span>
              <h2>Alta de producto</h2>
              <form id="productForm" class="stacked-form">
                <label>
                  Imagen o fotografia
                  <input id="productImage" type="file" accept="image/*" capture="environment" />
                </label>
                <div id="imagePreview" class="image-preview">Sin imagen seleccionada</div>
                <label>
                  Titulo
                  <input id="productTitle" required placeholder="Ej. Hamburguesa doble" />
                </label>
                <label>
                  Breve descripcion
                  <textarea id="productDescription" required rows="3" placeholder="Ingredientes principales y tamano"></textarea>
                </label>
                <div class="form-grid">
                  <label>
                    Precio
                    <input id="productPrice" required type="number" min="1" step="1" placeholder="99" />
                  </label>
                  <label>
                    Disponible para
                    <select id="productAvailability">
                      <option value="both">Entrega y recoger</option>
                      <option value="delivery">Solo entrega</option>
                      <option value="pickup">Solo recoger</option>
                    </select>
                  </label>
                  <label>
                    Descuento
                    <select id="discountType">
                      <option value="none">Sin descuento</option>
                      <option value="percent">Porcentaje</option>
                      <option value="amount">Pesos</option>
                    </select>
                  </label>
                </div>
                <label id="discountValueWrap" hidden>
                  Cantidad de descuento
                  <input id="discountValue" type="number" min="0" step="1" placeholder="Ej. 15 o 20" />
                </label>
                <label>
                  Destacar producto
                  <select id="featuredPlan">
                    <option value="none">No destacar</option>
                    <option value="3">3 dias destacados - $89</option>
                    <option value="7">7 dias destacados - $169</option>
                  </select>
                </label>
                <div class="button-row">
                  <button id="productSubmitBtn" class="primary-button" type="submit">Publicar producto</button>
                  <button id="cancelEditProduct" class="ghost-button" type="button" hidden>Cancelar edicion</button>
                </div>
              </form>
            </section>

            <section class="panel-card">
              <div class="section-title compact-title">
                <h2>Mis productos</h2>
                <span id="storeProductCount">0</span>
              </div>
              <div id="storeProducts" class="store-products"></div>
            </section>
          </div>

          <div class="store-layout reports-layout">
            <section class="panel-card">
              <div class="section-title compact-title">
                <h2>Contactos y creditos</h2>
                <span id="creditStatus">0 creditos</span>
              </div>
              <div id="storeContacts" class="mini-list"></div>
            </section>

            <section class="panel-card">
              <div class="section-title compact-title">
                <h2>Ventas por WhatsApp</h2>
                <span id="storeSalesCount">0</span>
              </div>
              <div id="storeOrders" class="mini-list"></div>
            </section>
          </div>
        </div>
      </section>
    </main>

    <div id="profileModal" class="modal" hidden>
      <div class="modal-card profile-modal-card" role="dialog" aria-modal="true" aria-labelledby="profileTitle">
        <div class="section-title compact-title">
          <div>
            <span class="eyebrow">Perfil de cliente</span>
            <h2 id="profileTitle">Datos de entrega</h2>
          </div>
          <button id="closeProfileModal" class="icon-button" type="button" aria-label="Cerrar">x</button>
        </div>
        <div class="profile-modal-grid">
          <form id="clientProfileForm" class="stacked-form">
            <label>
              Nombre
              <input id="profileName" />
            </label>
            <label>
              WhatsApp
              <input id="profilePhone" />
            </label>
            <label>
              Direccion de entrega
              <textarea id="profileAddress" rows="3"></textarea>
            </label>
            <label>
              Referencia
              <input id="profileReference" />
            </label>
            <button class="primary-button" type="submit">Guardar perfil</button>
          </form>
          <section class="orders-preview">
            <div class="section-title compact-title">
              <h2>Mis pedidos</h2>
              <span id="ordersModalCount">0</span>
            </div>
            <div id="clientOrders" class="mini-list"></div>
          </section>
        </div>
      </div>
    </div>

    <div id="ownerModal" class="modal" hidden>
      <div class="modal-card owner-modal-card" role="dialog" aria-modal="true" aria-labelledby="ownerTitle">
        <div class="section-title compact-title">
          <div>
            <span class="eyebrow">Panel central</span>
            <h2 id="ownerTitle">Tu negocio PuebloPedidos</h2>
          </div>
          <button id="closeOwnerModal" class="icon-button" type="button" aria-label="Cerrar">x</button>
        </div>
        <div id="ownerMetrics" class="metric-grid"></div>
        <div class="owner-grid">
          <section>
            <div class="section-title compact-title">
              <h2>Tiendas</h2>
              <button id="exportOwnerCsv" class="ghost-button compact" type="button">Exportar CSV</button>
            </div>
            <div id="ownerStores" class="mini-list"></div>
          </section>
          <section>
            <div class="section-title compact-title">
              <h2>Actividad reciente</h2>
              <span class="muted">Contactos, pedidos y promos</span>
            </div>
            <div id="ownerActivity" class="mini-list"></div>
          </section>
        </div>
      </div>
    </div>

    <div id="cartModal" class="modal" hidden>
      <div class="modal-card cart-modal-card" role="dialog" aria-modal="true" aria-labelledby="cartTitle">
        <div class="section-title compact-title">
          <div>
            <span class="eyebrow">Carrito de compras</span>
            <h2 id="cartTitle">Tu pedido</h2>
          </div>
          <button id="closeCartModal" class="icon-button" type="button" aria-label="Cerrar">x</button>
        </div>
        <div id="orderPanel"></div>
      </div>
    </div>

    <div id="productModal" class="modal" hidden>
      <div class="modal-card product-modal-card" role="dialog" aria-modal="true" aria-labelledby="productModalTitle">
        <div class="section-title compact-title">
          <div>
            <span class="eyebrow" id="productModalStore">Tienda</span>
            <h2 id="productModalTitle">Producto</h2>
          </div>
          <button id="closeProductModal" class="icon-button" type="button" aria-label="Cerrar">x</button>
        </div>
        <div class="product-detail">
          <img id="productModalImage" src="./assets/hamburguesas.png" alt="" />
          <div class="product-detail-body">
            <p id="productModalDescription"></p>
            <div id="productModalPrice" class="price-row"></div>
            <label>
              Especificaciones para la tienda
              <textarea id="productComment" rows="3" placeholder="Ej. sin cebolla, poca salsa, entregar en porton azul"></textarea>
            </label>
            <button id="confirmAddProduct" class="primary-button" type="button">Agregar 1 al carrito</button>
          </div>
        </div>
      </div>
    </div>

    <div id="upsellModal" class="modal" hidden>
      <div class="modal-card" role="dialog" aria-modal="true" aria-labelledby="upsellTitle">
        <div class="section-title compact-title">
          <div>
            <span class="eyebrow">Antes de enviar</span>
            <h2 id="upsellTitle">No olvides agregar algo mas</h2>
          </div>
          <button id="closeUpsell" class="icon-button" type="button" aria-label="Cerrar">x</button>
        </div>
        <p class="modal-copy">Los sugeridos salen de las tiendas que ya estan en tu carrito. Al enviar, cada negocio recibe su propio WhatsApp.</p>
        <div id="upsellItems" class="upsell-grid"></div>
        <div class="button-row modal-actions">
          <button id="skipUpsell" class="ghost-button" type="button">No gracias, enviar</button>
          <button id="sendFinalOrder" class="primary-button" type="button">Enviar pedidos</button>
        </div>
      </div>
    </div>

    <button id="stickyCartBar" class="sticky-cart-bar" type="button" hidden></button>
    <div id="toast" class="toast" role="status" aria-live="polite"></div>
    <script src="./app.js"></script>
  </body>
</html>

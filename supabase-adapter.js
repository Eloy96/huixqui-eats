(function () {
  const config = window.PUEBLOPEDIDOS_SUPABASE || {};
  const supabaseFactory = window.supabase;

  const adapter = {
    enabled: false,
    client: null,
    reason: "",
  };

  if (!config.url || !config.publishableKey) {
    adapter.reason = "Falta supabase-config.js";
    window.PuebloPedidosSupabase = adapter;
    return;
  }

  if (!supabaseFactory || !supabaseFactory.createClient) {
    adapter.reason = "No se cargo la libreria de Supabase";
    window.PuebloPedidosSupabase = adapter;
    return;
  }

  const client = supabaseFactory.createClient(config.url, config.publishableKey, {
    auth: {
      persistSession: true,
      autoRefreshToken: true,
      detectSessionInUrl: true,
    },
  });

  function publicUrl(bucket, path) {
    if (!path) return "";
    const { data } = client.storage.from(bucket).getPublicUrl(path);
    return data.publicUrl;
  }

  function pathFromName(...parts) {
    return parts
      .filter(Boolean)
      .join("/")
      .replace(/\/+/g, "/")
      .replace(/[^a-zA-Z0-9._/-]/g, "-");
  }

  async function uploadFile(bucket, path, file) {
    if (!file) return "";
    const { error } = await client.storage.from(bucket).upload(path, file, {
      cacheControl: "3600",
      upsert: true,
    });
    if (error) throw error;
    return path;
  }

  async function signUpCustomer({ email, password, name, phone }) {
    return client.auth.signUp({
      email,
      password,
      options: {
        data: {
          role: "customer",
          full_name: name,
          phone,
        },
      },
    });
  }

  async function signUpStoreOwner({ email, password, owner, phone }) {
    return client.auth.signUp({
      email,
      password,
      options: {
        data: {
          role: "store_owner",
          full_name: owner,
          phone,
        },
      },
    });
  }

  async function signInWithEmail(email, password) {
    return client.auth.signInWithPassword({ email, password });
  }

  async function signOut() {
    return client.auth.signOut();
  }

  async function getSession() {
    return client.auth.getSession();
  }

  async function currentUser() {
    const { data, error } = await client.auth.getUser();
    if (error) throw error;
    return data.user;
  }

  async function getProfile() {
    const user = await currentUser();
    if (!user) return null;
    const { data, error } = await client.from("profiles").select("*").eq("id", user.id).single();
    if (error) throw error;
    return data;
  }

  async function upsertProfile(profile) {
    const { data, error } = await client.from("profiles").upsert(profile).select().single();
    if (error) throw error;
    return data;
  }

  async function getOwnedStore() {
    const user = await currentUser();
    if (!user) return null;
    const { data, error } = await client.from("stores").select("*").eq("owner_id", user.id).maybeSingle();
    if (error) throw error;
    return data;
  }

  async function createStore(store) {
    const { data, error } = await client.from("stores").insert(store).select().single();
    if (error) throw error;
    return data;
  }

  async function updateStore(storeId, patch) {
    const { data, error } = await client.from("stores").update(patch).eq("id", storeId).select().single();
    if (error) throw error;
    return data;
  }

  async function createProduct(product) {
    const { data, error } = await client.from("products").insert(product).select().single();
    if (error) throw error;
    return data;
  }

  async function updateProduct(productId, patch) {
    const { data, error } = await client.from("products").update(patch).eq("id", productId).select().single();
    if (error) throw error;
    return data;
  }

  async function upsertFoodDetails(details) {
    const { data, error } = await client.from("product_food_details").upsert(details).select().single();
    if (error) throw error;
    return data;
  }

  async function upsertRetailDetails(details) {
    const { data, error } = await client.from("product_retail_details").upsert(details).select().single();
    if (error) throw error;
    return data;
  }

  async function upsertServiceDetails(details) {
    const { data, error } = await client.from("product_service_details").upsert(details).select().single();
    if (error) throw error;
    return data;
  }

  async function listActiveStores() {
    const { data, error } = await client
      .from("stores")
      .select("id, slug, name, category, description, logo_path, cover_path, address, whatsapp, service_modes, status")
      .eq("status", "active")
      .order("created_at", { ascending: false });
    if (error) throw error;
    return data || [];
  }

  async function listProductsByStore(storeId) {
    const { data, error } = await client
      .from("products")
      .select("*")
      .eq("store_id", storeId)
      .eq("is_active", true)
      .order("created_at", { ascending: false });
    if (error) throw error;
    return data || [];
  }

  async function smokeTest() {
    const { data, error } = await client.from("stores").select("id").limit(1);
    if (error) throw error;
    return data;
  }

  window.PuebloPedidosSupabase = {
    enabled: true,
    client,
    publicUrl,
    pathFromName,
    uploadFile,
    signUpCustomer,
    signUpStoreOwner,
    signInWithEmail,
    signOut,
    getSession,
    currentUser,
    getProfile,
    upsertProfile,
    getOwnedStore,
    createStore,
    updateStore,
    createProduct,
    updateProduct,
    upsertFoodDetails,
    upsertRetailDetails,
    upsertServiceDetails,
    listActiveStores,
    listProductsByStore,
    smokeTest,
  };
})();

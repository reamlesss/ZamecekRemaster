window.createSiteSupabaseClient = function createSiteSupabaseClient() {
  const config = window.supabaseSiteConfig;
  if (!config?.url || !config?.anonKey || !window.supabase?.createClient) {
    return null;
  }

  try {
    return window.supabase.createClient(config.url, config.anonKey, {
      auth: {
        autoRefreshToken: true,
        persistSession: true,
        detectSessionInUrl: true,
      },
    });
  } catch (error) {
    console.error("Supabase configuration is invalid.", error);
    return null;
  }
};

import { createClient } from "@supabase/supabase-js";

export function getSupabasePublicEnv() {
  return {
    NEXT_PUBLIC_SUPABASE_ANON_KEY: process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY,
    NEXT_PUBLIC_SUPABASE_URL: process.env.NEXT_PUBLIC_SUPABASE_URL,
  };
}

export function getSupabaseConfig(env = getSupabasePublicEnv()) {
  const url = clean(env.NEXT_PUBLIC_SUPABASE_URL);
  const anonKey = clean(env.NEXT_PUBLIC_SUPABASE_ANON_KEY);

  return {
    anonKey,
    isConfigured: Boolean(url && anonKey),
    url,
  };
}

export function createBrowserSupabaseClient(env = process.env) {
  const config = getSupabaseConfig(env);
  if (!config.isConfigured) return null;

  return createClient(config.url, config.anonKey, {
    auth: {
      autoRefreshToken: true,
      detectSessionInUrl: true,
      persistSession: true,
    },
  });
}

export function getAuthRedirectUrl(locationLike, fallback = "") {
  const origin = clean(locationLike?.origin) || clean(fallback);
  return origin || undefined;
}

function clean(value) {
  return String(value ?? "").trim();
}

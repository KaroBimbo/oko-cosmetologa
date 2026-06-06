import test from "node:test";
import assert from "node:assert/strict";

import { createBrowserSupabaseClient, getAuthRedirectUrl, getSupabaseConfig } from "../lib/supabase.js";

test("detects missing Supabase public config without crashing the app", () => {
  assert.deepEqual(getSupabaseConfig({}), {
    anonKey: "",
    isConfigured: false,
    url: "",
  });

  assert.equal(createBrowserSupabaseClient({}), null);
});

test("creates Supabase config from public environment variables", () => {
  assert.deepEqual(
    getSupabaseConfig({
      NEXT_PUBLIC_SUPABASE_ANON_KEY: " anon-key ",
      NEXT_PUBLIC_SUPABASE_URL: " https://project.supabase.co ",
    }),
    {
      anonKey: "anon-key",
      isConfigured: true,
      url: "https://project.supabase.co",
    },
  );
});

test("builds a safe auth redirect URL from the current browser origin", () => {
  assert.equal(getAuthRedirectUrl({ origin: "https://oko.example" }), "https://oko.example");
  assert.equal(getAuthRedirectUrl(null, "https://fallback.example"), "https://fallback.example");
  assert.equal(getAuthRedirectUrl(null), undefined);
});

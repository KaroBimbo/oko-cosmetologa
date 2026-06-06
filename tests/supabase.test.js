import test from "node:test";
import assert from "node:assert/strict";

import {
  createBrowserSupabaseClient,
  getAuthRedirectUrl,
  getSupabaseConfig,
  getSupabasePublicEnv,
} from "../lib/supabase.js";

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

test("reads Supabase public variables through explicit Next.js env keys", () => {
  const previousUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const previousAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

  process.env.NEXT_PUBLIC_SUPABASE_URL = "https://demo.supabase.co";
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY = "demo-key";

  assert.deepEqual(getSupabasePublicEnv(), {
    NEXT_PUBLIC_SUPABASE_ANON_KEY: "demo-key",
    NEXT_PUBLIC_SUPABASE_URL: "https://demo.supabase.co",
  });

  process.env.NEXT_PUBLIC_SUPABASE_URL = previousUrl;
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY = previousAnonKey;
});

test("creates a browser Supabase client from explicit public env keys", () => {
  const previousUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const previousAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

  process.env.NEXT_PUBLIC_SUPABASE_URL = "https://demo.supabase.co";
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY = "demo-key";

  const client = createBrowserSupabaseClient();
  assert.ok(client);

  process.env.NEXT_PUBLIC_SUPABASE_URL = previousUrl;
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY = previousAnonKey;
});

test("builds a safe auth redirect URL from the current browser origin", () => {
  assert.equal(getAuthRedirectUrl({ origin: "https://oko.example" }), "https://oko.example");
  assert.equal(getAuthRedirectUrl(null, "https://fallback.example"), "https://fallback.example");
  assert.equal(getAuthRedirectUrl(null), undefined);
});

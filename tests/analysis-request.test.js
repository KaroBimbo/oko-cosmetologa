import test from "node:test";
import assert from "node:assert/strict";

import { validateAnalyzePayload, validateRuntimeConfig } from "../lib/analysis-request.js";

test("validates the analyze form payload with safe defaults", () => {
  const payload = validateAnalyzePayload({
    city: " Санкт-Петербург ",
    service: " контурная пластика ",
    limit: "33",
    instagramProfiles: "clinic_linia, https://instagram.com/doctor.skin.spb/",
    sources: { instagram: true, avito: false, yandex: true },
  });

  assert.deepEqual(payload, {
    city: "Санкт-Петербург",
    service: "контурная пластика",
    limit: 5,
    instagramProfiles: ["clinic_linia", "doctor.skin.spb"],
    sources: { instagram: true, avito: false, yandex: true },
  });
});

test("rejects empty city or service fields", () => {
  assert.throws(() => validateAnalyzePayload({ city: "", service: "контурная пластика" }), /город/i);
  assert.throws(() => validateAnalyzePayload({ city: "Санкт-Петербург", service: "" }), /услугу/i);
});

test("reports missing server API keys before external requests start", () => {
  assert.throws(
    () => validateRuntimeConfig({ APIFY_TOKEN: "", OPENROUTER_API_KEY: "ok" }),
    /APIFY_TOKEN/,
  );
  assert.throws(
    () => validateRuntimeConfig({ APIFY_TOKEN: "ok", OPENROUTER_API_KEY: "" }),
    /OPENROUTER_API_KEY/,
  );
});

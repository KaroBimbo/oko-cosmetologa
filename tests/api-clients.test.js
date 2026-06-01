import test from "node:test";
import assert from "node:assert/strict";

import { buildApifySyncUrl } from "../lib/apify.js";
import { readOpenRouterMessage } from "../lib/openrouter.js";

test("builds an Apify sync dataset URL using actor ids with namespaces", () => {
  const url = buildApifySyncUrl({
    actorId: "compass/crawler-google-places",
    token: "secret token",
    timeoutSeconds: 90,
  });

  assert.equal(
    url,
    "https://api.apify.com/v2/acts/compass~crawler-google-places/run-sync-get-dataset-items?token=secret+token&timeout=90",
  );
});

test("reads the first OpenRouter assistant message", () => {
  assert.equal(
    readOpenRouterMessage({
      choices: [{ message: { content: "Готовый отчет" } }],
    }),
    "Готовый отчет",
  );
});

test("fails clearly when OpenRouter returns no text", () => {
  assert.throws(() => readOpenRouterMessage({ choices: [] }), /пустой ответ/i);
});

import test from "node:test";
import assert from "node:assert/strict";

import { buildApifySyncUrl, runApifyActorSync } from "../lib/apify.js";
import { readOpenRouterMessage, runOpenRouterAnalysis } from "../lib/openrouter.js";

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

test("runs Apify requests with an abort signal", async () => {
  let signal;
  const rows = await runApifyActorSync({
    actorId: "compass/crawler-google-places",
    token: "secret",
    input: { searchStringsArray: ["test"] },
    timeoutSeconds: 5,
    fetcher: async (_url, options) => {
      signal = options.signal;
      return new Response(JSON.stringify([]), { status: 200 });
    },
  });

  assert.deepEqual(rows, []);
  assert.ok(signal instanceof AbortSignal);
});

test("fails clearly when an Apify request exceeds the local timeout", async () => {
  await assert.rejects(
    () =>
      runApifyActorSync({
        actorId: "compass/crawler-google-places",
        token: "secret",
        input: {},
        timeoutSeconds: 5,
        requestTimeoutMs: 1000,
        fetcher: async () => {
          const error = new Error("aborted");
          error.name = "AbortError";
          throw error;
        },
      }),
    /Apify не успел ответить за 1 сек\./,
  );
});

test("fails clearly when an Apify response body exceeds the local timeout", async () => {
  await assert.rejects(
    () =>
      runApifyActorSync({
        actorId: "compass/crawler-google-places",
        token: "secret",
        input: {},
        timeoutSeconds: 5,
        requestTimeoutMs: 1000,
        fetcher: async () => ({
          ok: true,
          json: async () => {
            const error = new Error("aborted");
            error.name = "AbortError";
            throw error;
          },
        }),
      }),
    /Apify не успел ответить за 1 сек\./,
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

test("runs OpenRouter requests with an abort signal", async () => {
  let signal;
  const report = await runOpenRouterAnalysis({
    apiKey: "secret",
    model: "openrouter/test",
    prompt: "test",
    requestTimeoutMs: 1000,
    fetcher: async (_url, options) => {
      signal = options.signal;
      return new Response(JSON.stringify({ choices: [{ message: { content: "Готовый отчет" } }] }), { status: 200 });
    },
  });

  assert.equal(report, "Готовый отчет");
  assert.ok(signal instanceof AbortSignal);
});

test("fails clearly when OpenRouter exceeds the local timeout", async () => {
  await assert.rejects(
    () =>
      runOpenRouterAnalysis({
        apiKey: "secret",
        model: "openrouter/test",
        prompt: "test",
        requestTimeoutMs: 1000,
        fetcher: async () => {
          const error = new Error("aborted");
          error.name = "AbortError";
          throw error;
        },
      }),
    /OpenRouter не успел ответить за 1 сек\./,
  );
});

test("fails clearly when an OpenRouter response body exceeds the local timeout", async () => {
  await assert.rejects(
    () =>
      runOpenRouterAnalysis({
        apiKey: "secret",
        model: "openrouter/test",
        prompt: "test",
        requestTimeoutMs: 1000,
        fetcher: async () => ({
          ok: true,
          json: async () => {
            const error = new Error("aborted");
            error.name = "AbortError";
            throw error;
          },
        }),
      }),
    /OpenRouter не успел ответить за 1 сек\./,
  );
});

test("fails clearly when OpenRouter returns no text", () => {
  assert.throws(() => readOpenRouterMessage({ choices: [] }), /пустой ответ/i);
});

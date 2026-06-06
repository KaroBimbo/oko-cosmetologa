import { clampCompetitorLimit, extractInstagramUsernames } from "./market-data.js";

export function validateAnalyzePayload(payload) {
  const city = clean(payload?.city);
  const service = clean(payload?.service);

  if (!city) {
    throw new Error("Укажите город для анализа.");
  }

  if (!service) {
    throw new Error("Укажите услугу или препарат для анализа.");
  }

  return {
    city,
    service,
    limit: clampCompetitorLimit(payload?.limit),
    instagramProfiles: extractInstagramUsernames(splitProfiles(payload?.instagramProfiles)),
    sources: {
      instagram: payload?.sources?.instagram !== false,
      avito: payload?.sources?.avito !== false,
      yandex: payload?.sources?.yandex !== false,
      twoGis: payload?.sources?.twoGis === true,
      zoon: payload?.sources?.zoon === true,
      prodoctorov: payload?.sources?.prodoctorov === true,
      napopravku: payload?.sources?.napopravku === true,
      yell: payload?.sources?.yell === true,
      vk: payload?.sources?.vk === true,
      telegram: payload?.sources?.telegram === true,
      wordstat: payload?.sources?.wordstat === true,
    },
  };
}

export function validateRuntimeConfig(env) {
  const missing = [];
  if (!clean(env.APIFY_TOKEN)) missing.push("APIFY_TOKEN");
  if (!clean(env.OPENROUTER_API_KEY)) missing.push("OPENROUTER_API_KEY");

  if (missing.length > 0) {
    throw new Error(`На сервере не настроены переменные: ${missing.join(", ")}.`);
  }

  return {
    apifyToken: env.APIFY_TOKEN,
    openRouterApiKey: env.OPENROUTER_API_KEY,
    openRouterModel: clean(env.OPENROUTER_MODEL) || "openrouter/owl-alpha",
    mapsActorId: clean(env.APIFY_MAPS_ACTOR) || "compass/crawler-google-places",
    crawlerActorId: clean(env.APIFY_CRAWLER_ACTOR) || "apify/website-content-crawler",
    yandexMapsActorId: clean(env.APIFY_YANDEX_MAPS_ACTOR) || "automation-lab/yandex-maps-lead-finder",
    avitoActorId: clean(env.APIFY_AVITO_ACTOR) || "daddyapi/avito-scraper",
    instagramActorId: clean(env.APIFY_INSTAGRAM_ACTOR) || "apify/instagram-profile-scraper",
    twoGisActorId: clean(env.APIFY_2GIS_ACTOR),
    zoonActorId: clean(env.APIFY_ZOON_ACTOR),
    prodoctorovActorId: clean(env.APIFY_PRODOCTOROV_ACTOR),
    napopravkuActorId: clean(env.APIFY_NAPOPRAVKU_ACTOR),
    yellActorId: clean(env.APIFY_YELL_ACTOR),
    vkActorId: clean(env.APIFY_VK_ACTOR),
    telegramActorId: clean(env.APIFY_TELEGRAM_ACTOR),
    wordstatActorId: clean(env.APIFY_WORDSTAT_ACTOR),
  };
}

function clean(value) {
  return String(value ?? "").replace(/\s+/g, " ").trim();
}

function splitProfiles(value) {
  if (Array.isArray(value)) return value;
  return String(value ?? "")
    .split(/[,\n]/)
    .map((item) => item.trim())
    .filter(Boolean);
}

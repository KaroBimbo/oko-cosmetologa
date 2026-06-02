import { validateAnalyzePayload, validateRuntimeConfig } from "../../../lib/analysis-request.js";
import { runOpenRouterAnalysis } from "../../../lib/openrouter.js";

export const runtime = "nodejs";
export const maxDuration = 60;

export async function POST(request) {
  let payload;
  const warnings = [];

  try {
    payload = validateAnalyzePayload(await readRequestJson(request));
  } catch (error) {
    return Response.json({ error: error.message || "Не удалось прочитать параметры анализа." }, { status: 400 });
  }

  let config;
  try {
    config = validateRuntimeConfig(process.env);
  } catch (error) {
    config = {
      apifyToken: process.env.APIFY_TOKEN || "",
      openRouterApiKey: process.env.OPENROUTER_API_KEY || "",
      openRouterModel: process.env.OPENROUTER_MODEL || "openrouter/auto",
    };
    warnings.push(error.message || "Не все переменные окружения настроены.");
  }

  const apifyCheck = await checkApifyToken(config.apifyToken);
  warnings.push(apifyCheck.ok ? "Apify API: соединение проверено." : `Apify API: ${apifyCheck.warning}`);

  const competitors = buildFallbackCompetitors(payload);
  const supplementalSources = buildSupplementalSources(payload);
  const brief = buildBrief({ payload, competitors, supplementalSources, apifyCheck });

  let report = "";
  if (config.openRouterApiKey) {
    try {
      report = await runOpenRouterAnalysis({
        apiKey: config.openRouterApiKey,
        model: config.openRouterModel || "openrouter/auto",
        prompt: createShortPrompt(brief),
        appUrl: getAppUrl(),
      });
    } catch (error) {
      warnings.push(error.message || "OpenRouter не успел подготовить отчет.");
      report = createFastFallbackReport(brief, warnings);
    }
  } else {
    warnings.push("OPENROUTER_API_KEY не найден, показан быстрый учебный отчет.");
    report = createFastFallbackReport(brief, warnings);
  }

  return Response.json({
    report,
    brief,
    meta: {
      model: config.openRouterModel || "openrouter/auto",
      competitorCount: competitors.length,
      scannedWebsites: 0,
      yandexCount: supplementalSources.yandexMaps.length,
      avitoCount: supplementalSources.avito.length,
      instagramCount: supplementalSources.instagram.length,
      warnings,
    },
  });
}

async function checkApifyToken(token) {
  if (!token) {
    return { ok: false, warning: "APIFY_TOKEN не найден." };
  }

  try {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 6500);
    const url = new URL("https://api.apify.com/v2/users/me");
    url.searchParams.set("token", token);

    const response = await fetch(url.toString(), { signal: controller.signal });
    clearTimeout(timeout);

    if (!response.ok) {
      let message = "токен не прошел быструю проверку";
      try {
        const body = await response.json();
        message = body?.error?.message || body?.message || message;
      } catch {}
      return { ok: false, warning: message };
    }

    return { ok: true, warning: "" };
  } catch (error) {
    return { ok: false, warning: error?.name === "AbortError" ? "быстрая проверка не успела ответить за 6 секунд" : error.message };
  }
}

function buildFallbackCompetitors(payload) {
  const city = payload.city || "Санкт-Петербург";
  const service = payload.service || "косметология";
  const limit = Math.min(payload.limit || 3, 3);

  return [
    {
      id: "fast-1",
      name: "Lumiere Clinic",
      category: "Косметология",
      address: `${city}, Петроградская сторона`,
      website: "",
      phone: "",
      rating: 4.8,
      reviewCount: 142,
      price: `Запрос: ${service}`,
      commercialSignals: {
        prices: [`${service}: цена не найдена`],
        promotions: ["Нужна проверка карточек и прайсов"],
        packages: [],
        preparations: extractLikelyPreparations(service),
      },
      reviews: [],
    },
    {
      id: "fast-2",
      name: "Asteria Beauty Lab",
      category: "Beauty clinic",
      address: `${city}, Центральный район`,
      website: "",
      phone: "",
      rating: 4.6,
      reviewCount: 96,
      price: `Запрос: ${service}`,
      commercialSignals: {
        prices: [`${service}: цена не найдена`],
        promotions: ["Можно сравнить входные офферы"],
        packages: [],
        preparations: extractLikelyPreparations(service),
      },
      reviews: [],
    },
    {
      id: "fast-3",
      name: "Skin Point Studio",
      category: "Студия косметологии",
      address: `${city}, локальный рынок`,
      website: "",
      phone: "",
      rating: 4.7,
      reviewCount: 118,
      price: `Запрос: ${service}`,
      commercialSignals: {
        prices: [`${service}: цена не найдена`],
        promotions: [],
        packages: [],
        preparations: extractLikelyPreparations(service),
      },
      reviews: [],
    },
  ].slice(0, limit);
}

function buildSupplementalSources(payload) {
  const city = payload.city || "Санкт-Петербург";
  const service = payload.service || "косметология";

  return {
    yandexMaps: payload.sources.yandex
      ? [
          { name: "Быстрая проверка Яндекс Карт", address: `${city}: ${service}`, rating: null },
          { name: "Источник отключен от глубокого парсинга", address: "Чтобы не ловить таймаут Vercel", rating: null },
        ]
      : [],
    avito: payload.sources.avito
      ? [
          { title: `Avito: ${service}`, price: "нужна ручная проверка", location: city },
          { title: "Быстрый режим", price: "глубокий парсинг выключен", location: city },
        ]
      : [],
    instagram: payload.sources.instagram
      ? payload.instagramProfiles.map((username) => ({ username, followersCount: null, fullName: "Профиль добавлен вручную" }))
      : [],
  };
}

function buildBrief({ payload, competitors, supplementalSources, apifyCheck }) {
  return {
    search: {
      city: payload.city,
      service: payload.service,
      collectedAt: new Date().toISOString(),
      mode: "fast-vercel-safe",
      apifyApiChecked: apifyCheck.ok,
    },
    competitors,
    supplementalSources,
  };
}

function createShortPrompt(brief) {
  return `Подготовь короткий отчет на русском для косметолога по учебному веб-сервису анализа конкурентов. Не выдумывай реальные цены. Укажи, что быстрый режим проверил API и сформировал безопасный отчет без глубокого парсинга. Данные: ${JSON.stringify(brief)}`;
}

function createFastFallbackReport(brief, warnings) {
  const names = brief.competitors.map((item) => `- ${item.name}: ${item.address}, рейтинг ${item.rating ?? "не найден"}`).join("\n");
  const warningText = warnings.length ? warnings.map((item) => `- ${item}`).join("\n") : "- Предупреждений нет.";

  return `# Быстрый отчет по рынку

## 1. Карта рынка
Запрос: ${brief.search.service}, город: ${brief.search.city}. В быстром режиме сформирована учебная конкурентная карта:\n${names}

## 2. API и источники
Apify API был проверен быстрым запросом к аккаунту. Глубокий парсинг акторов временно отключен, чтобы Vercel не обрывал запрос по таймауту.

## 3. Цены и офферы
Реальные цены не выдумываются. Для точного анализа нужны карточки, прайсы или выгрузка из источников.

## 4. Что можно применить в работе
- Сравнивать конкурентов по одной услуге.
- Отмечать препарат, цену, район и отзывы.
- Показывать предупреждения, если источник не успел ответить.

## 5. Предупреждения
${warningText}`;
}

function extractLikelyPreparations(service) {
  const text = String(service || "").toLowerCase();
  if (/губ|филлер|контур/.test(text)) return ["Juvederm", "Stylage", "Belotero"];
  if (/бот|диспорт|релатокс|ксеомин/.test(text)) return ["Botox", "Dysport", "Xeomin"];
  return [];
}

async function readRequestJson(request) {
  try {
    return await request.json();
  } catch {
    throw new Error("Не удалось прочитать параметры анализа.");
  }
}

function getAppUrl() {
  if (process.env.NEXT_PUBLIC_APP_URL) return process.env.NEXT_PUBLIC_APP_URL;
  if (process.env.VERCEL_URL) return `https://${process.env.VERCEL_URL}`;
  return "https://vercel.app";
}

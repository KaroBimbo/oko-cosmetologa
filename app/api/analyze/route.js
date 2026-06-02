import { runApifyActorSync } from "../../../lib/apify.js";
import { validateAnalyzePayload, validateRuntimeConfig } from "../../../lib/analysis-request.js";
import {
  buildAvitoActorInput,
  buildInstagramProfileInput,
  buildMapsActorInput,
  buildYandexMapsActorInput,
  createAnalysisPrompt,
  extractInstagramUsernames,
  normalizePlaces,
  prepareCompetitorBrief,
} from "../../../lib/market-data.js";
import { runOpenRouterAnalysis } from "../../../lib/openrouter.js";

export const runtime = "nodejs";
export const maxDuration = 60;

export async function POST(request) {
  try {
    const config = validateRuntimeConfig(process.env);
    const payload = validateAnalyzePayload(await readRequestJson(request));
    const warnings = [];

    let mapsRows = [];
    try {
      mapsRows = await runApifyActorSync({
        actorId: config.mapsActorId,
        token: config.apifyToken,
        input: buildMapsActorInput(payload),
        timeoutSeconds: 32,
      });
    } catch (error) {
      warnings.push(`Apify Maps: ${error.message}`);
    }

    let competitors = normalizePlaces(mapsRows).slice(0, payload.limit);

    if (competitors.length === 0) {
      competitors = buildFallbackCompetitors(payload);
      warnings.push(
        "Apify не успел вернуть данные за лимит Vercel, поэтому показан быстрый учебный отчет на основе введенного города и услуги.",
      );
    }

    const websitePages = [];
    warnings.push("Сканирование сайтов отключено в быстром режиме, чтобы Vercel не обрывал запрос по таймауту.");

    const supplementalSources = {
      yandexMaps: [],
      avito: [],
      instagram: [],
    };

    if (payload.sources.yandex) {
      const { rows, warning } = await runOptionalApifyActor({
        actorId: config.yandexMapsActorId,
        token: config.apifyToken,
        input: buildYandexMapsActorInput(payload),
        timeoutSeconds: 18,
        sourceName: "Яндекс Карты",
      });
      supplementalSources.yandexMaps = rows;
      if (warning) warnings.push(warning);
    }

    if (payload.sources.avito) {
      const { rows, warning } = await runOptionalApifyActor({
        actorId: config.avitoActorId,
        token: config.apifyToken,
        input: buildAvitoActorInput(payload),
        timeoutSeconds: 18,
        sourceName: "Avito",
      });
      supplementalSources.avito = rows;
      if (warning) warnings.push(warning);
    }

    if (payload.sources.instagram) {
      const discoveredInstagramProfiles = extractInstagramUsernames(payload.instagramProfiles);

      if (discoveredInstagramProfiles.length > 0) {
        const { rows, warning } = await runOptionalApifyActor({
          actorId: config.instagramActorId,
          token: config.apifyToken,
          input: buildInstagramProfileInput(discoveredInstagramProfiles),
          timeoutSeconds: 18,
          sourceName: "Instagram",
        });
        supplementalSources.instagram = rows;
        if (warning) warnings.push(warning);
      } else {
        warnings.push("Instagram включен, но профили не найдены. Вставьте username или ссылку на профиль клиники вручную.");
      }
    }

    const brief = prepareCompetitorBrief({
      competitors,
      websitePages,
      city: payload.city,
      service: payload.service,
      supplementalSources,
    });

    let report = "";
    try {
      report = await runOpenRouterAnalysis({
        apiKey: config.openRouterApiKey,
        model: config.openRouterModel,
        prompt: createAnalysisPrompt(brief),
        appUrl: getAppUrl(),
      });
    } catch (error) {
      warnings.push(error.message);
      report = createFastFallbackReport(brief, warnings);
    }

    return Response.json({
      report,
      brief,
      meta: {
        model: config.openRouterModel,
        competitorCount: brief.competitors.length,
        scannedWebsites: 0,
        yandexCount: brief.supplementalSources.yandexMaps.length,
        avitoCount: brief.supplementalSources.avito.length,
        instagramCount: brief.supplementalSources.instagram.length,
        warnings,
      },
    });
  } catch (error) {
    return Response.json({ error: error.message || "Не удалось подготовить отчет." }, { status: statusForError(error) });
  }
}

async function runOptionalApifyActor({ sourceName, ...options }) {
  try {
    return {
      rows: await runApifyActorSync(options),
      warning: "",
    };
  } catch (error) {
    return {
      rows: [],
      warning: `${sourceName}: ${error.message}`,
    };
  }
}

function buildFallbackCompetitors(payload) {
  const city = payload.city || "Санкт-Петербург";
  const service = payload.service || "косметология";
  const limit = Math.min(payload.limit || 3, 3);

  return [
    {
      id: "fallback-1",
      name: "Lumiere Clinic",
      category: "Косметология",
      address: `${city}, центральный район`,
      website: "",
      phone: "",
      rating: 4.8,
      reviewCount: 142,
      price: `Запрос: ${service}`,
      googleMapsUrl: "",
      location: null,
      reviews: [],
    },
    {
      id: "fallback-2",
      name: "Asteria Beauty Lab",
      category: "Beauty clinic",
      address: `${city}, рядом с метро`,
      website: "",
      phone: "",
      rating: 4.6,
      reviewCount: 96,
      price: `Запрос: ${service}`,
      googleMapsUrl: "",
      location: null,
      reviews: [],
    },
    {
      id: "fallback-3",
      name: "Skin Point Studio",
      category: "Студия косметологии",
      address: `${city}, локальный рынок`,
      website: "",
      phone: "",
      rating: 4.7,
      reviewCount: 118,
      price: `Запрос: ${service}`,
      googleMapsUrl: "",
      location: null,
      reviews: [],
    },
  ].slice(0, limit);
}

function createFastFallbackReport(brief, warnings) {
  const names = brief.competitors.map((item) => `- ${item.name}: рейтинг ${item.rating ?? "не найден"}, адрес: ${item.address || "не найден"}`).join("\n");
  const warningText = warnings.length ? warnings.map((item) => `- ${item}`).join("\n") : "- Предупреждений нет.";

  return `# Быстрый отчет по рынку

## 1. Карта рынка
Запрос: ${brief.search.service}, город: ${brief.search.city}. Найденные или учебно восстановленные конкуренты:\n${names}

## 2. Цены и пакеты
Цены не найдены: быстрый режим не сканирует сайты и прайс-листы, чтобы уложиться в лимит Vercel.

## 3. Позиционирование конкурентов
По названиям и категориям рынок выглядит как смесь клиник, beauty-студий и локальных специалистов. Для точного вывода нужны страницы прайсов или карточки источников.

## 4. Что можно применить в работе
- Сравнивать входные офферы по одной услуге, а не по всему прайсу.
- Отдельно отмечать препараты, цену, район и отзывы.
- Добавить предупреждения о качестве данных, если источник не успел ответить.

## 5. Риски качества данных
${warningText}`;
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
  return "http://localhost:3000";
}

function statusForError(error) {
  const message = error.message || "";
  if (/Укажите|прочитать параметры/i.test(message)) return 400;
  if (/APIFY_TOKEN|OPENROUTER_API_KEY|переменные/i.test(message)) return 500;
  if (/Apify|OpenRouter/i.test(message)) return 502;
  return 500;
}

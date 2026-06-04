import { runApifyActorSync } from "../../../lib/apify.js";
import { validateAnalyzePayload, validateRuntimeConfig } from "../../../lib/analysis-request.js";
import {
  buildAvitoActorInput,
  buildCrawlerInput,
  buildFallbackMapsRows,
  buildInstagramProfileInput,
  buildMapsActorInput,
  buildYandexMapsActorInput,
  createAnalysisPrompt,
  createLocalAnalysisReport,
  extractInstagramUsernames,
  normalizePlaces,
  prepareCompetitorBrief,
} from "../../../lib/market-data.js";
import { runOpenRouterAnalysis } from "../../../lib/openrouter.js";

export const runtime = "nodejs";
export const maxDuration = 60;

const MAPS_TIMEOUT_SECONDS = 22;
const MAPS_REQUEST_TIMEOUT_MS = 25_000;
const OPTIONAL_SOURCE_TIMEOUT_SECONDS = 2;
const OPTIONAL_REQUEST_TIMEOUT_MS = 3_000;
const AI_REQUEST_TIMEOUT_MS = 10_000;

export async function POST(request) {
  try {
    const config = validateRuntimeConfig(process.env);
    const payload = validateAnalyzePayload(await readRequestJson(request));

    const warnings = [];
    const mapsResult = await runMapsActor({
      actorId: config.mapsActorId,
      token: config.apifyToken,
      payload,
    });
    warnings.push(...mapsResult.warnings);

    const competitors = normalizePlaces(mapsResult.rows).slice(0, payload.limit);

    if (competitors.length === 0) {
      return Response.json(
        {
          error:
            "Apify не вернул подходящих косметологических конкурентов. Попробуйте другой запрос: например, 'косметология', 'контурная пластика губ' или район города.",
        },
        { status: 422 },
      );
    }

    const crawlerInput = mapsResult.usedFallback ? { startUrls: [] } : buildCrawlerInput(competitors);
    const websiteTask =
      crawlerInput.startUrls.length > 0
        ? runOptionalApifyActor({
            actorId: config.crawlerActorId,
            token: config.apifyToken,
            input: crawlerInput,
            timeoutSeconds: OPTIONAL_SOURCE_TIMEOUT_SECONDS,
            requestTimeoutMs: OPTIONAL_REQUEST_TIMEOUT_MS,
            sourceName: "Сайты конкурентов",
          })
        : Promise.resolve({
            rows: [],
            warning: "У найденных конкурентов не было сайтов для анализа прайсов.",
          });

    const yandexTask = payload.sources.yandex
      ? runOptionalApifyActor({
          actorId: config.yandexMapsActorId,
          token: config.apifyToken,
          input: buildYandexMapsActorInput(payload),
          timeoutSeconds: OPTIONAL_SOURCE_TIMEOUT_SECONDS,
          requestTimeoutMs: OPTIONAL_REQUEST_TIMEOUT_MS,
          sourceName: "Яндекс Карты",
        })
      : Promise.resolve({ rows: [], warning: "" });

    const avitoTask = payload.sources.avito
      ? runOptionalApifyActor({
          actorId: config.avitoActorId,
          token: config.apifyToken,
          input: buildAvitoActorInput(payload),
          timeoutSeconds: OPTIONAL_SOURCE_TIMEOUT_SECONDS,
          requestTimeoutMs: OPTIONAL_REQUEST_TIMEOUT_MS,
          sourceName: "Avito",
        })
      : Promise.resolve({ rows: [], warning: "" });

    const instagramProfiles = extractInstagramUsernames(payload.instagramProfiles);
    const instagramTask =
      payload.sources.instagram && instagramProfiles.length > 0
        ? runOptionalApifyActor({
            actorId: config.instagramActorId,
            token: config.apifyToken,
            input: buildInstagramProfileInput(instagramProfiles),
            timeoutSeconds: OPTIONAL_SOURCE_TIMEOUT_SECONDS,
            requestTimeoutMs: OPTIONAL_REQUEST_TIMEOUT_MS,
            sourceName: "Instagram",
          })
        : Promise.resolve({
            rows: [],
            warning: payload.sources.instagram
              ? "Instagram включен, но профили не найдены. Для быстрого анализа вставьте username или ссылку на профиль вручную."
              : "",
          });

    const [websiteResult, yandexResult, avitoResult, instagramResult] = await Promise.all([
      websiteTask,
      yandexTask,
      avitoTask,
      instagramTask,
    ]);

    const websitePages = websiteResult.rows;
    const supplementalSources = {
      yandexMaps: yandexResult.rows,
      avito: avitoResult.rows,
      instagram: instagramResult.rows,
    };
    warnings.push(...[websiteResult.warning, yandexResult.warning, avitoResult.warning, instagramResult.warning].filter(Boolean));

    const brief = prepareCompetitorBrief({
      competitors,
      websitePages,
      city: payload.city,
      service: payload.service,
      supplementalSources,
    });

    const { report, warning: aiWarning } = await createReport({
      apiKey: config.openRouterApiKey,
      model: config.openRouterModel,
      brief,
    });
    if (aiWarning) warnings.push(aiWarning);

    return Response.json({
      report,
      brief,
      meta: {
        model: config.openRouterModel,
        competitorCount: brief.competitors.length,
        scannedWebsites: crawlerInput.startUrls.length,
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

async function runMapsActor({ actorId, token, payload }) {
  try {
    return {
      rows: await runApifyActorSync({
        actorId,
        token,
        input: buildMapsActorInput(payload),
        timeoutSeconds: MAPS_TIMEOUT_SECONDS,
        requestTimeoutMs: MAPS_REQUEST_TIMEOUT_MS,
      }),
      usedFallback: false,
      warnings: [],
    };
  } catch (error) {
    return {
      rows: buildFallbackMapsRows(payload),
      usedFallback: true,
      warnings: [`Google Maps: ${friendlySourceError(error)} Показана демо-выборка, чтобы отчет не падал.`],
    };
  }
}

async function createReport({ apiKey, model, brief }) {
  try {
    return {
      report: await runOpenRouterAnalysis({
        apiKey,
        model,
        prompt: createAnalysisPrompt(brief),
        appUrl: getAppUrl(),
        requestTimeoutMs: AI_REQUEST_TIMEOUT_MS,
      }),
      warning: "",
    };
  } catch (error) {
    return {
      report: createLocalAnalysisReport(brief),
      warning: `AI-отчет: ${error.message} Показан быстрый локальный отчет.`,
    };
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
      warning: `${sourceName}: ${friendlySourceError(error)}`,
    };
  }
}

function friendlySourceError(error) {
  const message = error.message || "";
  if (/memory limit|exceed the memory/i.test(message)) {
    return "источник временно недоступен из-за лимита Apify.";
  }
  if (/не успел|TIMED-OUT|timeout|timed out/i.test(message)) {
    return "источник не успел ответить в быстрый лимит.";
  }
  if (/402/.test(message)) {
    return "источник временно недоступен из-за лимита аккаунта Apify.";
  }
  return "источник временно недоступен.";
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

import { runApifyActorSync } from "../../../lib/apify.js";
import { validateAnalyzePayload, validateRuntimeConfig } from "../../../lib/analysis-request.js";
import {
  buildAvitoActorInput,
  buildCrawlerInput,
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

    const mapsRows = await runApifyActorSync({
      actorId: config.mapsActorId,
      token: config.apifyToken,
      input: buildMapsActorInput(payload),
      timeoutSeconds: 120,
    });

    const competitors = normalizePlaces(mapsRows).slice(0, payload.limit);

    if (competitors.length === 0) {
      return Response.json(
        {
          error:
            "Apify не вернул подходящих косметологических конкурентов. Попробуйте другой запрос: например, 'косметология', 'контурная пластика губ' или район города.",
        },
        { status: 422 },
      );
    }

    const crawlerInput = buildCrawlerInput(competitors);
    const warnings = [];
    let websitePages = [];

    if (crawlerInput.startUrls.length > 0) {
      try {
        websitePages = await runApifyActorSync({
          actorId: config.crawlerActorId,
          token: config.apifyToken,
          input: crawlerInput,
          timeoutSeconds: 150,
        });
      } catch (error) {
        warnings.push(error.message);
      }
    } else {
      warnings.push("У найденных конкурентов не было сайтов для анализа прайсов.");
    }

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
        timeoutSeconds: 90,
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
        timeoutSeconds: 90,
        sourceName: "Avito",
      });
      supplementalSources.avito = rows;
      if (warning) warnings.push(warning);
    }

    if (payload.sources.instagram) {
      const discoveredInstagramProfiles = extractInstagramUsernames([
        ...payload.instagramProfiles,
        ...websitePages.flatMap((page) => [page.url, page.text, page.markdown, page.content, page.description]),
      ]);

      if (discoveredInstagramProfiles.length > 0) {
        const { rows, warning } = await runOptionalApifyActor({
          actorId: config.instagramActorId,
          token: config.apifyToken,
          input: buildInstagramProfileInput(discoveredInstagramProfiles),
          timeoutSeconds: 90,
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

    const report = await runOpenRouterAnalysis({
      apiKey: config.openRouterApiKey,
      model: config.openRouterModel,
      prompt: createAnalysisPrompt(brief),
      appUrl: getAppUrl(),
    });

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

const MAX_COMPETITORS = 5;
const MAX_WEBSITES = 3;
const MAX_REVIEWS = 1;
const MISSING_PRICE = "цена не найдена";

const BEAUTY_MARKERS = [
  "космет",
  "клиник",
  "дермат",
  "эстет",
  "beauty",
  "clinic",
  "cosmet",
  "aesthetic",
  "medical",
  "laser",
  "spa",
  "салон красоты",
];

const PREPARATION_NAMES = [
  "Juvederm",
  "Ювидерм",
  "Stylage",
  "Стилаж",
  "Belotero",
  "Белотеро",
  "Restylane",
  "Рестилайн",
  "Radiesse",
  "Радиесс",
  "Sculptra",
  "Скульптра",
  "Profhilo",
  "Профайло",
  "Novacutan",
  "Новакутан",
  "Revi",
  "Реви",
  "Meso-Wharton",
  "Мезовартон",
  "Botox",
  "Ботокс",
  "Dysport",
  "Диспорт",
  "Xeomin",
  "Ксеомин",
  "AestheFill",
  "Аэстефилл",
  "Neuramis",
  "Нейрамис",
  "Princess",
  "Принцесс",
  "Teosyal",
  "Теосиаль",
];

export function clampCompetitorLimit(value) {
  const parsed = Number.parseInt(value, 10);
  if (Number.isNaN(parsed)) return MAX_COMPETITORS;
  return Math.min(Math.max(parsed, 1), MAX_COMPETITORS);
}

export function buildMapsActorInput({ city, service, limit }) {
  const safeLimit = clampCompetitorLimit(limit);
  return {
    searchStringsArray: [`${cleanText(service)} косметология`],
    locationQuery: cleanText(city),
    maxCrawledPlacesPerSearch: safeLimit,
    language: "ru",
    skipClosedPlaces: true,
    scrapePlaceDetailPage: false,
    website: "allPlaces",
  };
}

export function buildFallbackMapsRows({ city, service, limit }) {
  const safeLimit = clampCompetitorLimit(limit);
  const safeCity = cleanText(city);
  const safeService = cleanText(service);

  return [
    {
      title: "Lumiere Clinic",
      categoryName: "Косметология",
      address: `Петроградская сторона, ${safeCity}`,
      website: "https://example.com/lumiere",
      phone: "+7 812 000-00-01",
      totalScore: 4.8,
      reviewsCount: 186,
      description: `${safeService} косметология клиника эстетическая медицина`,
    },
    {
      title: "Asteria Beauty Lab",
      categoryName: "Косметологическая клиника",
      address: `Центральный район, ${safeCity}`,
      website: "https://example.com/asteria",
      phone: "+7 812 000-00-02",
      totalScore: 4.6,
      reviewsCount: 142,
      description: `${safeService} косметология clinic beauty`,
    },
    {
      title: "Forma Skin Atelier",
      categoryName: "Эстетическая косметология",
      address: `Московский проспект, ${safeCity}`,
      website: "https://example.com/forma",
      phone: "+7 812 000-00-03",
      totalScore: 4.9,
      reviewsCount: 94,
      description: `${safeService} косметология aesthetic clinic`,
    },
    {
      title: "Clevermed",
      categoryName: "Клиника косметологии",
      address: `Невский район, ${safeCity}`,
      website: "https://example.com/clevermed",
      phone: "+7 812 000-00-04",
      totalScore: 4.7,
      reviewsCount: 121,
      description: `${safeService} косметология дерматология`,
    },
    {
      title: "Beauty Room",
      categoryName: "Салон красоты",
      address: `Василеостровский район, ${safeCity}`,
      website: "https://example.com/beauty-room",
      phone: "+7 812 000-00-05",
      totalScore: 4.5,
      reviewsCount: 78,
      description: `${safeService} косметология салон красоты`,
    },
  ].slice(0, safeLimit);
}

export function buildCrawlerInput(competitors) {
  const startUrls = unique(
    competitors
      .map((competitor) => normalizeUrl(competitor.website))
      .filter(Boolean)
      .slice(0, MAX_WEBSITES),
  ).map((url) => ({ url }));

  return {
    startUrls,
    crawlerType: "playwright:adaptive",
    maxCrawlDepth: 1,
    maxCrawlPages: Math.max(startUrls.length * 2, 1),
    useSitemaps: false,
    useLlmsTxt: false,
    respectRobotsTxtFile: true,
    proxyConfiguration: { useApifyProxy: true },
    initialCookies: [],
    customHttpHeaders: {},
    blockMedia: true,
    removeCookieWarnings: true,
    clickElementsCssSelector: '[aria-expanded="false"], button, .accordion, .tabs button',
    removeElementsCssSelector:
      'nav, footer, script, style, noscript, svg, img[src^="data:"], [role="banner"], [role="dialog"], [aria-modal="true"]',
  };
}

export function buildYandexMapsActorInput({ city, service, limit }) {
  return {
    searchQueries: [`${cleanText(service)} косметология ${cleanText(city)}`],
    maxLeads: clampCompetitorLimit(limit),
    lang: "ru_RU",
    proxyConfiguration: { useApifyProxy: true },
  };
}

export function buildAvitoActorInput({ city, service }) {
  return {
    searchQuery: `${cleanText(service)} косметология ${cleanText(city)}`,
    maxPages: 1,
  };
}

export function buildInstagramProfileInput(usernames) {
  return {
    usernames: unique(usernames.map(normalizeInstagramUsername).filter(Boolean)).slice(0, 10),
  };
}

export function normalizePlaces(rows) {
  const seen = new Set();

  return rows
    .filter((row) => row && !row.permanentlyClosed && !row.temporarilyClosed)
    .map((row) => {
      const categories = asArray(row.categories).filter(Boolean);
      const category = cleanText(row.categoryName || row.category || categories[0] || "");
      const name = cleanText(row.title || row.name || row.placeName || "");
      const address = cleanText(row.address || row.streetAddress || row.formattedAddress || "");
      const markerText = [name, category, categories.join(" "), row.description].join(" ").toLowerCase();

      return {
        id: cleanText(row.placeId || row.id || row.cid || `${name}-${address}`),
        name,
        category,
        categories,
        address,
        website: normalizeUrl(row.website || row.websiteUri || row.websiteUrl || row.domain),
        phone: cleanText(row.phone || row.phoneNumber || row.nationalPhoneNumber || row.phoneUnformatted || ""),
        rating: normalizeNumber(row.totalScore ?? row.rating ?? row.score),
        reviewCount: normalizeInteger(row.reviewsCount ?? row.userRatingsTotal ?? row.reviewCount),
        price: cleanText(row.price || row.priceBracket || ""),
        googleMapsUrl: cleanText(row.googleMapsUri || row.googleMapsUrl || row.url || row.searchPageUrl || ""),
        location: row.location || null,
        reviews: normalizeReviews(row.reviews),
        rawCategoryText: markerText,
      };
    })
    .filter((place) => place.name && looksLikeBeautyPlace(place.rawCategoryText))
    .filter((place) => {
      const key = `${place.id || place.name}-${place.address}`.toLowerCase();
      if (seen.has(key)) return false;
      seen.add(key);
      return true;
    })
    .map(({ rawCategoryText, ...place }) => place);
}

export function normalizeYandexPlaces(rows) {
  return rows
    .map((row) => ({
      name: cleanText(row.name || row.title || row.companyName || row.businessName || ""),
      address: cleanText(row.address || row.fullAddress || row.formattedAddress || ""),
      phone: cleanText(row.phone || row.phoneNumber || row.contacts?.phone || ""),
      website: normalizeUrl(row.website || row.site || row.url || row.link),
      rating: normalizeNumber(row.rating || row.score || row.ratingValue),
      reviewCount: normalizeInteger(row.reviewsCount || row.reviewCount || row.reviews?.length),
      url: cleanText(row.url || row.yandexMapsUrl || row.link || ""),
    }))
    .filter((place) => place.name)
    .slice(0, MAX_COMPETITORS);
}

export function normalizeAvitoListings(rows) {
  return rows
    .map((row) => ({
      title: cleanText(row.title || row.name || row.itemTitle || ""),
      price: cleanText(row.price || row.priceText || row.cost || ""),
      url: cleanText(row.url || row.link || row.itemUrl || ""),
      location: cleanText(row.location || row.address || row.city || ""),
      sellerName: cleanText(row.sellerName || row.seller || row.userName || ""),
      description: cleanText(row.description || row.text || row.snippet || ""),
    }))
    .filter((listing) => listing.title)
    .slice(0, MAX_COMPETITORS);
}

export function normalizeInstagramProfiles(rows) {
  return rows
    .map((row) => {
      const username = normalizeInstagramUsername(row.username || row.ownerUsername || row.input || row.id || "");
      return {
        username,
        fullName: cleanText(row.fullName || row.name || row.ownerFullName || ""),
        followersCount: normalizeIntegerOrNull(row.followersCount || row.followers || row.followedByCount),
        followsCount: normalizeIntegerOrNull(row.followsCount || row.followingCount || row.following),
        postsCount: normalizeIntegerOrNull(row.postsCount || row.mediaCount || row.latestPostsCount),
        isVerified: Boolean(row.verified || row.isVerified),
        url: cleanText(row.url || row.profileUrl || (username ? `https://www.instagram.com/${username}/` : "")),
        biography: cleanText(row.biography || row.bio || row.description || ""),
        externalUrl: cleanText(row.externalUrl || row.website || row.external_url || ""),
      };
    })
    .filter((profile) => profile.username)
    .slice(0, 10);
}

export function extractInstagramUsernames(values) {
  const usernames = [];

  for (const value of values) {
    const text = cleanText(value);
    if (!text) continue;

    for (const match of text.matchAll(/(?:https?:\/\/)?(?:www\.)?instagram\.com\/([a-zA-Z0-9._]{2,30})\/?/g)) {
      const username = normalizeInstagramUsername(match[1]);
      if (username) usernames.push(username);
    }

    for (const match of text.matchAll(/(^|\s)@([a-zA-Z0-9._]{2,30})/g)) {
      const username = normalizeInstagramUsername(match[2]);
      if (username) usernames.push(username);
    }

    if (/^[a-zA-Z0-9._]{2,30}$/.test(text)) {
      const username = normalizeInstagramUsername(text);
      if (username) usernames.push(username);
    }
  }

  return unique(usernames).slice(0, 10);
}

export function extractCommercialSignals(text) {
  const chunks = splitEvidenceChunks(text);
  const prices = [];
  const promotions = [];
  const packages = [];

  for (const chunk of chunks) {
    if (hasPrice(chunk)) prices.push(chunk);
    if (/(акци|скидк|бесплат|подар|рассроч|спецпредлож|до конца|выгод)/i.test(chunk)) {
      promotions.push(chunk);
    }
    if (/(комплекс|пакет|курс|зон[аы]|[-+]\s*|пара процедур)/i.test(chunk) && hasPrice(chunk)) {
      packages.push(chunk);
    }
  }

  return {
    prices: unique(prices).slice(0, 8),
    promotions: unique(promotions).slice(0, 6),
    packages: unique(packages).slice(0, 6),
    preparations: extractPreparations(text),
  };
}

export function prepareCompetitorBrief({
  competitors,
  websitePages,
  city,
  service,
  collectedAt = new Date().toISOString(),
  supplementalSources = {},
}) {
  const pages = websitePages.map(normalizeWebsitePage).filter((page) => page.url || page.text);

  return {
    search: {
      city: cleanText(city),
      service: cleanText(service),
      collectedAt,
      limits: {
        competitors: MAX_COMPETITORS,
        websites: MAX_WEBSITES,
        reviewsPerCompetitor: MAX_REVIEWS,
      },
    },
    competitors: competitors.map((competitor) => {
      const matchedPages = pages.filter((page) => sameHostname(page.url, competitor.website));
      const combinedText = matchedPages.map((page) => page.text).join("\n\n");
      const commercialSignals = extractCommercialSignals(combinedText);
      const hasPriceEvidence = commercialSignals.prices.length > 0;

      return {
        name: competitor.name,
        category: competitor.category,
        address: competitor.address,
        website: competitor.website,
        phone: competitor.phone,
        rating: competitor.rating,
        reviewCount: competitor.reviewCount,
        googleMapsUrl: competitor.googleMapsUrl,
        reviews: competitor.reviews.slice(0, MAX_REVIEWS),
        sourcePages: matchedPages.map((page) => page.url).filter(Boolean).slice(0, 5),
        commercialSignals: {
          prices: hasPriceEvidence ? commercialSignals.prices : [MISSING_PRICE],
          promotions: commercialSignals.promotions,
          packages: commercialSignals.packages,
          preparations: commercialSignals.preparations,
        },
      };
    }),
    supplementalSources: {
      yandexMaps: normalizeYandexPlaces(supplementalSources.yandexMaps || []),
      avito: normalizeAvitoListings(supplementalSources.avito || []),
      instagram: normalizeInstagramProfiles(supplementalSources.instagram || []),
    },
  };
}

export function createAnalysisPrompt(brief) {
  return `
Ты аналитик локального рынка косметологии. Проанализируй данные по конкурентам и подготовь отчет на русском языке для практикующего специалиста.

Строгие правила:
- Не выдумывай цены, препараты, акции, рейтинги или адреса.
- Если цена не найдена, прямо напиши "цена не найдена".
- Отделяй факты из источников от своих выводов.
- Не давай медицинских рекомендаций пациентам; фокус только на рынке, офферах и позиционировании.

Нужно вернуть структурированный отчет Markdown с разделами:
1. Карта рынка
2. Цены и пакеты
3. Акции и входные офферы
4. Препараты и услуги
5. Позиционирование конкурентов
6. Instagram: активность и позиционирование
7. Avito: частные предложения и ценовые сигналы
8. Что можно применить в моей работе
9. Риски качества данных

Данные:
${JSON.stringify(brief, null, 2)}
`.trim();
}

export function createLocalAnalysisReport(brief) {
  const competitors = brief.competitors || [];
  const prices = unique(competitors.flatMap((competitor) => competitor.commercialSignals?.prices || [])).slice(0, 10);
  const promotions = unique(competitors.flatMap((competitor) => competitor.commercialSignals?.promotions || [])).slice(0, 10);
  const preparations = unique(competitors.flatMap((competitor) => competitor.commercialSignals?.preparations || [])).slice(0, 12);
  const collectedAt = brief.search?.collectedAt ? new Date(brief.search.collectedAt).toLocaleDateString("ru-RU") : "сегодня";

  return `
# Быстрый отчет по рынку: ${formatReportCell(brief.search?.service)} — ${formatReportCell(brief.search?.city)}

**Дата сбора данных:** ${collectedAt}  
**Выборка:** ${competitors.length} конкурентов, до ${brief.limits?.websites ?? MAX_WEBSITES} сайтов, до ${brief.limits?.reviewsPerCompetitor ?? MAX_REVIEWS} отзыва на конкурента.

## 1. Карта рынка

${competitors.length ? competitorTable(competitors) : "Подходящие конкуренты не найдены."}

## 2. Цены и пакеты

${signalList(prices, "Цена не найдена в быстрых источниках.")}

## 3. Акции и входные офферы

${signalList(promotions, "Акции не найдены в быстрых источниках.")}

## 4. Препараты и услуги

${signalList(preparations, "Названия препаратов не найдены в быстрых источниках.")}

## 5. Что можно применить в работе

- Проверить, у каких конкурентов цена видна сразу, а где клиенту нужно писать в личные сообщения.
- Вынести на первый экран услуги стартовую цену, препарат и понятный формат консультации.
- Собрать отдельный блок доверия: рейтинг, адрес, опыт врача, фото кабинета и понятные ограничения акции.

## 6. Риски качества данных

- Отчет собран в быстром режиме, потому что внешний AI-ответ или часть источников не успели ответить.
- Не найденные цены помечены как "цена не найдена"; они не заменяются предположениями.
- Для более полного отчета можно повторить запуск позже или временно отключить медленные источники.
`.trim();
}

function competitorTable(competitors) {
  const rows = competitors.map((competitor, index) =>
    [
      index + 1,
      formatReportCell(competitor.name),
      formatReportCell(competitor.category),
      formatReportCell(competitor.address),
      competitor.rating ? String(competitor.rating) : "нет данных",
      formatReportCell(competitor.commercialSignals?.prices?.[0]),
    ].join(" | "),
  );

  return ["| # | Конкурент | Категория | Адрес | Рейтинг | Цена |", "|---|---|---|---|---|---|", ...rows.map((row) => `| ${row} |`)].join("\n");
}

function signalList(items, emptyText) {
  const visibleItems = items.filter((item) => item && item !== MISSING_PRICE);
  if (visibleItems.length === 0) return emptyText;
  return visibleItems.map((item) => `- ${formatReportCell(item)}`).join("\n");
}

function formatReportCell(value) {
  return cleanText(value || "нет данных").replaceAll("|", "/");
}

function normalizeWebsitePage(page) {
  return {
    url: cleanText(page.url || page.loadedUrl || page.requestUrl || page.sourceUrl || ""),
    title: cleanText(page.title || page.metadata?.title || ""),
    text: cleanText(page.text || page.markdown || page.content || page.htmlToText || page.description || ""),
  };
}

function normalizeReviews(reviews) {
  return asArray(reviews)
    .map((review) => ({
      text: cleanText(review.text || review.reviewText || review.comment || review.snippet || ""),
      rating: normalizeNumber(review.rating || review.stars),
      publishedAt: cleanText(review.publishedAtDate || review.publishedAt || review.date || ""),
    }))
    .filter((review) => review.text)
    .slice(0, MAX_REVIEWS);
}

function splitEvidenceChunks(text) {
  return cleanText(text)
    .split(/[\n.;!?]+/g)
    .map((chunk) => chunk.replace(/\s+/g, " ").trim())
    .filter((chunk) => chunk.length > 8 && chunk.length < 220);
}

function extractPreparations(text) {
  const found = [];
  for (const preparation of PREPARATION_NAMES) {
    const expression = new RegExp(`(^|[^a-zа-яё])${escapeRegExp(preparation)}([^a-zа-яё]|$)`, "i");
    if (expression.test(text)) found.push(preparation);
  }
  return unique(found).slice(0, 12);
}

function hasPrice(chunk) {
  return /(?:от\s*)?\d[\d\s.,]{1,9}\s*(?:₽|руб\.?|р\.|rub)/i.test(chunk);
}

function looksLikeBeautyPlace(text) {
  return BEAUTY_MARKERS.some((marker) => text.includes(marker));
}

function normalizeUrl(value) {
  const raw = cleanText(value);
  if (!raw) return "";
  try {
    const url = new URL(raw.startsWith("http") ? raw : `https://${raw}`);
    url.hash = "";
    return url.toString().replace(/\/$/, "");
  } catch {
    return "";
  }
}

function sameHostname(left, right) {
  if (!left || !right) return false;
  try {
    const leftHost = new URL(left).hostname.replace(/^www\./, "");
    const rightHost = new URL(right).hostname.replace(/^www\./, "");
    return leftHost === rightHost || leftHost.endsWith(`.${rightHost}`) || rightHost.endsWith(`.${leftHost}`);
  } catch {
    return false;
  }
}

function cleanText(value) {
  return String(value ?? "").replace(/\s+/g, " ").trim();
}

function asArray(value) {
  return Array.isArray(value) ? value : [];
}

function normalizeNumber(value) {
  const number = Number(value);
  return Number.isFinite(number) ? number : null;
}

function normalizeInteger(value) {
  const number = Number.parseInt(value, 10);
  return Number.isFinite(number) ? number : 0;
}

function normalizeIntegerOrNull(value) {
  const number = Number.parseInt(value, 10);
  return Number.isFinite(number) ? number : null;
}

function normalizeInstagramUsername(value) {
  const raw = cleanText(value)
    .replace(/^@/, "")
    .replace(/^https?:\/\/(?:www\.)?instagram\.com\//i, "")
    .split(/[/?#]/)[0]
    .trim();

  if (!raw || ["p", "reel", "reels", "stories", "explore", "accounts", "direct"].includes(raw.toLowerCase())) {
    return "";
  }

  return /^[a-zA-Z0-9._]{2,30}$/.test(raw) ? raw : "";
}

function unique(values) {
  return [...new Set(values.filter(Boolean))];
}

function escapeRegExp(value) {
  return value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

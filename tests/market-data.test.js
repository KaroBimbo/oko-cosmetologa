import test from "node:test";
import assert from "node:assert/strict";

import {
  buildAvitoActorInput,
  buildFallbackMapsRows,
  buildMapsActorInput,
  buildCrawlerInput,
  buildInstagramProfileInput,
  buildYandexMapsActorInput,
  buildTwoGisActorInput,
  buildVkActorInput,
  buildWordstatActorInput,
  clampCompetitorLimit,
  createAnalysisPrompt,
  createLocalAnalysisReport,
  extractCommercialSignals,
  extractInstagramUsernames,
  normalizeAvitoListings,
  normalizeDirectoryRows,
  normalizeInstagramProfiles,
  normalizePlaces,
  normalizeSocialRows,
  normalizeWordstatRows,
  normalizeYandexPlaces,
  prepareCompetitorBrief,
} from "../lib/market-data.js";

test("clamps competitor limit to the safe homework range", () => {
  assert.equal(clampCompetitorLimit(0), 1);
  assert.equal(clampCompetitorLimit(5), 5);
  assert.equal(clampCompetitorLimit("31"), 5);
  assert.equal(clampCompetitorLimit(undefined), 5);
});

test("builds a bounded Apify Google Maps input for local cosmetic research", () => {
  assert.deepEqual(
    buildMapsActorInput({
      city: "Санкт-Петербург",
      service: "контурная пластика",
      limit: 12,
    }),
    {
      searchStringsArray: ["контурная пластика цена косметология"],
      locationQuery: "Санкт-Петербург",
      maxCrawledPlacesPerSearch: 5,
      language: "ru",
      skipClosedPlaces: true,
      scrapePlaceDetailPage: false,
      website: "allPlaces",
    },
  );
});

test("builds fallback Google Maps rows that still look like beauty competitors", () => {
  const rows = buildFallbackMapsRows({
    city: "Санкт-Петербург",
    service: "контурная пластика",
    limit: 12,
  });

  assert.equal(rows.length, 5);
  assert.equal(normalizePlaces(rows).length, 5);
  assert.match(rows[0].address, /Санкт-Петербург/);
});

test("normalizes Apify place rows without leaking irrelevant or closed places", () => {
  const places = normalizePlaces([
    {
      title: "Клиника Линия",
      categoryName: "Косметология",
      address: "Невский проспект, 10",
      website: "https://clinic.example",
      phone: "+7 812 111-22-33",
      totalScore: 4.7,
      reviewsCount: 81,
      reviews: [{ text: "Очень аккуратная контурная пластика губ" }],
      googleMapsUrl: "https://maps.example/a",
    },
    {
      title: "Салон закрыт",
      categoryName: "Салон красоты",
      permanentlyClosed: true,
    },
    {
      title: "Автомойка",
      categoryName: "Car wash",
      address: "Somewhere",
    },
  ]);

  assert.equal(places.length, 1);
  assert.equal(places[0].name, "Клиника Линия");
  assert.equal(places[0].rating, 4.7);
  assert.equal(places[0].reviewCount, 81);
  assert.equal(places[0].reviews[0].text, "Очень аккуратная контурная пластика губ");
});

test("extracts price, promotion, package, and preparation evidence from website text", () => {
  const signals = extractCommercialSignals(`
    Контурная пластика губ Juvederm Ultra Smile 1 мл — 18 900 ₽.
    Биоревитализация Neauvia Hydro Deluxe 2,5ml — 16 000 ₽.
    Акция до конца месяца: консультация бесплатно при записи на процедуру.
    Комплекс: скулы + подбородок от 39 000 руб. Используем Stylage и Belotero.
  `);

  assert.deepEqual(signals.prices, [
    "Контурная пластика губ Juvederm Ultra Smile 1 мл — 18 900 ₽",
    "Биоревитализация Neauvia Hydro Deluxe 2,5ml — 16 000 ₽",
    "Комплекс: скулы + подбородок от 39 000 руб",
  ]);
  assert.deepEqual(signals.promotions, [
    "Акция до конца месяца: консультация бесплатно при записи на процедуру",
  ]);
  assert.deepEqual(signals.packages, [
    "Комплекс: скулы + подбородок от 39 000 руб",
  ]);
  assert.deepEqual(signals.preparations, ["Juvederm", "Stylage", "Belotero", "Neauvia Hydro Deluxe"]);
});

test("prepares a compact competitor brief with explicit missing-price markers", () => {
  const competitors = [
    {
      name: "Клиника Линия",
      address: "Невский проспект, 10",
      website: "https://clinic.example",
      rating: 4.7,
      reviewCount: 81,
      reviews: [{ text: "Хвалят врача и понятные цены" }],
    },
    {
      name: "Косметология Север",
      website: "",
      rating: null,
      reviewCount: 0,
      reviews: [],
    },
  ];

  const websitePages = [
    {
      url: "https://clinic.example/price",
      text: "Контурная пластика препаратом Juvederm от 21 500 ₽. Скидка 15% на вторую зону.",
    },
  ];

  const brief = prepareCompetitorBrief({ competitors, websitePages, city: "Санкт-Петербург", service: "контурная пластика" });

  assert.equal(brief.competitors.length, 2);
  assert.equal(brief.competitors[0].commercialSignals.prices[0], "Контурная пластика препаратом Juvederm от 21 500 ₽");
  assert.equal(brief.competitors[1].commercialSignals.prices[0], "цена не найдена");
  assert.equal(brief.search.city, "Санкт-Петербург");
});

test("creates an LLM prompt that forbids invented prices", () => {
  const prompt = createAnalysisPrompt({
    search: { city: "Санкт-Петербург", service: "контурная пластика", collectedAt: "2026-05-31T20:00:00.000Z" },
    competitors: [
      {
        name: "Клиника Линия",
        rating: 4.7,
        reviewCount: 81,
        commercialSignals: { prices: ["19 900 ₽"], promotions: [], packages: [], preparations: ["Juvederm"] },
      },
    ],
  });

  assert.match(prompt, /не выдумывай цены/i);
  assert.match(prompt, /контурная пластика/);
  assert.match(prompt, /Клиника Линия/);
});

test("creates a local fallback report without inventing missing prices", () => {
  const report = createLocalAnalysisReport({
    search: { city: "Санкт-Петербург", service: "контурная пластика", collectedAt: "2026-06-02T20:00:00.000Z" },
    limits: { competitors: 5, websites: 3, reviewsPerCompetitor: 1 },
    competitors: [
      {
        name: "Клиника Линия",
        category: "Косметология",
        address: "Невский проспект, 10",
        rating: 4.7,
        commercialSignals: { prices: ["цена не найдена"], promotions: [], preparations: [] },
      },
    ],
  });

  assert.match(report, /Быстрый отчет/);
  assert.match(report, /Клиника Линия/);
  assert.match(report, /Цена не найдена/);
});

test("builds bounded crawler input for competitor websites only", () => {
  const input = buildCrawlerInput([
    { website: "https://clinic-one.example" },
    { website: "" },
    { website: "https://clinic-two.example" },
  ]);

  assert.deepEqual(input.startUrls, [
    { url: "https://clinic-one.example" },
    { url: "https://clinic-two.example" },
  ]);
  assert.equal(input.maxCrawlPages, 8);
  assert.equal(input.maxCrawlDepth, 2);
  assert.equal(input.crawlerType, "playwright:adaptive");
});

test("builds Yandex Maps actor input with the same city and service intent", () => {
  assert.deepEqual(
    buildYandexMapsActorInput({
      city: "Санкт-Петербург",
      service: "контурная пластика",
      limit: 14,
    }),
    {
      searchQueries: ["контурная пластика косметология Санкт-Петербург"],
      maxLeads: 5,
      lang: "ru_RU",
      proxyConfiguration: { useApifyProxy: true },
    },
  );
});

test("builds Avito actor input with a small bounded scrape", () => {
  assert.deepEqual(
    buildAvitoActorInput({
      city: "Санкт-Петербург",
      service: "контурная пластика",
    }),
    {
      searchQuery: "контурная пластика косметология Санкт-Петербург",
      maxPages: 1,
    },
  );
});

test("extracts Instagram usernames from profile links and ignores post URLs", () => {
  const usernames = extractInstagramUsernames([
    "Наш профиль https://www.instagram.com/clinic_linia/",
    "Пост https://instagram.com/p/CODE123/",
    "@doctor.skin.spb",
  ]);

  assert.deepEqual(usernames, ["clinic_linia", "doctor.skin.spb"]);
});

test("builds Instagram profile actor input from unique usernames", () => {
  assert.deepEqual(buildInstagramProfileInput([" clinic_linia ", "@clinic_linia", "doctor.skin.spb"]), {
    usernames: ["clinic_linia", "doctor.skin.spb"],
  });
});

test("builds optional Russian market source inputs", () => {
  assert.deepEqual(
    buildTwoGisActorInput({ city: "Санкт-Петербург", service: "контурная пластика", limit: 9 }),
    {
      query: "контурная пластика косметология Санкт-Петербург",
      searchQuery: "контурная пластика косметология Санкт-Петербург",
      searchQueries: ["контурная пластика косметология Санкт-Петербург"],
      city: "Санкт-Петербург",
      service: "контурная пластика",
      source: "2gis",
      maxItems: 5,
      proxyConfiguration: { useApifyProxy: true },
    },
  );

  assert.equal(buildVkActorInput({ city: "СПб", service: "ботокс", limit: 2 }).query, "ботокс косметология СПб");
  assert.deepEqual(buildWordstatActorInput({ city: "СПб", service: "ботокс", limit: 2 }).phrases, [
    "ботокс СПб",
    "ботокс цена",
    "ботокс косметолог",
  ]);
});

test("normalizes supplemental Yandex, Avito, and Instagram rows", () => {
  assert.deepEqual(normalizeYandexPlaces([{ name: "Клиника Север", address: "Петроградская", phone: "+7", rating: 4.6 }]), [
    {
      name: "Клиника Север",
      address: "Петроградская",
      phone: "+7",
      website: "",
      rating: 4.6,
      reviewCount: 0,
      url: "",
    },
  ]);

  assert.deepEqual(normalizeAvitoListings([{ title: "Контурная пластика губ", price: "12 000 ₽", url: "https://avito.ru/a" }]), [
    {
      title: "Контурная пластика губ",
      price: "12 000 ₽",
      url: "https://avito.ru/a",
      location: "",
      sellerName: "",
      description: "",
    },
  ]);

  assert.deepEqual(
    normalizeInstagramProfiles([
      { username: "clinic_linia", fullName: "Клиника Линия", followersCount: 4300, biography: "Контурная пластика" },
    ]),
    [
      {
        username: "clinic_linia",
        fullName: "Клиника Линия",
        followersCount: 4300,
        followsCount: null,
        postsCount: null,
        isVerified: false,
        url: "https://www.instagram.com/clinic_linia/",
        biography: "Контурная пластика",
        externalUrl: "",
      },
    ],
  );
});

test("normalizes Russian directories, social sources, and demand rows", () => {
  assert.deepEqual(normalizeDirectoryRows([{ title: "Клиника СПБ", minPrice: "от 18 000 ₽", reviewsCount: 42 }]), [
    {
      name: "Клиника СПБ",
      address: "",
      phone: "",
      website: "",
      rating: null,
      reviewCount: 42,
      price: "от 18 000 ₽",
      category: "",
      url: "",
      snippet: "",
    },
  ]);

  assert.deepEqual(normalizeSocialRows([{ groupName: "Косметология СПб", text: "Акция на вторую зону", membersCount: 2100 }]), [
    {
      title: "Косметология СПб",
      handle: "",
      url: "",
      text: "Акция на вторую зону",
      subscribersCount: 2100,
      viewsCount: null,
      publishedAt: "",
    },
  ]);

  assert.deepEqual(normalizeWordstatRows([{ phrase: "ботокс цена спб", impressions: 980 }]), [
    {
      phrase: "ботокс цена спб",
      impressions: 980,
      region: "",
    },
  ]);
});

test("adds supplemental sources to the competitor brief for LLM analysis", () => {
  const brief = prepareCompetitorBrief({
    competitors: [],
    websitePages: [],
    city: "Санкт-Петербург",
    service: "контурная пластика",
    supplementalSources: {
      yandexMaps: [{ name: "Клиника Север", address: "Петроградская" }],
      twoGis: [{ name: "Клиника 2ГИС", price: "от 19 000 ₽" }],
      avito: [{ title: "Контурная пластика", price: "12 000 ₽" }],
      instagram: [{ username: "clinic_linia", followersCount: 4300 }],
      prodoctorov: [{ name: "Клиника врачей", rating: 4.8 }],
      vk: [{ groupName: "Косметология СПб", membersCount: 2100 }],
      wordstat: [{ phrase: "контурная пластика спб", impressions: 1240 }],
    },
  });

  assert.equal(brief.supplementalSources.yandexMaps[0].name, "Клиника Север");
  assert.equal(brief.supplementalSources.twoGis[0].price, "от 19 000 ₽");
  assert.equal(brief.supplementalSources.avito[0].price, "12 000 ₽");
  assert.equal(brief.supplementalSources.instagram[0].username, "clinic_linia");
  assert.equal(brief.supplementalSources.prodoctorov[0].rating, 4.8);
  assert.equal(brief.supplementalSources.vk[0].subscribersCount, 2100);
  assert.equal(brief.supplementalSources.wordstat[0].impressions, 1240);
});

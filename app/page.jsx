"use client";

import { useMemo, useState } from "react";
import { Activity, BadgeCheck, DatabaseZap, Download, Loader2, Moon, Plus, Star, UserRound } from "lucide-react";
import { motion } from "framer-motion";

import MagicEyeAccent from "@/components/MagicEyeAccent";
import VantaTopologyBackground from "@/components/VantaTopologyBackground";

const DEFAULT_CITY = "Санкт-Петербург";
const DEFAULT_SERVICE = "контурная пластика";
const BRAND_LOGO_URL = "/assets/oko-cosmetologa-mark.png";
const BUILD_LABEL = "FAST API FIX";

const SOURCE_OPTIONS = [
  { id: "yandex", label: "Яндекс Карты", detail: "локальные карточки" },
  { id: "avito", label: "Avito", detail: "частные офферы" },
  { id: "instagram", label: "Instagram", detail: "профили клиник" },
];

const mockCompetitors = [
  {
    name: "Lumiere Clinic",
    address: "Петроградская сторона",
    rating: 4.8,
    reviewCount: 186,
    price: "Контурная пластика губ от 18 900 ₽",
    commercialSignals: {
      prices: ["Контурная пластика губ от 18 900 ₽"],
      preparations: ["Juvederm", "Belotero"],
      promotions: ["Скидка 12% на вторую зону"],
    },
  },
  {
    name: "Asteria Beauty Lab",
    address: "Центральный район",
    rating: 4.6,
    reviewCount: 142,
    price: "Препарат Stylage от 16 500 ₽",
    commercialSignals: {
      prices: ["Препарат Stylage от 16 500 ₽"],
      preparations: ["Stylage", "Radiesse"],
      promotions: ["Консультация бесплатно при записи"],
    },
  },
  {
    name: "Forma Skin Atelier",
    address: "Московский проспект",
    rating: 4.9,
    reviewCount: 94,
    price: "Контурная пластика от 21 000 ₽",
    commercialSignals: {
      prices: ["Контурная пластика от 21 000 ₽"],
      preparations: ["Restylane"],
      promotions: [],
    },
  },
];

const mockReport = `
### Карта рынка
В демо-режиме видно, как будет выглядеть отчет после подключения источников. Основная конкуренция строится вокруг доверия, понятного прайса и доказуемого опыта.

### Цены и препараты
- В примере встречаются Juvederm, Belotero, Stylage, Radiesse и Restylane.
- Удобно сравнивать цену за процедуру, цену за зону и комплексные предложения.

### Что можно применить в работе
- Выносить препараты и стартовую цену в первый экран услуги.
- Отдельно показывать акции и бесплатную консультацию.
`;

const mockSources = {
  yandexMaps: [
    { name: "Lumiere Clinic", address: "Петроградская сторона", rating: 4.8 },
    { name: "Asteria Beauty Lab", address: "Центральный район", rating: 4.6 },
  ],
  avito: [
    { title: "Контурная пластика губ", price: "от 12 000 ₽", location: "СПб" },
    { title: "Коррекция подбородка", price: "от 15 500 ₽", location: "СПб" },
  ],
  instagram: [
    { username: "lumiere.clinic", followersCount: 8200 },
    { username: "asteria.skin", followersCount: 5400 },
  ],
};

const tapMotion = { scale: 0.975 };

export default function Home() {
  const [city, setCity] = useState(DEFAULT_CITY);
  const [service, setService] = useState(DEFAULT_SERVICE);
  const [limit, setLimit] = useState(3);
  const [instagramProfiles, setInstagramProfiles] = useState("");
  const [sources, setSources] = useState({ yandex: false, avito: false, instagram: false });
  const [state, setState] = useState("idle");
  const [error, setError] = useState("");
  const [result, setResult] = useState(null);
  const [activeTab, setActiveTab] = useState("results");
  const [isSoftMode, setIsSoftMode] = useState(false);

  const competitors = result?.brief?.competitors?.length ? result.brief.competitors : mockCompetitors;
  const displaySources = result?.brief?.supplementalSources || mockSources;
  const meta = result?.meta || {
    competitorCount: competitors.length,
    scannedWebsites: result ? 0 : 10,
    yandexCount: result ? 0 : 2,
    avitoCount: result ? 0 : 2,
    instagramCount: result ? 0 : 2,
    warnings: [],
  };
  const reportBlocks = useMemo(() => parseReport(result?.report || mockReport), [result]);
  const priceItems = useMemo(() => collectPriceInsights(competitors), [competitors]);
  const enabledSourceCount = Object.values(sources).filter(Boolean).length;

  async function submitAnalysis(event) {
    event.preventDefault();
    setState("loading");
    setError("");
    setResult(null);

    try {
      const response = await fetch("/api/analyze", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          city: city.trim(),
          service: service.trim(),
          limit: Number(limit) || 3,
          instagramProfiles: sources.instagram ? instagramProfiles : "",
          sources,
        }),
      });
      const payload = await response.json();

      if (!response.ok) {
        throw new Error(payload.error || "Не удалось подготовить отчет.");
      }

      setResult(payload);
      setState("ready");
      setActiveTab("results");
    } catch (requestError) {
      setError(requestError.message);
      setState("error");
    }
  }

  function startNewAnalysis() {
    setResult(null);
    setError("");
    setState("idle");
    setActiveTab("results");
  }

  function downloadReport() {
    const report = result?.report || mockReport;
    const blob = new Blob([report], { type: "text/markdown;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = `oko-kosmetologa-${Date.now()}.md`;
    link.click();
    URL.revokeObjectURL(url);
  }

  return (
    <main className={isSoftMode ? "app-shell soft-mode" : "app-shell"}>
      <VantaTopologyBackground backgroundColor={0xf7d7df} className="page-vanta-background" color={0x9a5be6} />
      <aside className="sidebar" aria-label="Главная навигация">
        <div>
          <div className="brand-mark">
            <div className="brand-gem"><img alt="" src={BRAND_LOGO_URL} /></div>
            <div><strong>ОКО</strong><span>КОСМЕТОЛОГА</span></div>
          </div>
          <div className="brand-manifest">
            <span>BEAUTY INTELLIGENCE</span>
            <p>Аналитика цен, офферов и позиционирования для косметологии.</p>
          </div>
          <nav className="nav-stack" aria-label="Разделы">
            <a className="nav-item active" href="#"><DatabaseZap size={18} /><span>Анализ рынка</span></a>
            <a className="nav-item" href="#"><Activity size={18} /><span>История анализов</span></a>
            <a className="nav-item" href="#"><Star size={18} /><span>Настройки</span></a>
          </nav>
        </div>
        <div className="profile-mini">
          <div className="profile-avatar"><UserRound size={18} /></div>
          <div><strong>Karolina</strong><span>Beauty analyst</span></div>
        </div>
      </aside>

      <section className="dashboard-shell" aria-label="Око косметолога">
        <motion.header animate={{ opacity: 1, y: 0 }} className="topbar" initial={{ opacity: 0, y: 14 }} transition={{ duration: 0.35 }}>
          <div>
            <div className="product-title-lockup">
              <img alt="" src={BRAND_LOGO_URL} />
              <div>
                <p className="eyebrow">Анализ конкурентов</p>
                <h1>Око косметолога</h1>
              </div>
            </div>
            <p className="topbar-subtitle">Локальная beauty-tech аналитика для цен, офферов, препаратов и позиционирования.</p>
            <p className="build-label">{BUILD_LABEL}</p>
          </div>
          <div className="topbar-actions">
            <motion.button className="mode-button" onClick={() => setIsSoftMode((value) => !value)} type="button" whileTap={tapMotion}>
              <Moon size={18} />
            </motion.button>
            <motion.button className="new-analysis-button cta-button" onClick={startNewAnalysis} type="button" whileTap={tapMotion}>
              <Plus size={18} />Новый анализ
            </motion.button>
          </div>
        </motion.header>

        <div className="summary-row">
          <Metric icon={Star} label="Карта рынка" value="82%" />
          <Metric icon={DatabaseZap} label="Источники" value={`${enabledSourceCount + 2}/5`} />
          <Metric icon={BadgeCheck} label="Цены" value="3" />
          <Metric icon={Activity} label="Акции" value="4" />
          <Metric icon={Star} label="Отзывы" value="422" />
        </div>

        <motion.form className="launch-card depth-card" onSubmit={submitAnalysis} transition={{ duration: 0.35 }} whileHover={{ y: -2 }}>
          <VantaTopologyBackground />
          <div className="launch-card-backdrop" aria-hidden="true" />
          <div className="launch-content-zone">
            <div className="launch-card-head">
              <div>
                <p className="section-kicker">Око аналитики</p>
                <h2>Студия запуска анализа</h2>
                <p className="launch-copy">Соберите конкурентную карту по городу, услуге и источникам за один запуск.</p>
                <div className="hero-tags"><span>карты</span><span>прайсы</span><span>акции</span><span>соцсигналы</span></div>
              </div>
              <div className={`status-pill ${state}`}><span aria-hidden="true" />{state === "loading" ? "Сбор данных" : state === "ready" ? "Анализ завершен" : "Готово к запуску"}</div>
            </div>

            <div className="brand-snapshot">
              <SnapshotCard label="Локация" value={city || DEFAULT_CITY} />
              <SnapshotCard label="Запрос" value={service || DEFAULT_SERVICE} />
              <SnapshotCard label="Покрытие" value={`${enabledSourceCount + 2} источников`} />
            </div>

            <div className="analysis-grid">
              <label className="field"><span>Город</span><input value={city} onChange={(event) => setCity(event.target.value)} /></label>
              <label className="field service-field"><span>Услуга или препарат</span><input value={service} onChange={(event) => setService(event.target.value)} /></label>
              <label className="field limit-field"><span>Лимит конкурентов</span><input type="number" min="1" max="20" value={limit} onChange={(event) => setLimit(event.target.value)} /></label>
              <label className="field instagram-field"><span>Instagram профили</span><textarea value={instagramProfiles} onChange={(event) => setInstagramProfiles(event.target.value)} placeholder="clinic_linia, doctor.skin.spb" /></label>

              <div className="sources-field">
                <span>Источники</span>
                <div className="source-controls">
                  {SOURCE_OPTIONS.map((source) => (
                    <SourceCheckbox
                      key={source.id}
                      checked={sources[source.id]}
                      detail={source.detail}
                      label={source.label}
                      onChange={(checked) => setSources((current) => ({ ...current, [source.id]: checked }))}
                    />
                  ))}
                </div>
              </div>

              <div className="launch-action-cell">
                <motion.button className="primary-action cta-button" disabled={state === "loading"} type="submit" whileTap={tapMotion}>
                  {state === "loading" ? <Loader2 className="spin-icon" size={18} /> : <Star size={18} />}
                  {state === "loading" ? "Анализирую" : "Запустить анализ"}
                </motion.button>
              </div>
            </div>

            <div className="source-summary">
              <Metric label="Лимит" value={`до ${limit || 3}`} />
              <Metric label="Краулинг" value="быстрый режим" />
              <Metric label="Модель" value="LLM" />
            </div>
            {state === "error" && <div className="inline-error">{error}</div>}
          </div>
          <div className="launch-visual-zone" aria-hidden="true"><MagicEyeAccent /></div>
        </motion.form>

        <div className="dashboard-tabs">
          <button className={activeTab === "results" ? "active" : ""} onClick={() => setActiveTab("results")} type="button"><DatabaseZap size={16} />Результаты анализа</button>
          <button className={activeTab === "sources" ? "active" : ""} onClick={() => setActiveTab("sources")} type="button"><Activity size={16} />Источники</button>
          <motion.button className="download-button cta-button" onClick={downloadReport} type="button" whileTap={tapMotion}><Download size={17} />Скачать отчет</motion.button>
        </div>

        {state === "loading" && <LoadingState />}
        {activeTab === "results" ? (
          <ResultsDashboard competitors={competitors} meta={meta} priceItems={priceItems} reportBlocks={reportBlocks} result={result} />
        ) : (
          <SourcesDashboard sources={displaySources} />
        )}
      </section>
    </main>
  );
}

function SourceCheckbox({ checked, detail, label, onChange }) {
  return (
    <label className={checked ? "source-toggle active" : "source-toggle"}>
      <input checked={checked} onChange={(event) => onChange(event.target.checked)} type="checkbox" />
      <span className="source-neon-checkbox" aria-hidden="true"><span className="source-neon-box" /></span>
      <span className="source-toggle-copy"><strong>{label}</strong><small>{detail}</small></span>
    </label>
  );
}

function ResultsDashboard({ competitors, meta, priceItems, reportBlocks, result }) {
  return (
    <section className="results-zone">
      <div className="summary-row">
        <Metric icon={Star} label="Конкурентов" value={meta.competitorCount} />
        <Metric icon={DatabaseZap} label="Сайтов" value={meta.scannedWebsites} />
        <Metric icon={BadgeCheck} label="Яндекс" value={meta.yandexCount || 0} />
        <Metric icon={Activity} label="Avito" value={meta.avitoCount || 0} />
        <Metric icon={Star} label="Instagram" value={meta.instagramCount || 0} />
      </div>
      <div className="result-grid">
        <DashboardPanel className="llm-panel" eyebrow={result ? "LLM-отчет" : "Демо LLM-отчет"} title="Стратегические выводы">
          <div className="report-body">{reportBlocks.map((block) => <ReportBlock block={block} key={block.id} />)}</div>
        </DashboardPanel>
        <DashboardPanel className="competitors-panel" eyebrow="Конкуренты" title={`Конкуренты (${competitors.length})`}>
          <CompetitorTable competitors={competitors} />
        </DashboardPanel>
        <aside className="right-rail">
          <DashboardPanel eyebrow="Цены / препараты" title="Препараты"><InsightList items={priceItems} empty="Прайсы пока не найдены" /></DashboardPanel>
          <DashboardPanel eyebrow="Предупреждения" title="Статус данных"><Warnings warnings={meta.warnings} /></DashboardPanel>
        </aside>
      </div>
    </section>
  );
}

function SourcesDashboard({ sources }) {
  return (
    <section className="sources-dashboard">
      <SourceColumn items={sources.yandexMaps || []} label="Яндекс Карты" mapper={(place) => [place.name, place.address || place.phone]} />
      <SourceColumn items={sources.avito || []} label="Avito" mapper={(listing) => [listing.title, listing.price || listing.location]} />
      <SourceColumn items={sources.instagram || []} label="Instagram" mapper={(profile) => [`@${profile.username}`, profile.followersCount ? `${profile.followersCount} подписчиков` : profile.fullName]} />
    </section>
  );
}

function DashboardPanel({ children, className = "", eyebrow, title }) {
  return <article className={`dashboard-panel depth-card ${className}`}><div className="panel-title"><div><p className="section-kicker">{eyebrow}</p><h2>{title}</h2></div></div>{children}</article>;
}

function Metric({ icon: Icon, label, value }) {
  return <div className="metric-card">{Icon ? <Icon size={18} /> : null}<strong>{value}</strong><span>{label}</span></div>;
}

function SnapshotCard({ label, value }) {
  return <div className="snapshot-card"><span>{label}</span><strong>{value}</strong></div>;
}

function CompetitorTable({ competitors }) {
  return (
    <div className="competitor-table">
      <div className="table-head"><span>Клиника</span><span>Рейтинг</span><span>Цена</span><span>Источник</span></div>
      {competitors.map((competitor, index) => (
        <div className="table-row" key={`${competitor.name}-${index}`}>
          <div><strong>{competitor.name}</strong><small>{competitor.address || competitor.category || "Адрес не найден"}</small></div>
          <span>{competitor.rating || "—"}</span>
          <span>{competitor.price || competitor.commercialSignals?.prices?.[0] || "Цена не найдена"}</span>
          <span className="source-badge">карты</span>
        </div>
      ))}
    </div>
  );
}

function SourceColumn({ items, label, mapper }) {
  return <article className="dashboard-panel depth-card"><p className="section-kicker">Источник</p><h2>{label}</h2><div className="source-list">{items.length ? items.map((item, index) => { const [title, subtitle] = mapper(item); return <div className="source-item" key={`${label}-${index}`}><strong>{title || "Без названия"}</strong><span>{subtitle || "Данные не найдены"}</span></div>; }) : <p className="empty-state">Пока нет данных</p>}</div></article>;
}

function ReportBlock({ block }) {
  return <section className="report-block"><h3>{block.title}</h3>{block.lines.map((line, index) => <p key={`${block.id}-${index}`}>{line}</p>)}</section>;
}

function InsightList({ empty, items }) {
  return <div className="insight-list">{items.length ? items.slice(0, 5).map((item, index) => <div className="insight-pill" key={`${item}-${index}`}>{item}</div>) : <p className="empty-state">{empty}</p>}</div>;
}

function Warnings({ warnings = [] }) {
  return <div className="warnings-list">{warnings.length ? warnings.map((warning, index) => <p key={`${warning}-${index}`}>{warning}</p>) : <p className="empty-state">Критичных предупреждений нет.</p>}</div>;
}

function LoadingState() {
  return <div className="loading-card depth-card"><Loader2 className="spin-icon" size={22} /><strong>Собираю данные</strong><span>Быстрый режим включён, запрос не должен падать по таймауту.</span></div>;
}

function parseReport(report) {
  return report
    .split(/\n###\s+/)
    .map((chunk, index) => chunk.replace(/^###\s+/, "").trim())
    .filter(Boolean)
    .map((chunk, index) => {
      const [title, ...lines] = chunk.split("\n").map((line) => line.trim()).filter(Boolean);
      return { id: `${title}-${index}`, title: title || "Раздел", lines: lines.length ? lines : [chunk] };
    });
}

function collectPriceInsights(competitors) {
  return competitors.flatMap((competitor) => {
    const prices = competitor.commercialSignals?.prices || [];
    return prices.length ? prices : competitor.price ? [competitor.price] : [];
  });
}

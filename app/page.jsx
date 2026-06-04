"use client";

import Lottie from "lottie-react";
import {
  Activity,
  BadgeCheck,
  Crown,
  DatabaseZap,
  Download,
  FileText,
  Flame,
  Layers3,
  Loader2,
  Moon,
  Plus,
  ShieldAlert,
  Star,
} from "lucide-react";
import { motion } from "framer-motion";
import { Cell, Pie, PieChart, ResponsiveContainer, Tooltip } from "recharts";
import { useMemo, useState } from "react";

import loadingAnimation from "./animations/analysis-loading.json";
import { Activity as AnimatedActivity } from "@/components/animate-ui/icons/activity";
import { ChartBar as AnimatedChartBar } from "@/components/animate-ui/icons/chart-bar";
import { ChartColumn as AnimatedChartColumn } from "@/components/animate-ui/icons/chart-column";
import { CircleCheck as AnimatedCircleCheck } from "@/components/animate-ui/icons/circle-check";
import { Clock as AnimatedClock } from "@/components/animate-ui/icons/clock";
import { Menu as AnimatedMenu } from "@/components/animate-ui/icons/menu";
import { Settings as AnimatedSettings } from "@/components/animate-ui/icons/settings";
import { Sparkles as AnimatedSparkles } from "@/components/animate-ui/icons/sparkles";
import MagicEyeAccent from "@/components/MagicEyeAccent";
import VantaTopologyBackground from "@/components/VantaTopologyBackground";

const DEFAULT_CITY = "Санкт-Петербург";
const DEFAULT_SERVICE = "контурная пластика";
const SAFE_COMPETITOR_LIMIT = 5;

const SOURCE_OPTIONS = [
  { id: "yandex", label: "Яндекс Карты", detail: "локальные карточки" },
  { id: "avito", label: "Avito", detail: "объявления и предложения" },
  { id: "instagram", label: "Instagram", detail: "профили клиник" },
];

const IRIS_IMAGE_URL = "/assets/iris-market-bg.png";
const BRAND_LOGO_URL = "/assets/oko-cosmetologa-mark.png";
const PROFILE_AVATAR_URL = "/assets/karolina-avatar.png";

const sidebarItems = [
  { label: "Анализ рынка", icon: AnimatedChartColumn, active: true },
  { label: "История анализов", icon: AnimatedClock },
  { label: "Настройки", icon: AnimatedSettings },
];

const mockCompetitors = [
  {
    name: "Lumiere Clinic",
    address: "Петроградская сторона",
    rating: 4.8,
    reviewCount: 186,
    commercialSignals: {
      prices: ["Контурная пластика губ от 18 900 ₽"],
      preparations: ["Juvederm", "Belotero"],
      promotions: ["Скидка 12% на вторую зону"],
      packages: ["Губы + подбородок от 32 700 ₽"],
    },
  },
  {
    name: "Asteria Beauty Lab",
    address: "Центральный район",
    rating: 4.6,
    reviewCount: 142,
    commercialSignals: {
      prices: ["Препарат Stylage от 16 500 ₽"],
      preparations: ["Stylage", "Radiesse"],
      promotions: ["Консультация бесплатно при записи"],
      packages: [],
    },
  },
  {
    name: "Forma Skin Atelier",
    address: "Московский проспект",
    rating: 4.9,
    reviewCount: 94,
    commercialSignals: {
      prices: ["Контурная пластика от 21 000 ₽"],
      preparations: ["Restylane"],
      promotions: [],
      packages: ["Пакет коррекции двух зон от 38 000 ₽"],
    },
  },
];

const mockReport = `
### Карта рынка
В демо-режиме видно, как отчет будет выглядеть после подключения источников. Основная конкуренция строится вокруг доверия к врачу, понятных цен и доказуемого опыта.

### Цены и препараты
- В примере встречаются Juvederm, Belotero, Stylage, Radiesse и Restylane.
- Удобно сравнивать цену за процедуру, цену за зону и комплексные предложения.

### Что можно применить в работе
- Выносить препараты и стартовую цену в первый экран услуги.
- Отдельно показывать акции на вторую зону и бесплатную консультацию.
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

const chartColors = ["#6f2fb0", "#c65cc7", "#ef8a74", "#e8b95d", "#78a982", "#4fa6a2", "#7d91d8"];
const preparationSliceColors = ["#6f2fb0", "#d25abb", "#f08d72", "#efbd66", "#78a982", "#52aaa6", "#7d91d8"];

const entrance = {
  hidden: { opacity: 0, y: 18 },
  visible: { opacity: 1, y: 0 },
};

const transition = { duration: 0.42, ease: [0.16, 1, 0.3, 1] };
const tapMotion = { scale: 0.975 };
const iconHover = {
  animateOnHover: true,
  completeOnStop: true,
};

export default function Home() {
  const [city, setCity] = useState(DEFAULT_CITY);
  const [service, setService] = useState(DEFAULT_SERVICE);
  const [limit, setLimit] = useState(SAFE_COMPETITOR_LIMIT);
  const [instagramProfiles, setInstagramProfiles] = useState("");
  const [sources, setSources] = useState({ yandex: true, avito: true, instagram: true });
  const [state, setState] = useState("idle");
  const [error, setError] = useState("");
  const [result, setResult] = useState(null);
  const [activeTab, setActiveTab] = useState("results");
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const [isSoftMode, setIsSoftMode] = useState(false);

  const displayCompetitors = result?.brief?.competitors?.length ? result.brief.competitors : mockCompetitors;
  const displaySources = result?.brief?.supplementalSources || mockSources;
  const reportBlocks = useMemo(() => parseReport(result?.report || mockReport), [result]);
  const priceInsights = useMemo(() => collectPriceInsights(displayCompetitors), [displayCompetitors]);
  const promotionInsights = useMemo(() => collectPromotionInsights(displayCompetitors), [displayCompetitors]);
  const chartData = useMemo(() => buildPreparationChartData(displayCompetitors), [displayCompetitors]);
  const enabledSourceCount = countEnabledSources(sources);
  const pulseCards = useMemo(
    () => buildPulseCards({ competitors: displayCompetitors, enabledSourceCount, priceInsights, promotionInsights }),
    [displayCompetitors, enabledSourceCount, priceInsights, promotionInsights],
  );
  const isRealResult = state === "ready" && result;

  async function submitAnalysis(event) {
    event.preventDefault();
    setState("loading");
    setError("");
    setResult(null);

    try {
      const response = await fetch("/api/analyze", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ city, service, limit, instagramProfiles, sources }),
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
      <MobileTopbar isMenuOpen={isMenuOpen} setIsMenuOpen={setIsMenuOpen} />
      <Sidebar isMenuOpen={isMenuOpen} setIsMenuOpen={setIsMenuOpen} />

      <section className="dashboard-shell" aria-label="Око косметолога">
        <motion.header animate="visible" className="topbar" initial="hidden" transition={transition} variants={entrance}>
          <div>
            <div className="page-title-block">
              <p className="eyebrow">Рабочая панель</p>
              <h1>Анализ конкурентов</h1>
            </div>
            <p className="topbar-subtitle">Цены, препараты, акции и источники конкурентов в одном AI-отчёте.</p>
          </div>
          <div className="topbar-actions">
            <motion.button className="mode-button" onClick={() => setIsSoftMode((value) => !value)} type="button" whileTap={tapMotion}>
              <Moon size={18} />
            </motion.button>
            <motion.button className="new-analysis-button cta-button" onClick={startNewAnalysis} type="button" whileTap={tapMotion}>
              <Plus size={18} />
              Новый анализ
            </motion.button>
          </div>
        </motion.header>

        <SignalPulseDeck cards={pulseCards} />

        <motion.form
          animate="visible"
          className="launch-card depth-card"
          initial="hidden"
          onSubmit={submitAnalysis}
          transition={{ ...transition, delay: 0.05 }}
          variants={entrance}
          whileHover={{ y: -2 }}
        >
          <VantaTopologyBackground />
          <div className="launch-card-backdrop" aria-hidden="true" />

          <div className="launch-content-zone">
            <div className="launch-card-head">
              <div>
                <p className="section-kicker">Панель анализа</p>
                <h2>Студия запуска анализа</h2>
                <p className="launch-copy">Соберите конкурентную карту по городу, услуге и источникам за один запуск.</p>
                <div className="hero-tags" aria-label="Возможности">
                  <span>карты</span>
                  <span>цены</span>
                  <span>акции</span>
                  <span>отзывы и активность</span>
                </div>
              </div>
              <div className="launch-status">
                <MiniLottie />
                <StatusPill state={state} />
              </div>
            </div>

            <div className="brand-snapshot">
              <SnapshotCard animation="default-loop" icon={AnimatedActivity} label="Локация" value={`${city || DEFAULT_CITY}`} />
              <SnapshotCard animation="default-loop" icon={AnimatedSparkles} label="Запрос" value={service || DEFAULT_SERVICE} />
              <SnapshotCard animation="default-loop" icon={AnimatedChartColumn} label="Покрытие" value={`${enabledSourceCount + 2} источников`} />
            </div>

            <div className="analysis-grid">
              <label className="field">
                <span>Город</span>
                <input value={city} onChange={(event) => setCity(event.target.value)} placeholder="Санкт-Петербург" />
              </label>

              <label className="field service-field">
                <span>Услуга или препарат</span>
                <input value={service} onChange={(event) => setService(event.target.value)} placeholder="контурная пластика" />
              </label>

              <label className="field limit-field">
                <span>Лимит конкурентов</span>
                <input type="number" min="1" max={SAFE_COMPETITOR_LIMIT} value={limit} onChange={(event) => setLimit(event.target.value)} />
              </label>

              <label className="field instagram-field">
                <span>Instagram профили</span>
                <textarea
                  value={instagramProfiles}
                  onChange={(event) => setInstagramProfiles(event.target.value)}
                  placeholder="clinic_linia, https://instagram.com/doctor.skin.spb/"
                />
              </label>

              <div className="sources-field" aria-label="Источники">
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
                  {state === "loading" ? (
                    <Loader2 className="spin-icon" size={18} />
                  ) : (
                    <AnimatedSparkles {...iconHover} size={18} />
                  )}
                  {state === "loading" ? "Анализирую" : "Запустить анализ"}
                </motion.button>
              </div>
            </div>

            <div className="source-summary">
              <Metric label="Лимит" value={`до ${limit || SAFE_COMPETITOR_LIMIT}`} />
              <Metric label="Проверка сайтов" value="10 сайтов" />
              <Metric label="AI-модель" value="OpenRouter" />
            </div>

            {state === "error" && <div className="inline-error">{error}</div>}
          </div>

          <div className="launch-visual-zone" aria-hidden="true">
            <MagicEyeAccent />
          </div>
        </motion.form>

        <div className="dashboard-tabs">
          <button className={activeTab === "results" ? "active" : ""} onClick={() => setActiveTab("results")} type="button">
            <Layers3 size={16} />
            Результаты анализа
          </button>
          <button className={activeTab === "sources" ? "active" : ""} onClick={() => setActiveTab("sources")} type="button">
            <DatabaseZap size={16} />
            Источники
          </button>
          <motion.button className="download-button cta-button" onClick={downloadReport} type="button" whileTap={tapMotion}>
            <Download size={17} />
            Скачать отчет
          </motion.button>
        </div>

        {state === "loading" && <LoadingState />}

        {activeTab === "results" ? (
          <ResultsDashboard
            chartData={chartData}
            competitors={displayCompetitors}
            isRealResult={isRealResult}
            priceInsights={priceInsights}
            promotionInsights={promotionInsights}
            reportBlocks={reportBlocks}
            result={result}
          />
        ) : (
          <SourcesDashboard sources={displaySources} />
        )}
      </section>
    </main>
  );
}

function MobileTopbar({ isMenuOpen, setIsMenuOpen }) {
  return (
    <header className="mobile-topbar">
      <div className="mobile-brand">
        <img alt="" src={BRAND_LOGO_URL} />
        <strong>Око косметолога</strong>
      </div>
      <button aria-label="Открыть меню" onClick={() => setIsMenuOpen(!isMenuOpen)} type="button">
        <AnimatedMenu {...iconHover} size={20} />
      </button>
    </header>
  );
}

function Sidebar({ isMenuOpen, setIsMenuOpen }) {
  return (
    <aside className={isMenuOpen ? "sidebar open" : "sidebar"} aria-label="Главная навигация">
      <motion.div
        animate={{ rotate: [-1.5, 1.4, -1.5], x: [0, 4, 0] }}
        aria-hidden="true"
        className="iris-veil"
        transition={{ duration: 9, ease: "easeInOut", repeat: Infinity }}
      >
        <img alt="" src={IRIS_IMAGE_URL} />
      </motion.div>

      <div>
        <div className="brand-mark">
          <div className="brand-gem">
            <img alt="" src={BRAND_LOGO_URL} />
          </div>
          <div>
            <strong>ОКО</strong>
            <span>КОСМЕТОЛОГА</span>
          </div>
        </div>

        <div className="brand-manifest">
          <span>BEAUTY INTELLIGENCE</span>
          <p>Аналитика цен, акций и позиционирования для косметологии.</p>
        </div>

        <nav className="nav-stack" aria-label="Разделы">
          {sidebarItems.map((item) => {
            const Icon = item.icon;
            return (
              <a className={item.active ? "nav-item active" : "nav-item"} href="#" key={item.label} onClick={() => setIsMenuOpen(false)}>
                <Icon {...iconHover} size={18} />
                <span>{item.label}</span>
              </a>
            );
          })}
        </nav>

        <motion.div className="premium-card" transition={transition} whileHover={{ y: -3 }} whileTap={tapMotion}>
          <div className="premium-icon">
            <Crown size={18} />
          </div>
          <h2>Премиум доступ</h2>
          <p>История анализов, больше источников и расширенные отчеты для переезда или запуска услуги.</p>
          <button type="button">Открыть</button>
        </motion.div>
      </div>

      <div className="profile-mini">
        <div className="profile-avatar">
          <img alt="Karolina" src={PROFILE_AVATAR_URL} />
        </div>
        <div>
          <strong>Karolina</strong>
          <span>Beauty analyst</span>
        </div>
      </div>
    </aside>
  );
}

function ResultsDashboard({ chartData, competitors, isRealResult, priceInsights, promotionInsights, reportBlocks, result }) {
  const meta = result?.meta || {
    competitorCount: competitors.length,
    scannedWebsites: 10,
    yandexCount: 2,
    avitoCount: 2,
    instagramCount: 2,
    warnings: [],
  };

  return (
    <motion.section animate="visible" className="results-zone" initial="hidden" transition={transition} variants={entrance}>
      <div className="summary-row">
        <Metric icon={Star} label="Конкурентов" value={meta.competitorCount} />
        <Metric icon={DatabaseZap} label="Сайтов" value={meta.scannedWebsites} />
        <Metric icon={BadgeCheck} label="Яндекс" value={meta.yandexCount || 0} />
        <Metric icon={Flame} label="Avito" value={meta.avitoCount || 0} />
        <Metric icon={Activity} label="Instagram" value={meta.instagramCount || 0} />
      </div>

      <div className="result-grid">
        <DashboardPanel className="llm-panel" eyebrow={isRealResult ? "AI-отчет" : "Демо AI-отчет"} title="Стратегические выводы">
          <div className="report-hero">
            <div className="panel-lottie">
              <MiniLottie />
              <AnimatedChartBar {...iconHover} animation="default-loop" size={17} />
              {isRealResult ? <span>Анализ завершен</span> : <span>Демо-режим</span>}
            </div>
            <strong>Найти, чем конкуренты продают доверие, цену и результат.</strong>
          </div>
          <div className="report-body">
            {reportBlocks.map((block) => (
              <ReportBlock key={block.id} block={block} />
            ))}
          </div>
        </DashboardPanel>

        <DashboardPanel className="competitors-panel" eyebrow="Конкуренты" title={`Конкуренты (${competitors.length})`}>
          <CompetitorTable competitors={competitors} />
        </DashboardPanel>

        <aside className="right-rail">
          <DashboardPanel eyebrow="Цены / препараты" title="Препараты">
            <PreparationDonut data={chartData} />
            <InsightList empty="Цены пока не найдены" items={priceInsights} limit={3} />
          </DashboardPanel>

          <DashboardPanel eyebrow="Акции" title="Предложения">
            <PromotionList items={promotionInsights} />
          </DashboardPanel>

          <DashboardPanel eyebrow="Предупреждения" title="Статус данных">
            <Warnings warnings={meta.warnings} />
          </DashboardPanel>
        </aside>
      </div>
    </motion.section>
  );
}

function SourcesDashboard({ sources }) {
  return (
    <motion.section animate="visible" className="sources-dashboard" initial="hidden" transition={transition} variants={entrance}>
      <SourceColumn items={sources.yandexMaps || []} label="Яндекс Карты" mapper={(place) => [place.name, place.address || place.phone]} />
      <SourceColumn items={sources.avito || []} label="Avito" mapper={(listing) => [listing.title, listing.price || listing.location]} />
      <SourceColumn
        items={sources.instagram || []}
        label="Instagram"
        mapper={(profile) => [`@${profile.username}`, profile.followersCount ? `${profile.followersCount} подписчиков` : profile.fullName]}
      />
    </motion.section>
  );
}

function DashboardPanel({ children, className = "", eyebrow, title }) {
  return (
    <motion.article className={`dashboard-panel depth-card ${className}`} transition={transition} whileHover={{ y: -3 }}>
      <div className="panel-title">
        <div>
          <p className="section-kicker">{eyebrow}</p>
          <h2>{title}</h2>
        </div>
      </div>
      {children}
    </motion.article>
  );
}

function StatusPill({ state }) {
  const label = state === "loading" ? "Сбор данных" : state === "ready" ? "Анализ завершен" : "Готово к запуску";
  return (
    <div className={`status-pill ${state}`}>
      {state === "ready" ? <AnimatedCircleCheck {...iconHover} size={15} /> : <span aria-hidden="true" />}
      {label}
    </div>
  );
}

function SourceCheckbox({ checked, detail, label, onChange }) {
  const toggle = () => onChange(!checked);

  return (
    <motion.label
      aria-checked={checked}
      className={checked ? "source-toggle active" : "source-toggle"}
      onClick={(event) => {
        event.preventDefault();
        toggle();
      }}
      onKeyDown={(event) => {
        if (event.key === " " || event.key === "Enter") {
          event.preventDefault();
          toggle();
        }
      }}
      role="checkbox"
      tabIndex={0}
      whileHover={{ y: -2 }}
      whileTap={tapMotion}
    >
      <input tabIndex={-1} type="checkbox" checked={checked} onChange={(event) => onChange(event.target.checked)} />
      <span className="source-neon-checkbox" aria-hidden="true">
        <span className="source-neon-box">
          <span className="source-neon-check-container">
            <svg viewBox="0 0 24 24" className="source-neon-check">
              <path d="M3 12.5l6 6L21 5" />
            </svg>
          </span>
          <span className="source-neon-glow" />
          <span className="source-neon-borders">
            <i />
            <i />
            <i />
            <i />
          </span>
        </span>
        <span className="source-neon-effects">
          <span className="source-neon-particles">
            <i />
            <i />
            <i />
            <i />
            <i />
            <i />
            <i />
            <i />
          </span>
          <span className="source-neon-rings">
            <i />
            <i />
          </span>
          <span className="source-neon-sparks">
            <i />
            <i />
            <i />
            <i />
          </span>
        </span>
      </span>
      <span className="source-toggle-copy">
        <strong>{label}</strong>
        <small>{detail}</small>
      </span>
    </motion.label>
  );
}

function Metric({ icon: Icon, label, value }) {
  return (
    <div className="metric">
      <span>{Icon ? <Icon size={15} /> : null}{label}</span>
      <strong>{value}</strong>
    </div>
  );
}

function SnapshotCard({ animation = "default-loop", icon: Icon, label, value }) {
  return (
    <motion.article className="snapshot-card" whileHover={{ y: -2 }} whileTap={tapMotion}>
      <span className="snapshot-icon">
        <Icon {...iconHover} animation={animation} size={18} />
      </span>
      <div>
        <span>{label}</span>
        <strong>{value}</strong>
      </div>
    </motion.article>
  );
}

function SignalPulseDeck({ cards }) {
  return (
    <motion.section animate="visible" className="signal-pulse-deck" initial="hidden" transition={{ ...transition, delay: 0.08 }} variants={entrance}>
      {cards.map((card) => {
        const Icon = card.icon;
        return (
          <motion.article className="pulse-card" key={card.label} whileHover={{ y: -4 }} whileTap={tapMotion}>
            <div className="pulse-head">
              <span><Icon {...(card.animated ? iconHover : {})} size={17} /></span>
              <small>{card.label}</small>
            </div>
            <strong>{card.value}</strong>
            <p>{card.detail}</p>
            <div className="progress-track" aria-hidden="true">
              <motion.i animate={{ width: `${card.progress}%` }} initial={{ width: 0 }} transition={{ duration: 0.7, ease: [0.16, 1, 0.3, 1] }} />
            </div>
          </motion.article>
        );
      })}
    </motion.section>
  );
}

function LoadingState() {
  return (
    <motion.section animate="visible" className="loading-state depth-card" initial="hidden" transition={transition} variants={entrance}>
      <div className="lottie-wrap">
        <Lottie animationData={loadingAnimation} loop />
      </div>
      <div>
        <p className="section-kicker">Сбор данных</p>
        <h2>Ищу конкурентов, цены, акции и профили</h2>
        <p>Источники собираются последовательно: если один сервис не отвечает, отчет продолжит собираться по доступным данным.</p>
      </div>
    </motion.section>
  );
}

function MiniLottie() {
  return (
    <div className="mini-lottie" aria-hidden="true">
      <Lottie animationData={loadingAnimation} loop />
    </div>
  );
}

function CompetitorTable({ competitors }) {
  return (
    <div className="competitor-table">
      <div className="table-head">
        <span>Клиника</span>
        <span>Рейтинг</span>
        <span>Цена/услуга</span>
        <span>Источник</span>
      </div>
      {competitors.slice(0, 20).map((competitor) => {
        const price = competitor.commercialSignals?.prices?.[0] || "цена не найдена";
        const source = competitor.website ? "сайт" : "карты";

        return (
          <article className="table-row" key={`${competitor.name}-${competitor.address}`}>
            <div className="table-clinic">
              <strong>{competitor.name}</strong>
              <small>{competitor.address || "адрес не найден"}</small>
            </div>
            <span className="table-rating" data-label="Рейтинг">{competitor.rating ? competitor.rating.toFixed(1) : "нет"}</span>
            <span className="table-price" data-label="Цена/услуга">{price}</span>
            <span className="table-source" data-label="Источник">
              <SourceBadge label={source} />
            </span>
          </article>
        );
      })}
    </div>
  );
}

function SourceBadge({ label }) {
  return <span className="source-badge">{label}</span>;
}

function PreparationDonut({ data }) {
  const chart = useMemo(() => buildNestedPreparationChart(data), [data]);

  return (
    <div className="donut-card">
      <div className="preparation-chart-shell">
        <ResponsiveContainer height={248} width="100%">
          <PieChart margin={{ bottom: 8, left: 8, right: 8, top: 8 }}>
            <Pie
              cornerRadius={5}
              cx="50%"
              cy="50%"
              data={chart.groups}
              dataKey="value"
              innerRadius={34}
              outerRadius={66}
              paddingAngle={3}
              stroke="rgba(255, 250, 253, 0.86)"
              strokeWidth={2}
            >
              {chart.groups.map((entry) => (
                <Cell fill={entry.color} key={entry.id} />
              ))}
            </Pie>
            <Pie
              cornerRadius={4}
              cx="50%"
              cy="50%"
              data={chart.details}
              dataKey="value"
              innerRadius={76}
              label={renderPreparationArcLabel}
              labelLine={false}
              outerRadius={116}
              paddingAngle={2}
              stroke="rgba(255, 250, 253, 0.72)"
              strokeWidth={1.5}
            >
              {chart.details.map((entry) => (
                <Cell fill={entry.color} key={entry.id} />
              ))}
            </Pie>
            <Tooltip content={<PreparationTooltip total={chart.total} />} />
          </PieChart>
        </ResponsiveContainer>
      </div>
      <div className="donut-legend">
        {chart.groups.map((item) => (
          <span key={item.id}>
            <i style={{ background: item.color }} />
            {item.label} {item.percentage.toFixed(0)}%
          </span>
        ))}
      </div>
      <div className="preparation-breakdown">
        {chart.details.slice(0, 5).map((item) => (
          <div key={item.id}>
            <span>
              <i style={{ background: item.color }} />
              {item.label}
            </span>
            <strong>{item.percentage.toFixed(0)}%</strong>
          </div>
        ))}
      </div>
    </div>
  );
}

function PreparationTooltip({ active, payload, total }) {
  if (!active || !payload?.length) return null;
  const item = payload[0]?.payload;
  if (!item) return null;

  return (
    <div className="chart-tooltip">
      <strong>{item.label}</strong>
      <span>
        {item.value} из {total} ({item.percentage.toFixed(0)}%)
      </span>
    </div>
  );
}

function renderPreparationArcLabel({ cx, cy, innerRadius, midAngle, outerRadius, payload }) {
  const percentage = payload?.percentage || 0;
  const labelLines = payload?.chartLabel || [];

  if (percentage < 14) return null;

  const radius = innerRadius + (outerRadius - innerRadius) * 0.58;
  const x = cx + radius * Math.cos((-midAngle * Math.PI) / 180);
  const y = cy + radius * Math.sin((-midAngle * Math.PI) / 180);

  return (
    <text className="preparation-arc-label" dominantBaseline="central" textAnchor="middle" x={x} y={y}>
      {labelLines.map((line, index) => (
        <tspan dy={index === 0 ? 0 : 10} key={line} x={x}>
          {line}
        </tspan>
      ))}
    </text>
  );
}

function buildNestedPreparationChart(data) {
  const normalized = data.map((item) => ({
    ...item,
    group: classifyPreparation(item.name),
    value: Number(item.value) || 0,
  }));

  const total = normalized.reduce((sum, item) => sum + item.value, 0) || 1;
  const groupMap = new Map();

  for (const item of normalized) {
    const current = groupMap.get(item.group) || { label: item.group, value: 0 };
    current.value += item.value;
    groupMap.set(item.group, current);
  }

  const groups = [...groupMap.values()]
    .sort((a, b) => b.value - a.value)
    .map((item, index) => ({
      ...item,
      color: chartColors[index % chartColors.length],
      id: `group-${item.label}`,
      percentage: (item.value / total) * 100,
    }));

  const groupIndex = new Map(groups.map((item, index) => [item.label, index]));

  const details = normalized
    .sort((a, b) => b.value - a.value)
    .slice(0, 7)
    .map((item, index) => {
      const base = preparationSliceColors[index % preparationSliceColors.length];
      const layerIndex = groupIndex.get(item.group) || 0;
      return {
        id: `prep-${item.name}`,
        label: item.name,
        chartLabel: formatPreparationChartLabel(item.name),
        value: item.value,
        group: item.group,
        percentage: (item.value / total) * 100,
        color: hexToRgba(base, Math.max(0.62, 0.94 - layerIndex * 0.04)),
      };
    });

  return { details, groups, total };
}

function classifyPreparation(name) {
  const value = name.toLowerCase();
  if (/radiesse|sculptra|ellanse|ланлум|коллаген|полимолоч/.test(value)) return "Биостимуляторы";
  if (/botox|ботокс|dysport|диспорт|xeomin|ксеомин/.test(value)) return "Ботулотоксины";
  if (/skinbooster|мезо|биоревитал|profhilo|профайло/.test(value)) return "Skin quality";
  if (/juvederm|stylage|belotero|restylane|teosyal|филлер/.test(value)) return "Филлеры ГК";
  return "Другие препараты";
}

function formatPreparationChartLabel(name) {
  const normalized = name.replace(/\s+/g, " ").trim();
  if (normalized.length <= 10) return [normalized];

  const parts = normalized.split(/[\s-]+/).filter(Boolean);
  if (parts.length >= 2 && parts[0].length <= 9) {
    return [parts[0], parts[1].length > 8 ? `${parts[1].slice(0, 7)}…` : parts[1]];
  }

  return [`${normalized.slice(0, 9)}…`];
}

function hexToRgba(hex, alpha) {
  const normalized = hex.replace("#", "");
  const r = parseInt(normalized.slice(0, 2), 16);
  const g = parseInt(normalized.slice(2, 4), 16);
  const b = parseInt(normalized.slice(4, 6), 16);
  return `rgba(${r}, ${g}, ${b}, ${alpha})`;
}

function InsightList({ empty, items, limit = 6 }) {
  if (items.length === 0) {
    return <p className="empty-note">{empty}</p>;
  }

  return (
    <div className="insight-list">
      {items.slice(0, limit).map((item) => (
        <article className="insight-item" key={`${item.name}-${item.text}`}>
          <strong>{item.name}</strong>
          <span>{item.text}</span>
        </article>
      ))}
    </div>
  );
}

function PromotionList({ items }) {
  const fallback = items.length
    ? items
    : [
        { name: "Lumiere Clinic", text: "12% на вторую зону" },
        { name: "Asteria Beauty Lab", text: "Консультация бесплатно" },
      ];

  return (
    <div className="promotion-list">
      {fallback.slice(0, 5).map((item, index) => (
        <PromotionCard index={index} item={item} key={`${item.name}-${item.text}`} />
      ))}
    </div>
  );
}

function PromotionCard({ index, item }) {
  const display = getPromotionDisplay(item.text, index);

  return (
    <article>
      <div>
        <strong className={display.hasPercent ? "promotion-percent" : ""}>{display.label}</strong>
      </div>
      <span>{item.text}</span>
      <small>{item.name}</small>
      <div className="offer-meter" aria-hidden="true">
        <i style={{ width: `${display.meter}%` }} />
      </div>
    </article>
  );
}

function getPromotionDisplay(text, index) {
  const percentMatch = text.match(/(\d{1,2})\s?%/);
  if (percentMatch) {
    const percent = Number(percentMatch[1]);
    return {
      hasPercent: true,
      label: `${percent}%`,
      meter: Math.min(94, Math.max(44, percent * 4.2)),
    };
  }

  if (/бесплатн|подар|консультац/i.test(text)) {
    return { hasPercent: false, label: "Бонус", meter: 68 };
  }

  if (/пакет|комплекс|зон|губы|подбород/i.test(text)) {
    return { hasPercent: false, label: "Пакет", meter: 78 };
  }

  return { hasPercent: false, label: "Акция", meter: index === 0 ? 72 : 56 };
}

function Warnings({ warnings }) {
  if (!warnings || warnings.length === 0) {
    return (
      <div className="status-complete">
        <MiniLottie />
        <p>Критичных предупреждений нет. Пробелы в ценах отмечаются отдельно.</p>
      </div>
    );
  }

  return (
    <div className="warnings">
      {warnings.map((warning) => (
        <p key={warning}>
          <ShieldAlert size={15} />
          {warning}
        </p>
      ))}
    </div>
  );
}

function SourceColumn({ items, label, mapper }) {
  return (
    <DashboardPanel className="source-column" eyebrow="Источник" title={label}>
      {items.length === 0 ? (
        <p className="empty-note">Нет данных</p>
      ) : (
        items.slice(0, 8).map((item) => {
          const [title, meta] = mapper(item);
          return (
            <article className="source-card" key={`${label}-${title}-${meta}`}>
              <div>
                <FileText size={15} />
                <strong>{title}</strong>
              </div>
              <span>{meta || "данные найдены"}</span>
              <SourceBadge label={label.split(" ")[0]} />
            </article>
          );
        })
      )}
    </DashboardPanel>
  );
}

function ReportBlock({ block }) {
  if (block.type === "heading") return <h3 className="report-heading">{block.text}</h3>;
  if (block.type === "list") return <p className="report-line list-line">{block.text}</p>;
  return <p className="report-line">{block.text}</p>;
}

function collectPriceInsights(competitors) {
  return competitors.flatMap((competitor) => {
    const prices = competitor.commercialSignals?.prices || [];
    const preparations = competitor.commercialSignals?.preparations || [];
    return prices
      .filter((price) => price && price !== "цена не найдена")
      .map((price) => ({
        name: competitor.name,
        text: preparations.length > 0 ? `${price}. ${preparations.join(", ")}` : price,
      }));
  });
}

function collectPromotionInsights(competitors) {
  return competitors.flatMap((competitor) => {
    const promotions = competitor.commercialSignals?.promotions || [];
    const packages = competitor.commercialSignals?.packages || [];
    return [...promotions, ...packages].filter(Boolean).map((text) => ({ name: competitor.name, text }));
  });
}

function buildPreparationChartData(competitors) {
  const counts = new Map();
  for (const competitor of competitors) {
    for (const preparation of competitor.commercialSignals?.preparations || []) {
      counts.set(preparation, (counts.get(preparation) || 0) + 1);
    }
  }

  const data = [...counts.entries()].map(([name, value]) => ({ name, value }));
  return data.length > 0
    ? data
    : [
        { name: "Juvederm", value: 4 },
        { name: "Stylage", value: 3 },
        { name: "Belotero", value: 2 },
      ];
}

function buildPulseCards({ competitors, enabledSourceCount, priceInsights, promotionInsights }) {
  const competitorScore = Math.min(100, competitors.length * 18 + 28);
  const priceScore = Math.min(100, priceInsights.length * 18 + 34);
  const promoScore = Math.min(100, promotionInsights.length * 22 + 30);
  const reviewTotal = competitors.reduce((sum, competitor) => sum + (competitor.reviewCount || 0), 0);

  return [
    {
      icon: AnimatedChartColumn,
      animated: true,
      label: "Карта рынка",
      value: `${Math.min(94, competitorScore)}%`,
      detail: "видимость рынка",
      progress: Math.min(94, competitorScore),
    },
    {
      icon: DatabaseZap,
      label: "Источники",
      value: `${enabledSourceCount + 2}/5`,
      detail: "карты, сайты, Avito и Instagram",
      progress: Math.min(100, (enabledSourceCount + 2) * 20),
    },
    {
      icon: AnimatedSparkles,
      animated: true,
      label: "Цены",
      value: priceInsights.length > 0 ? `${priceInsights.length}` : "demo",
      detail: "найденные цены и препараты",
      progress: priceScore,
    },
    {
      icon: Flame,
      label: "Акции",
      value: promotionInsights.length > 0 ? `${promotionInsights.length}` : "demo",
      detail: "пакеты и акции",
      progress: promoScore,
    },
    {
      icon: AnimatedClock,
      animated: true,
      label: "Отзывы",
      value: reviewTotal ? `${reviewTotal}` : "420+",
      detail: "социальное доказательство",
      progress: Math.min(100, Math.max(42, reviewTotal / 5)),
    },
  ];
}

function countEnabledSources(sources) {
  return Object.values(sources).filter(Boolean).length;
}

function parseReport(report) {
  return report
    .split("\n")
    .map((line) => line.trim())
    .filter(Boolean)
    .map((line, index) => {
      if (/^#{1,3}\s+/.test(line)) {
        return { id: `${index}-${line}`, type: "heading", text: line.replace(/^#{1,3}\s+/, "") };
      }
      if (/^[-*]\s+/.test(line) || /^\d+\.\s+/.test(line)) {
        return { id: `${index}-${line}`, type: "list", text: line.replace(/^[-*]\s+/, "").replace(/^\d+\.\s+/, "") };
      }
      return { id: `${index}-${line}`, type: "paragraph", text: line };
    });
}

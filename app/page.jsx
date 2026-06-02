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
  UserRound,
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
const BUILD_LABEL = "FAST API FIX 4b2ce18";

const SOURCE_OPTIONS = [
  { id: "yandex", label: "Яндекс Карты", detail: "локальные карточки" },
  { id: "avito", label: "Avito", detail: "частные офферы" },
  { id: "instagram", label: "Instagram", detail: "профили клиник" },
];

const IRIS_IMAGE_URL = "/assets/iris-market-bg.png";
const BRAND_LOGO_URL = "/assets/oko-cosmetologa-mark.png";

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
В демо-режиме видно, как отчет будет выглядеть после подключения источников. Основная конкуренция строится вокруг доверия к врачу, понятного прайса и доказуемого опыта.

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
  const [limit, setLimit] = useState(20);
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
        body: JSON.stringify({
          city,
          service,
          limit,
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
      <MobileTopbar isMenuOpen={isMenuOpen} setIsMenuOpen={setIsMenuOpen} />
      <Sidebar isMenuOpen={isMenuOpen} setIsMenuOpen={setIsMenuOpen} />

      <section className="dashboard-shell" aria-label="Око косметолога">
        <motion.header animate="visible" className="topbar" initial="hidden" transition={transition} variants={entrance}>
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
                <p className="section-kicker">Око аналитики</p>
                <h2>Студия запуска анализа</h2>
                <p className="launch-copy">Соберите конкурентную карту по городу, услуге и источникам за один запуск.</p>
                <div className="hero-tags" aria-label="Возможности">
                  <span>карты</span>
                  <span>прайсы</span>
                  <span>акции</span>
                  <span>соцсигналы</span>
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
                <input type="number" min="1" max="20" value={limit} onChange={(event) => setLimit(event.target.value)} />
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
              <Metric label="Лимит" value={`до ${limit || 20}`} />
              <Metric label="Краулинг" value="быстрый режим" />
              <Metric label="Модель" value="LLM" />
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
          <p>Аналитика цен, офферов и позиционирования для косметологии.</p>
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
          <UserRound size={18} />
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
        <DashboardPanel className="llm-panel" eyebrow={isRealResult ? "LLM-отчет" : "Демо LLM-отчет"} title="Стратегические выводы">
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
            <InsightList empty="Прайсы пока не найдены" items={priceInsights} limit={3} />
          </DashboardPanel>

          <DashboardPanel eyebrow="Акции" title="Офферы">
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

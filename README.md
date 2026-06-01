# Око косметолога

Premium beauty-tech мини-сервис для домашнего задания: анализ конкурентов в косметологии по городу, услуге или препарату.

## Что делает

- Ищет локальных конкурентов через Apify Google Maps Scraper.
- Берет сайты найденных клиник и извлекает текст через Apify Website Content Crawler.
- Дополнительно может собрать данные из Яндекс Карт, Avito и публичных Instagram-профилей через Apify actors.
- Передает очищенные данные в OpenRouter.
- Показывает на сайте отчет по ценам, акциям, препаратам, позиционированию и идеям для работы.
- Не выдумывает цены: если прайс не найден, показывает это как пропуск данных.

## Переменные окружения

Создайте `.env.local` по примеру `.env.example`:

```bash
APIFY_TOKEN=your_apify_token
OPENROUTER_API_KEY=your_openrouter_key
OPENROUTER_MODEL=openrouter/owl-alpha
```

Дополнительные источники уже настроены дефолтами:

```bash
APIFY_YANDEX_MAPS_ACTOR=automation-lab/yandex-maps-lead-finder
APIFY_AVITO_ACTOR=daddyapi/avito-scraper
APIFY_INSTAGRAM_ACTOR=apify/instagram-profile-scraper
```

Avito и Яндекс Карты используют community actors, поэтому при ошибке actor можно заменить через переменные окружения на другой actor из Apify Store.

Если бесплатная модель OpenRouter упрется в лимит, замените `OPENROUTER_MODEL` на дешевую доступную модель из OpenRouter.

## Локальный запуск

```bash
npm install
npm run dev -- -p 3006
```

Откройте `http://localhost:3006`.

## Деплой на Vercel

1. Загрузите проект в GitHub или импортируйте папку в Vercel.
2. В настройках Vercel добавьте `APIFY_TOKEN`, `OPENROUTER_API_KEY`, `OPENROUTER_MODEL`.
3. Нажмите Deploy.
4. Для сдачи отправьте ссылку на опубликованный Vercel-сайт.

## Быстрый демо-кейс для проверки

- Город: `Санкт-Петербург`
- Услуга: `контурная пластика`
- Лимит конкурентов: `20`
- Источники: Яндекс Карты, Avito, Instagram

Если сервисы недоступны из региона, включите VPN перед входом в Apify, OpenRouter и Vercel.

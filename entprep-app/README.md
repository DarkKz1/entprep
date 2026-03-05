# ENTprep

Бесплатное веб-приложение для подготовки к ЕНТ (Единое национальное тестирование) Казахстана.

**Live:** [entprep.netlify.app](https://entprep.netlify.app)

## Возможности

- 10 000+ вопросов по 13 предметам с объяснениями (Supabase + 150/предмет офлайн)
- 3 типа заданий: одиночный выбор, множественный ответ, соответствие
- Полная симуляция ЕНТ (120 заданий, 5 предметов, 4 часа, 140 баллов)
- AI-разбор ошибок, учебные планы, генерация вопросов (Claude Sonnet 4.6)
- Адаптивные рекомендации на основе слабых тем
- Калькулятор грантов (52 вуза по всему Казахстану)
- Лидерборд по предметам
- Прогресс, серии, ежедневные вызовы
- PWA: работает офлайн, устанавливается на телефон
- Облачная синхронизация через Supabase
- Темная и светлая тема

## Стек

- **Frontend:** React 18, TypeScript, Vite 6, inline styles + theme system
- **Backend:** Netlify Functions (serverless)
- **AI:** Anthropic Claude Sonnet 4.6 (объяснения, учебный план, генерация вопросов)
- **БД/Auth:** Supabase (PostgreSQL, Google OAuth, RLS)
- **Мониторинг:** Sentry
- **Тестирование:** Vitest
- **CI/CD:** GitHub Actions, Netlify

## Запуск локально

```bash
cd entprep-app
npm install
cp .env.example .env  # заполните переменные
npm run dev
```

## Переменные окружения

| Переменная | Назначение |
|---|---|
| `VITE_SUPABASE_URL` | URL проекта Supabase |
| `VITE_SUPABASE_ANON_KEY` | Anon key Supabase |
| `ANTHROPIC_API_KEY` | Ключ Anthropic (ai-explain, ai-generate, ai-plan) |
| `ADMIN_EMAILS` | Email администраторов (через запятую) |
| `VITE_ADMIN_EMAILS` | Email администраторов (клиентская часть) |
| `ALLOWED_ORIGIN` | Разрешённый origin для CORS |
| `VITE_SENTRY_DSN` | DSN проекта Sentry |

## Команды

```bash
npm run dev       # Dev сервер
npm run build     # Production билд
npm run lint      # ESLint проверка
npm run lint:fix  # ESLint автофикс
npm run format    # Prettier форматирование
```

## Деплой

```bash
npm run build
npx netlify deploy --prod --dir=dist --no-build
```

## Структура проекта

```
src/
  components/     React компоненты (20+)
  components/ui/  UI-библиотека (Toggle, ProgressBar, SkeletonCard...)
  config/         Конфигурация предметов, ЕНТ, Supabase, Sentry
  constants/      Стили, темы, экраны
  contexts/       React контексты (App, Auth, Navigation, Toast)
  data/           Вопросы (офлайн-фолбэк), университеты
  hooks/          Кастомные хуки (useAsyncData, useBreakpoint)
  types/          TypeScript типы и интерфейсы
  utils/          Хелперы (questionStore, storage, sync, adaptive, scoring)
netlify/
  functions/      Serverless API (ai-explain, ai-generate, ai-plan, leaderboard)
  functions/utils Общие утилиты (CORS, auth, rate limiting)
```

## Лицензия

Частный проект. Все права защищены.

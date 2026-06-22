# BulCoin Mini App — итоговое ТЗ и правила проекта

> Статус: **план готов, реализация по команде**  
> Детальный чеклист: [`docs/WORK_PLAN.md`](./WORK_PLAN.md)  
> Дата: 2026-06-17

---

## 1. Цель продукта

Telegram Mini App для токена **$BLC (BulCoin / Chuvash Token)**:

- **Карточки** — 4 случайных на Home, открытие за BLC, casino/distribution режимы
- **Первый запуск** — генерация server wallet → пополнение баланса раздачи → admin launch; старт в **distribution**; повторная раздача только вручную в админке
- **Баланс** — из PostgreSQL (ledger); Web3 только на deposit/withdraw
- Пополнение: BLC, TON, USDT (DeDust swap, отключаемо)
- Вывод с комиссией и min из админки
- Реферальная программа, профиль, уровни
- Онбординг + карточки обновления при релизе
- Админка (Telegram ID whitelist)
- (v2) маркетплейс анкет, заданий, сделок

**Полная спецификация API и экономики:** [`docs/SPEC_API_ECONOMY.md`](./SPEC_API_ECONOMY.md)

---

## 2. Целевой стек (финальная реализация)

| Слой | Технология |
|------|------------|
| UI | **React 18+** |
| Стили | **Tailwind CSS v4** (через `@tailwindcss/vite`) |
| Серверное состояние / API | **TanStack Query** (`@tanstack/react-query`) |
| Сборка | **Vite** |
| Платформа | **Telegram WebApp API** |
| HTTP-клиент | `fetch` + обёртки в `src/services/api` |
| Язык | TypeScript *(рекомендуется при миграции)* |

### Не входит в целевой стек фронтенда

- Vanilla JS + `innerHTML` (текущий `src/`) — **legacy, под замену**
- Tailwind CDN — **убрать после миграции**
- React Native компоненты (`src/components/BottomTabs.js`) — **удалить**

### Backend (в этом репозитории)

**`server/`** — Node.js + TypeScript + PostgreSQL.  
Фронтенд: TanStack Query → `/api/*` с заголовком `X-Telegram-Init-Data`.  
Подробная архитектура: [`docs/WORK_PLAN.md`](./WORK_PLAN.md) §2–4.

---

## 3. Текущее состояние репозитория

### 3.1. Legacy Mini App (корень проекта)

```
index.html
src/
  index.js, app.js
  screens/     — Home, Profile, Referral, Buy, Withdraw
  services/    — telegram.js, api.js (заготовка)
  styles/      — main.css (Outfit, glass-block, gold theme)
public/images/ — иконки, covers, currencies
```

**Что работает (UI + mock):**

- 3 вкладки: Home / Referral / Profile
- Telegram init (username, expand, colors)
- Buy / Withdraw с подтверждением и demo-модалкой
- Referral: share + copy link
- Mock-данные (баланс 320 322 $BLC, друзья, курсы 1:1)

**Что не работает / заглушки:**

- Реальный API (`API_BASE_URL` — placeholder)
- Клики по карточкам Home
- Редактирование BIO
- Loading / error states

### 3.2. Папка `react/react/` (новая)

```
react/react/
  package.json          — Vite + React 18 + Tailwind v4
  vite.config.js
  index.html
  src/
    App.jsx             — UI Kit (свалка всех компонентов)
    App.module.css      — ~11k строк, стили из Figma
    pages/              — 11 экранов (+ html-дубли)
    components/         — ~120+ jsx-компонентов (Figma export)
```

**Происхождение:** автоматический экспорт из Figma (имена вида `ankety_82_268089_`, `property_125_8843_`).

**Страницы (pages):**

| Figma-страница | Назначение |
|----------------|------------|
| Onbordynh | Онбординг (крипта, комиссии, автономность) |
| Ankety | Каталог анкет / профилей |
| Sozdanye ankety | Создание анкеты |
| Zadanyya | Задания |
| Sozdanye zadanyya | Создание задания |
| Sdelky | Сделки |
| sud | Арбитраж / споры |
| Profyl | Профиль (пополнение, Buy, Withdraw, статистика, отзывы) |
| Razdeleniya | Разделы / навигация |
| UI KIT | Дизайн-система |
| iPhone 14 & 15 Pro Max - 127 | Device frame |

**Меню (5 вкладок в Figma):** анкеты, задания, центральная кнопка, сделки, профиль.

---

## 4. Критический вывод: `react/` — это НЕ бэкенд

| Критерий | `react/react/` | Настоящий бэкенд |
|----------|----------------|------------------|
| Серверный код | ❌ нет | ✅ Node/Python/Go и т.д. |
| API routes | ❌ нет | ✅ REST/GraphQL |
| БД | ❌ нет | ✅ PostgreSQL/Mongo и т.д. |
| Auth validation | ❌ нет | ✅ Telegram initData HMAC |
| fetch/axios | ❌ нет | ✅ |
| TanStack Query | ❌ нет | — (это фронт) |

**Применимость к текущему проекту как бэкенд: 0%.**

`react/` — это **расширенный UI-макет / design reference**, который нужно:

1. очистить от артефактов Figma-экспорта
2. переписать в нормальные React-компоненты
3. подключить к API через TanStack Query
4. объединить с логикой текущего Mini App

---

## 5. Сопоставление: legacy vs react (фронтенд)

| Функция | Legacy `src/` | `react/` | Пересечение |
|---------|---------------|----------|-------------|
| Home / каталог | ✅ сетка карточек $BLC | ✅ Ankety (анкеты) | Концептуально похоже, разный UI |
| Profile | ✅ баланс, LVL, BIO | ✅ Profyl + popolnenye | **Высокое** — Buy/Withdraw есть в обоих |
| Referral | ✅ invite + список | ❌ не найдено | Legacy — источник логики |
| Buy / Withdraw | ✅ формы + modal | ✅ в CSS/Profyl | **Высокое** — взять UX из legacy + UI из Figma |
| Onboarding | ❌ | ✅ | Только в react |
| Tasks (Zadanyya) | ❌ | ✅ | Только в react |
| Deals (Sdelky) | ❌ | ✅ | Только в react |
| Disputes (sud) | ❌ | ✅ | Только в react |
| Telegram integration | ✅ работает | ❌ | Перенести из legacy |
| API layer | ✅ заготовка | ❌ | Создать на TanStack Query |
| Routing | ✅ ручной | ❌ (каждая page = отдельный entry) | Нужен React Router |
| Качество кода | ⚠️ прототип | ⚠️ raw Figma export | Оба требуют рефакторинга |

**Итоговая применимость `react/` к проекту как фронтенд-основа: ~40–50%**

- **+** полный визуальный охват будущих экранов, Tailwind v4, Vite
- **−** код не компилируется без массового рефакторинга, нет логики, нет API, нет Telegram

---

## 6. Технические проблемы `react/` (блокеры до merge)

1. **Невалидный JSX:** `class` вместо `className`, теги `<component>`, `<app>`, `<_50_892/>`
2. **Пустой контент:** большинство `<span />` без текста (текст не экспортирован из Figma)
3. **Нет роутинга:** 11 entry-point файлов, каждый монтирует `<App />`
4. **Нет TanStack Query, нет API-слоя**
5. **Дублирование:** `__MACOSX/`, html + jsx для каждой страницы
6. **Огромный `App.module.css`** — смешан с inline Tailwind, сложно поддерживать
7. **Broken imports:** `index.html` → `Sozdanye ankety.jsx`, `./index.css` отсутствует
8. **Именование:** транслит + Figma node IDs — не пригодно для production

---

## 7. Целевая архитектура (после merge)

```
bulcoin-miniapp/
├── index.html
├── vite.config.ts
├── package.json
├── public/
│   └── images/
├── src/
│   ├── main.tsx
│   ├── app/
│   │   ├── App.tsx
│   │   ├── router.tsx              # React Router
│   │   └── providers.tsx           # QueryClientProvider + TelegramProvider
│   ├── features/
│   │   ├── home/
│   │   ├── profile/
│   │   ├── referral/
│   │   ├── buy/
│   │   ├── withdraw/
│   │   ├── ankety/                 # из react/
│   │   ├── zadanyya/
│   │   ├── sdelky/
│   │   └── onboarding/
│   ├── components/ui/            # из UI KIT react/
│   ├── hooks/
│   │   ├── useTelegram.ts          # из legacy telegram.js
│   │   └── useAuth.ts
│   ├── services/
│   │   └── api/                    # fetch + initData header
│   ├── lib/
│   │   └── queryClient.ts
│   └── styles/
│       └── globals.css
└── docs/
    └── FINAL_TZ.md                 # этот файл
```

---

## 8. API-контракт (бэкенд — отдельная разработка)

Все запросы: заголовок `X-Telegram-Init-Data`.

| Method | Endpoint | Назначение |
|--------|----------|------------|
| GET | `/api/users/me` | Профиль + баланс + уровень |
| GET | `/api/users/me/balance` | Баланс $BLC |
| GET | `/api/marketplace/items` | Каталог (Home / Ankety) |
| POST | `/api/transactions/buy` | Покупка $BLC |
| POST | `/api/transactions/withdraw` | Вывод $BLC |
| GET | `/api/referrals` | Список рефералов |
| POST | `/api/referrals/claim` | Бонус за реферала |
| GET | `/api/tasks` | Задания |
| GET | `/api/deals` | Сделки |
| POST | `/api/deals/:id/dispute` | Арбитраж |

TanStack Query keys: `['user']`, `['balance']`, `['marketplace']`, `['referrals']`, `['tasks']`, `['deals']`.

---

## 9. План финальной реализации (этапы)

> **Не начинать без команды «собираем проект».**

### Этап 0 — Подготовка (текущий)
- [x] Анализ legacy `src/`
- [x] Анализ `react/react/`
- [x] Фиксация ТЗ и правил
- [ ] Утверждение scope: только BulCoin MVP или полный Figma-scope

### Этап 1 — Scaffold
- [ ] Vite + React + TS + Tailwind v4 + TanStack Query + React Router
- [ ] Telegram provider (перенос из `telegram.js`)
- [ ] Базовый layout: header + bottom tabs
- [ ] QueryClient + api client

### Этап 2 — MVP-экраны (из legacy)
- [ ] Home, Profile, Referral, Buy, Withdraw
- [ ] Подключение API (или MSW mock)
- [ ] Loading / error / empty states

### Этап 3 — UI из Figma (react/)
- [ ] Рефакторинг UI Kit → `components/ui/`
- [ ] Onboarding
- [ ] Ankety, Zadanyya, Sdelky, sud (по приоритету)

### Этап 4 — Cleanup
- [ ] Удалить legacy `src/*.js`, Tailwind CDN, `react/__MACOSX/`
- [ ] Единый `npm run dev` / `npm run build`
- [ ] Deploy (HTTPS для Telegram)

---

## 10. Правила проекта

### 10.1. Стек и зависимости

1. **Только React + Tailwind + TanStack Query** для UI и data fetching.
2. Новые экраны — functional components, hooks.
3. **Не добавлять** Redux, MobX, Zustand без явного решения (Query + local state достаточно для MVP).
4. **Не использовать** Tailwind CDN в production.
5. Сборка — **Vite**, не http-server.

### 10.2. Структура кода

1. Feature-based folders (`src/features/<feature>/`).
2. Переиспользуемые UI — в `src/components/ui/`.
3. API-вызовы — только через `src/services/api/` + TanStack Query hooks (`useBalance`, `useReferrals`).
4. Telegram-логика — только через `useTelegram()` / `TelegramProvider`.
5. Имена файлов и компонентов — **английские**, PascalCase для компонентов.

### 10.3. Figma / react import

1. **Не копировать** Figma-export as-is в production.
2. Использовать `react/` как **визуальный референс**, переписывая компоненты.
3. Figma node IDs (`82_268089_`) — **не использовать** в финальных именах.
4. Текст, иконки, spacing — сверять с Figma/HTML-превью в `react/react/src/pages/*.html`.

### 10.4. Telegram Mini App

1. Приложение должно работать только внутри Telegram (initData).
2. Все API-запросы — с `X-Telegram-Init-Data`.
3. Haptic feedback на ключевых действиях (buy, withdraw, copy link).
4. HTTPS обязателен для deploy.

### 10.5. Качество

1. TypeScript strict — целевой режим.
2. Минимальный scope diff — не рефакторить несвязанное.
3. Mock-данные — только через MSW или `queryClient` dev fixtures, не hardcode в JSX.
4. Коммиты — только по запросу.

### 10.6. Что не делать до команды на merge

1. **Не удалять** legacy `src/` и **не перемещать** `react/` — оба служат референсом.
2. **Не объединять** package.json.
3. **Не подключать** бэкенд без согласованного API URL.

---

## 11. Принятые решения

| # | Вопрос | Решение |
|---|--------|---------|
| 1 | Основа UI | **Legacy**; react — только недостающие экраны |
| 2 | TypeScript | **Да**, web + server |
| 3 | Навигация | **3 tabs v1** → 5 tabs v2 |
| 4 | API | **`server/` в этом repo** + PostgreSQL + полная спец. §SPEC |
| 5 | Онбординг | **1 раз** новому юзеру; **release cards** при обновлении (новому — как стартовые) |
| 6 | Финансы | Ledger в БД; server wallet; ключи encrypted |
| 7 | Карточки | Casino / distribution + analyzer **B+C+ratchet** (§6.7 SPEC) |
| 8 | Аудит | Обязателен перед production (§11 SPEC) |

---

## 12. Краткая сводка для команды

```
react/ ≠ backend
react/ = Figma UI export (расширенный фронт, ~120 компонентов, 11 экранов)
legacy src/ = рабочий Telegram Mini App прототип с бизнес-логикой (mock)

Финальный проект = Vite + React + Tailwind v4 + TanStack Query + TS
                  + Telegram WebApp
                  + UI: legacy (основа) + react (доп. экраны)
                  + server/ + PostgreSQL (API в этом repo)

Реализация — по команде («делай этап N»). План: WORK_PLAN.md
```

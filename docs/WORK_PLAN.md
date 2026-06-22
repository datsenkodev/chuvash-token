# BulCoin Mini App — итоговое ТЗ, архитектура и план работ

> **Статус:** план утверждён, реализация — **только по команде**  
> **Обновлено:** 2026-06-17

---

## 1. Принципы сборки (зафиксировано)

| Решение | Выбор |
|---------|--------|
| **Основа UI** | Legacy `src/` + `main.css` + `public/images/` |
| **Дополнение UI** | Только **отсутствующие** экраны из `react/react/` |
| **Лишнее** | Удалить после миграции (см. §6) |
| **Стек** | React + Tailwind v4 + TanStack Query + Vite |
| **Язык** | **TypeScript** (web + server) |
| **Навигация v1** | **3 вкладки** (legacy): Home / Referral / Profile |
| **Навигация v2** | 5 вкладок (Figma) — после MVP |
| **API** | **В этом же репозитории** (`server/`) |
| **БД** | **PostgreSQL** |

---

## 2. Целевая архитектура (monorepo)

```
BulCoin_miniapp/
├── package.json                 # workspaces: web + server
├── vite.config.ts               # alias @ → src
├── index.html
├── public/
│   └── images/                  # assets из legacy (источник истины)
├── src/                         # FRONTEND (React)
│   ├── main.tsx
│   ├── app/
│   │   ├── App.tsx
│   │   ├── router.tsx
│   │   └── providers.tsx        # QueryClient + TelegramProvider
│   ├── components/
│   │   ├── layout/              # Header, BottomTabs — из legacy index.html
│   │   └── ui/                  # Button, GlassBlock, Modal — из legacy CSS
│   ├── features/
│   │   ├── home/                # ← legacy HomeScreen
│   │   ├── profile/             # ← legacy ProfileScreen
│   │   ├── referral/            # ← legacy ReferralScreen
│   │   ├── buy/                 # ← legacy BuyScreen
│   │   ├── withdraw/            # ← legacy WithdrawScreen
│   │   ├── onboarding/          # ← react Onbordynh (v1 или v1.1)
│   │   ├── tasks/               # ← react Zadanyya (v2, роуты без tab)
│   │   ├── deals/               # ← react Sdelky (v2)
│   │   ├── disputes/            # ← react sud (v2)
│   │   └── listings/            # ← react Ankety + create (v2)
│   ├── hooks/
│   │   ├── useTelegram.ts       # ← legacy telegram.js
│   │   └── queries/             # TanStack Query hooks
│   ├── services/
│   │   └── api-client.ts        # fetch + X-Telegram-Init-Data
│   ├── styles/
│   │   └── globals.css          # ← legacy main.css (миграция)
│   └── types/
│       └── api.ts               # shared DTO (дублируется в server)
├── server/                      # BACKEND (Node.js)
│   ├── package.json             # или общий root package
│   ├── src/
│   │   ├── index.ts             # entry, listen
│   │   ├── app.ts               # Express/Fastify app
│   │   ├── config/
│   │   │   └── env.ts             # PORT, DATABASE_URL, BOT_TOKEN
│   │   ├── middleware/
│   │   │   └── telegramAuth.ts  # validate initData HMAC
│   │   ├── routes/
│   │   │   ├── users.ts
│   │   │   ├── marketplace.ts
│   │   │   ├── transactions.ts
│   │   │   ├── referrals.ts
│   │   │   ├── tasks.ts
│   │   │   └── deals.ts
│   │   ├── services/            # business logic
│   │   ├── db/
│   │   │   ├── client.ts          # pg pool / drizzle / prisma
│   │   │   ├── schema.sql         # migrations
│   │   │   └── seed.ts
│   │   └── types/
│   └── tsconfig.json
├── docker-compose.yml           # PostgreSQL для local dev
├── .env.example
└── docs/
    ├── FINAL_TZ.md
    └── WORK_PLAN.md               # детальный чеклист (этот файл — секция 8)
```

### Dev-режим

```bash
npm run dev          # concurrently: vite (5173) + server (3000)
npm run dev:web      # только фронт
npm run dev:api      # только API
npm run build        # web → dist/, server → server/dist/
```

Vite proxy: `/api/*` → `http://localhost:3000` (как в legacy BuyScreen уже ожидает `/api/buy`).

---

## 3. Карта экранов: откуда что брать

### 3.1. v1 — из legacy (основа UI, переписать в React + TS)

| Экран | Legacy файл | React-компонент | Примечание |
|-------|-------------|-----------------|------------|
| Layout (header + tabs) | `index.html` | — | Withdraw в header |
| Home | `HomeScreen.js` | — | Сетка карточек $BLC, баланс |
| Profile | `ProfileScreen.js` | — | Avatar, LVL, BIO, Buy/Withdraw |
| Referral | `ReferralScreen.js` | — | Invite, copy link, список друзей |
| Buy | `BuyScreen.js` | — | TON/USDT/BTC/ETH → BLC |
| Withdraw | `WithdrawScreen.js` | — | BLC withdraw + modal |
| Telegram | `telegram.js` | — | → `useTelegram` hook |
| API client | `api.js` | — | → `api-client.ts` + Query |

**React Profyl — не использовать** (дублирует legacy Profile).

### 3.2. v1.1 / v2 — из react (только то, чего нет в legacy)

| Экран | React page | Когда | Как открывается (v1) |
|-------|--------------|-------|----------------------|
| Onboarding | `Onbordynh` | v1.1 | *см. вопрос ниже* |
| Ankety (каталог) | `Ankety` | v2 | Роут `/listings` или замена Home |
| Create listing | `Sozdanye ankety` | v2 | `/listings/new` |
| Tasks | `Zadanyya` | v2 | `/tasks` |
| Create task | `Sozdanye zadanyya` | v2 | `/tasks/new` |
| Deals | `Sdelky` | v2 | `/deals` |
| Disputes | `sud` | v2 | `/deals/:id/dispute` |

### 3.3. UI Kit из react

Использовать **выборочно** при реализации v2-экранов:

- `button`, `knopka`, `sellect`, `sortyrovka`, `menu`, `glass-block` паттерны
- Сверка текста/отступов по `react/react/src/pages/*.html`

Не переносить `App.jsx` (UI dump) и `App.module.css` целиком (~11k строк).

---

## 4. API в проекте (server/)

### 4.1. Stack (рекомендация)

| Компонент | Выбор |
|-----------|--------|
| Runtime | Node.js 20+ |
| Framework | **Fastify** или Express (Fastify — быстрее, типы) |
| ORM | **Drizzle** + `pg` (лёгкий TS) или Prisma |
| Auth | Telegram `initData` HMAC (`BOT_TOKEN`) |
| Migrations | SQL files / Drizzle kit |

### 4.2. Endpoints v1

| Method | Path | Legacy | Описание |
|--------|------|--------|----------|
| GET | `/api/health` | — | healthcheck |
| GET | `/api/users/me` | — | профиль из Telegram + БД |
| GET | `/api/users/me/balance` | `getUserBalance` | баланс $BLC |
| PATCH | `/api/users/me` | — | BIO, avatar meta |
| GET | `/api/marketplace/items` | Home grid | карточки каталога |
| GET | `/api/marketplace/items/:id` | — | деталь карточки |
| POST | `/api/transactions/buy` | BuyScreen `/api/buy` | покупка BLC |
| POST | `/api/transactions/withdraw` | WithdrawScreen | вывод BLC |
| GET | `/api/referrals` | ReferralScreen | список + link |
| POST | `/api/referrals/claim` | `claimReward` | начисление бонуса |

### 4.3. Endpoints v2 (заготовить роуты, stub 501)

| Method | Path | React screen |
|--------|------|--------------|
| GET/POST | `/api/tasks` | Zadanyya |
| GET/POST | `/api/deals` | Sdelky |
| POST | `/api/deals/:id/dispute` | sud |
| GET/POST | `/api/listings` | Ankety |

### 4.4. PostgreSQL — базовые таблицы (v1)

```sql
users           -- telegram_id, username, first_name, bio, level, xp
balances        -- user_id, blc_amount
marketplace_items -- title, cover_url, price_blc, rank
transactions    -- type buy|withdraw, currency, amount, status
referrals       -- referrer_id, referred_id, bonus_claimed
```

### 4.5. TanStack Query keys

```ts
['user', 'me']
['balance']
['marketplace', 'items']
['referrals']
['transactions']
// v2: ['tasks'], ['deals'], ['listings']
```

---

## 5. Правила проекта

1. **Legacy UI — источник истины** для Home, Profile, Referral, Buy, Withdraw, layout, цвета, шрифт Outfit.
2. **React/Figma** — только для экранов, которых нет в legacy; переписывать, не копировать raw export.
3. **TypeScript strict** на web и server.
4. **Данные** — только через TanStack Query + API; mock — MSW или server seed, не hardcode в JSX.
5. **Telegram:** все `/api/*` (кроме health) — middleware `telegramAuth`.
6. **Имена:** английские, PascalCase компоненты, kebab/camel файлы.
7. **Коммиты** — только по запросу.

---

## 6. Что удалить (этап cleanup, после рабочего v1)

| Путь | Причина |
|------|---------|
| `react/__MACOSX/` | мусор архива |
| `react/react/src/App.jsx` | UI dump |
| `react/react/src/App.module.css` | 11k строк Figma, не тащим |
| `react/react/src/pages/*.html` | референс до миграции, потом удалить |
| `react/react/src/pages/iPhone*` | device frame |
| `react/react/src/pages/UI KIT.*` | после извлечения нужных паттернов |
| `src/components/BottomTabs.js` | React Native |
| `src/components/TabContent.js` | React Native |
| `src/screens/*.js` | после React-миграции |
| `src/index.js`, `src/app.js` | после React-миграции |
| Tailwind CDN в `index.html` | заменён на `@tailwindcss/vite` |
| `http-server` dev script | заменён на Vite |
| Вся папка `react/` | после переноса нужных экранов в `src/features/` |

Legacy `src/styles/main.css` → мигрирует в `src/styles/globals.css`, затем удаляется старый tree.

---

## 8. План работ (поэтапно)

> **Старт каждого этапа — только по вашей команде** (например: «делай этап 1»).

---

### Этап 1 — Scaffold monorepo (≈1 сессия)

**Цель:** один `npm run dev` поднимает web + api + postgres.

- [ ] 1.1 Root `package.json` (workspaces), TypeScript configs
- [ ] 1.2 Vite + React 18 + `@tailwindcss/vite` + TanStack Query + React Router
- [ ] 1.3 Перенести `public/images/`, подключить `globals.css` из legacy `main.css`
- [ ] 1.4 Layout: `Header` + `BottomTabs` (3 tab) — pixel-close к legacy `index.html`
- [ ] 1.5 `TelegramProvider` + `useTelegram` из `telegram.js`
- [ ] 1.6 `api-client.ts` + Vite proxy `/api` → `:3000`
- [ ] 1.7 `server/`: Fastify/Express skeleton, `/api/health`, `telegramAuth` middleware (stub)
- [ ] 1.8 `docker-compose.yml` PostgreSQL + `.env.example`
- [ ] 1.9 Drizzle/Prisma schema + migration users/balances
- [ ] 1.10 Scripts: `dev`, `dev:web`, `dev:api`, `build`, `db:migrate`

**Критерий готовности:** localhost открывает layout с username из Telegram (или mock), API отвечает health, БД подключается.

---

### Этап 2 — v1 экраны (legacy UI → React) (≈2–3 сессии)

**Цель:** функциональный паритет с текущим legacy.

- [ ] 2.1 **Home** — баланс + grid карточек, `useMarketplaceItems` query
- [ ] 2.2 **Profile** — avatar, level bar, BIO (read), Buy/Withdraw buttons
- [ ] 2.3 **Referral** — share, copy link, friends list, `useReferrals`
- [ ] 2.4 **Buy** — currency select, confirm, congrats modal, `useBuyMutation`
- [ ] 2.5 **Withdraw** — form, confirm, modal, `useWithdrawMutation`
- [ ] 2.6 Роутинг: tabs + nested `/buy`, `/withdraw` (stack navigation)
- [ ] 2.7 Loading / error / empty states на всех queries
- [ ] 2.8 Server routes v1 + seed data (marketplace, mock friends)

**Критерий готовности:** все 3 tab + buy/withdraw работают с API и PostgreSQL, без hardcoded 320322.

---

### Этап 3 — API hardening (≈1 сессия)

- [ ] 3.1 Telegram initData validation (production-ready)
- [ ] 3.2 Transaction flow: buy/withdraw с записью в `transactions`
- [ ] 3.3 Referral link generation + bonus logic
- [ ] 3.4 Level/xp расчёт на server
- [ ] 3.5 Error handling, validation (zod)

---

### Этап 4 — Cleanup legacy (≈0.5 сессии)

- [ ] 4.1 Удалить vanilla `src/screens`, `src/index.js`, RN components
- [ ] 4.2 Обновить README, DEPLOYMENT.md
- [ ] 4.3 Production build + env docs

**Критерий:** один tree `src/` + `server/`, legacy JS не используется.

---

### Этап 5 — v1.1 Onboarding + release cards (≈0.5–1 сессия)

- [ ] 5.1 Экраны из react `Onbordynh` → `features/onboarding/`
- [ ] 5.2 Release cards при `app_version` bump
- [ ] 5.3 API §1 SPEC, flags в `users`

---

### Этап 2b — Cards core (≈1–2 сессии)

- [ ] 4 random cards, dynamic pricing, open, free timer UI
- [ ] `POST /api/cards/open`, server-side prize RNG
- [ ] Insufficient balance → timer + top-up CTA

---

### Этап 3b — Economy analyzer (≈1 сессия)

- [ ] Реализовать **B + C + ratchet** (SPEC §6.7): `economy_state.r_casino_locked`
- [ ] Cron: W, P, S, N, G → mode + r_effective; casino r только ↑ при G ≥ G_min
- [ ] `economy_snapshots` audit table
- [ ] Admin economy dashboard + `reset-r-casino` emergency

---

### Этап 3c–3e — Finance (≈2–3 сессии)

- [ ] 3c Deposits BLC + chain watcher
- [ ] 3d DeDust TON/USDT (feature flag)
- [ ] 3e Withdrawals (min, fee, queue, sign)

---

### Этап 4b — Admin (≈1 сессия)

- [ ] TG admin whitelist, settings CRUD, partner prizes, card templates

---

### Этап 7 — Security audit (≈1 сессия, перед prod)

- [ ] Checklist SPEC §11.2, abuse tests §11.3, economy simulation

---

### Этап 6 — v2 расширение (≈3+ сессии)

- [ ] 6.1 Bottom nav → 5 tabs (Figma menu)
- [ ] 6.2 Listings (Ankety) + create
- [ ] 6.3 Tasks (Zadanyya) + create
- [ ] 6.4 Deals (Sdelky) + disputes (sud)
- [ ] 6.5 API v2 endpoints + UI из react html-превью
- [ ] 6.6 Удалить папку `react/`

---

## 9. Онбординг (зафиксировано)

- **Новый пользователь:** onboarding-слайды **1 раз** + release cards текущей версии.
- **Обновление app:** release cards **1 раз** на версию (`last_seen_app_version`).
- Новому не показывать release cards повторно — они уже в onboarding.

Детали API: [`SPEC_API_ECONOMY.md`](./SPEC_API_ECONOMY.md) §1.

---

## 9b. API, экономика, карточки, аудит

Полная спецификация: **[`SPEC_API_ECONOMY.md`](./SPEC_API_ECONOMY.md)**

Ключевое:
- Ledger + server wallet + encrypted keys
- Admin via Telegram ID
- Cards: 4 random, casino/distribution, free timer 10–60 min
- Auto economy analyzer — **B+C+ratchet** (SPEC §6.7, зафиксировано)
- DeDust для TON/USDT
- Security audit §11 перед production

---

## 10. Команды для старта работ

| Команда | Действие |
|---------|----------|
| «делай этап 1» | Scaffold monorepo |
| «делай этап 2» | v1 экраны |
| «делай этапы 1–2» | Scaffold + v1 экраны |
| «делай всё до v1» | Этапы 1–4 |
| «онбординг A/B/C» | Зафиксировать и включить в план |

---

## 11. Сводка

```
Основа UI     = legacy (Home, Profile, Referral, Buy, Withdraw, main.css)
Добавить      = react-экраны, которых нет в legacy (onboarding, tasks, deals, …)
Удалить       = react dump, __MACOSX, RN components, vanilla JS после миграции
Стек          = React + Tailwind v4 + TanStack Query + TS
API           = server/ в этом repo + PostgreSQL
Nav v1        = 3 tabs → v2 = 5 tabs
Реализация    = по команде, этап за этапом
```

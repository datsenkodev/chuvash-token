# BulCoin Telegram Mini App

Monorepo: **React + Vite + Tailwind v4 + TanStack Query** (frontend) + **Fastify + PostgreSQL** (API).

## Quick start

```bash
# 1. Dependencies
npm install

# 2. Environment
cp .env.example .env

# 3. PostgreSQL
docker compose up -d

# 4. Migrate & seed
npm run db:migrate
npm run db:seed

# 5. Dev (web :5173 + api :3000)
npm run dev
```

Open http://localhost:5173 — in dev mode API accepts requests without Telegram (`DEV_MODE=true`).

## Production

См. **[docs/DEPLOY.md](docs/DEPLOY.md)** — ключи, nginx, админка, чеклист.

```bash
npm run build && npm run start:prod
```

## Scripts

| Command | Description |
|---------|-------------|
| `npm run dev` | Frontend + API |
| `npm run dev:web` | Vite only |
| `npm run dev:api` | API only |
| `npm run build` | Production build |
| `npm run start:prod` | Run API (after build) |
| `npm run db:migrate` | Apply SQL schema |
| `npm run db:seed` | Seed cards, onboarding, dev balance |

## Structure

```
src/           React app (legacy UI)
server/src/    Fastify API, economy analyzer, cards, ledger
public/        Static assets
docs/          TZ & specs
```

## Docs

- [FINAL_TZ.md](docs/FINAL_TZ.md)
- [WORK_PLAN.md](docs/WORK_PLAN.md)
- [SPEC_API_ECONOMY.md](docs/SPEC_API_ECONOMY.md) — API, cards, economy B+C+ratchet

## Telegram production

1. Set `BOT_TOKEN`, `DEV_MODE=false`
2. Deploy with HTTPS
3. Configure bot Mini App URL in BotFather

## Admin

Set `ADMIN_TELEGRAM_IDS` in `.env`. Admin routes: `/api/admin/*`

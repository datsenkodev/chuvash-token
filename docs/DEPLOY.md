# Деплой

## 1. Установка

```bash
npm install
npm run setup:env          # .env + секреты
# заполните в .env то, что скрипт выведет в консоль
docker compose up -d
npm run db:migrate && npm run db:seed
npm run build && npm run start:prod
```

---

## 2. Что генерируется само

| | Как |
|---|-----|
| `WALLET_ENCRYPTION_KEY` | `npm run setup:env` |
| `CHAIN_WEBHOOK_SECRET` | `npm run setup:env` |
| `DEDUST_API_URL` | `npm run setup:env` (по `TON_NETWORK`) |
| Server wallet `EQ...` | первый запуск API → строка в логе |

> `WALLET_ENCRYPTION_KEY` не менять после создания кошелька.

---

## 3. Что заполнить вручную

| Переменная | Ссылка |
|------------|--------|
| `BOT_TOKEN` | https://t.me/BotFather → `/token` |
| `BOT_USERNAME` | BotFather, username без `@` |
| `ADMIN_TELEGRAM_IDS` | https://t.me/userinfobot |
| `TONAPI_KEY` | https://tonconsole.com |
| `TONCENTER_API_KEY` | https://t.me/tonapibot → `/get_api_key` |
| `BLC_JETTON_MASTER` | ваш deploy или https://tonviewer.com |
| `USDT_JETTON_MASTER` | https://tonviewer.com/EQCxE6mUtQJKFnGfaROTKOt1lZbDiiX1kCixRv7Nw2Id_sDs (mainnet, опц.) |
| TonCo pools | https://app.tonco.io → `/admin` Settings |

DeDust: ключ не нужен — https://docs.dedust.io

Prod: `DEV_MODE=false`

---

## TonCo pools — какие, где взять, куда вписать

### Какие нужны

| Параметр в админке | Когда используется | Обязательность |
|--------------------|--------------------|----------------|
| `tonco_blc_ton_pool` | Депозит **TON** → BLC; продажа BLC за TON (gas refill) | Нужен, если TonCo включён и есть TON-депозиты / gas swap |
| `tonco_blc_usdt_pool` | Депозит **USDT** → BLC | Только если принимаете USDT через TonCo |
| `tonco_blc_pool_address` | Legacy-алиас для `tonco_blc_ton_pool` | Не заполнять отдельно — при сохранении BLC/TON пула пишется в оба |
| `tonco_router_address` | Router TonCo (уже дефолт в коде) | Менять только если TonCo сменит router |
| `tonco_slippage_bps` | Slippage TonCo (default 100 = 1%) | Опционально через API settings |

Нужен адрес **pool-контракта** (Algebra pool), **не** jetton master BLC и **не** router.

### Как получить адрес пула

1. Откройте https://app.tonco.io  
2. Выберите пару **BLC / TON** (или **BLC / USDT**)  
3. Перейдите в explorer (Tonviewer) — адрес контракта **Pool** / **Liquidity pool**  
   - Пример формата: `EQ...` или `UQ...`  
4. Проверка: в Tonviewer у контракта есть методы вроде `getPoolStateAndConfiguration`, `getSwapEstimate`

Альтернатива: если пул уже на Dedust/Tonviewer — поиск по `BLC` + `TonCo` / имя пула.

Router (отдельно, обычно не трогать):  
`EQC_-t0nCnOFMdp7E7qPxAOCbCWGFz-e3pwxb6tTvFmshjt5`

### Куда задать

**UI:** `/admin` → **Settings** → **Swap router** → поля **TonCo BLC/TON pool** и **TonCo BLC/USDT pool** → **Save swap settings**

**API:**

```http
PATCH /api/admin/settings
{
  "tonco_swap_enabled": true,
  "tonco_blc_ton_pool": "EQ...pool_blc_ton...",
  "tonco_blc_usdt_pool": "EQ...pool_blc_usdt...",
  "swap_router_strategy": "dedust_first"
}
```

Минимум для TON-only: один `tonco_blc_ton_pool` + `tonco_swap_enabled: true`.

Если TonCo не нужен — `tonco_swap_enabled: false`, пулы можно не заполнять (хватит DeDust).

---

## 4. Nginx + Telegram

```nginx
root /var/www/bulcoin/dist;
location /api/ { proxy_pass http://127.0.0.1:3000; }
location / { try_files $uri $uri/ /index.html; }
```

BotFather → Menu Button → `https://your-domain.com`

---

## 5. Админка `/admin`

1. Save jetton masters
2. Пополнить server wallet: **BLC** (≥100k) + **TON** (≥2–5)
3. Sync from chain → Launch
4. Settings → Swap router → TonCo pools

---

## 7. Куда деплоить (схема)

| Часть | Куда | Почему |
|-------|------|--------|
| **Frontend** (Mini App) | **Vercel** | Статика `dist/`, HTTPS из коробки |
| **Backend** (Fastify + jobs) | **Railway / VPS / Render** | Постоянный процесс: chain watcher, cron, wallet |
| **PostgreSQL** | Railway Postgres / Supabase / Neon | Нужна живая БД, не serverless без pg |

**Не на Vercel API** — там нет долгоживущего процесса для опроса chain и отправки TON-транзакций.

---

## 8. Backend на Railway (рекомендуется)

### 1. Сервисы в проекте

1. **PostgreSQL** — Add → Database → PostgreSQL  
2. **API** — Add → GitHub repo (тот же репозиторий)

### 2. API service → Settings

| Поле | Значение |
|------|----------|
| **Build Command** | `npm install && npm run build:api` |
| **Start Command** | `npm run start:prod` |
| **Root Directory** | `/` (корень репо) |

Railway сам проставит `PORT`. `DATABASE_URL` — из Postgres (Variables → Reference).

### 3. Variables (API)

Скопируйте из `.env`:

```
BOT_TOKEN, BOT_USERNAME, ADMIN_TELEGRAM_IDS
WALLET_ENCRYPTION_KEY
TONAPI_KEY, TONCENTER_API_KEY
BLC_JETTON_MASTER, USDT_JETTON_MASTER
TON_NETWORK=mainnet
DEV_MODE=false
CHAIN_WEBHOOK_SECRET
DEDUST_API_URL
```

При старте API сам делает `migrate` + `seed` + создаёт server wallet (смотри лог **Server wallet: EQ...**).

### 4. Vercel → связать с API

В Vercel → Environment Variables:

```
VITE_API_URL=https://your-app.up.railway.app
```

Без слэша в конце. Redeploy фронта.

Проверка: `https://your-app.up.railway.app/api/health` → `{"status":"ok",...}`

### 5. CORS

API уже с `cors: { origin: true }` — запросы с Vercel-домена проходят.

---

## 9. Альтернативы Railway

| Платформа | Плюсы |
|-----------|--------|
| **VPS** (Hetzner, DO) | Полный контроль, docker compose как локально |
| **Render** | Web Service + Postgres, похоже на Railway |
| **Fly.io** | Docker, несколько регионов |
| **Neon + отдельный VPS** | Neon только БД, API на VPS |

Минимум на VPS: `npm run build:api && npm run start:prod` + nginx + Postgres.

---

## 10. Чеклист

- [ ] `setup:env` + ручные ключи
- [ ] Vercel: фронт, `VITE_API_URL` → Railway
- [ ] Railway: Postgres + API, env vars
- [ ] HTTPS, BotFather URL
- [ ] Launch + тест депозит/withdraw

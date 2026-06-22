# Деплой BulCoin Mini App

## Быстрый старт

```bash
npm install && cp .env.example .env
docker compose up -d
npm run db:migrate && npm run db:seed
npm run build && npm run start:prod
```

Лог при старте покажет **Server wallet: EQ...** — пополните его BLC + TON.

---

## Ключи `.env`

| Переменная | Где взять |
|------------|-----------|
| `BOT_TOKEN` | [@BotFather](https://t.me/BotFather) → `/token` |
| `BOT_USERNAME` | username бота без `@` |
| `ADMIN_TELEGRAM_IDS` | [@userinfobot](https://t.me/userinfobot) → numeric ID |
| `WALLET_ENCRYPTION_KEY` | `openssl rand -base64 32` (≥32 символов, **не менять** после создания кошелька) |
| `DATABASE_URL` | Postgres connection string |
| `TONAPI_KEY` | [tonconsole.com](https://tonconsole.com) → API Key |
| `TONCENTER_API_KEY` | [toncenter.com](https://toncenter.com) → API key |
| `BLC_JETTON_MASTER` | Адрес master BLC jetton (Tonviewer / ваш deploy) |
| `USDT_JETTON_MASTER` | USDT jetton mainnet (Tonviewer) — опционально |
| `DEDUST_API_URL` | `https://api-mainnet.dedust.io/v2` (ключ не нужен) |
| `CHAIN_WEBHOOK_SECRET` | `openssl rand -hex 24` — опционально |
| `TON_NETWORK` | `mainnet` |
| `DEV_MODE` | **`false`** в prod |

---

## Prod `.env` (минимум)

```env
BOT_TOKEN=...
BOT_USERNAME=...
ADMIN_TELEGRAM_IDS=123456789
WALLET_ENCRYPTION_KEY=...
DATABASE_URL=postgresql://...
TONAPI_KEY=...
TONCENTER_API_KEY=...
BLC_JETTON_MASTER=EQ...
TON_NETWORK=mainnet
DEV_MODE=false
```

---

## Nginx (фронт + API на одном домене)

```nginx
root /var/www/bulcoin/dist;

location /api/ { proxy_pass http://127.0.0.1:3000; }

location / { try_files $uri $uri/ /index.html; }
```

HTTPS обязателен. В BotFather → Menu Button → `https://your-domain.com`.

---

## Админка после деплоя (`/admin`)

1. **Setup** → Save jetton masters + bot username
2. Отправить на server wallet: **BLC** (≥100k по умолчанию) + **TON** (≥2–5 для gas)
3. **Sync from chain** → **Launch project**
4. **Settings → Swap router** → адреса пулов TonCo (BLC/TON, BLC/USDT) если нужен TonCo/USDT

| Настройка | Рекомендация |
|-----------|--------------|
| Strategy | `dedust_first` |
| DeDust / TonCo enabled | ✓ |
| Allow fallback | ✓ |
| TonCo pools | [app.tonco.io](https://app.tonco.io) → адрес pool в Tonviewer |

---

## Webhook (опционально, быстрее polling)

```http
POST /api/webhooks/chain/deposit
X-Webhook-Secret: <CHAIN_WEBHOOK_SECRET>
```

---

## Go-live чеклист

- [ ] `DEV_MODE=false`, `.env` не в git
- [ ] `WALLET_ENCRYPTION_KEY` сохранён отдельно
- [ ] HTTPS + BotFather Menu Button
- [ ] Sync → Launch
- [ ] Тест: депозит TON с memo → BLC на балансе
- [ ] Тест: withdraw

---

## Troubleshooting

| Проблема | Решение |
|----------|---------|
| 403 в admin | ID в `ADMIN_TELEGRAM_IDS` |
| 401 в Mini App | Открывать из Telegram, проверить `BOT_TOKEN` |
| Депозит не пришёл | Memo в комментарии, intent < 1ч, TON на gas для swap |
| Swap fail | Проверить DeDust API / TonCo pool addresses |

---

## Dev (локально)

```bash
# .env: DEV_MODE=true
npm run dev   # :5173 + :3000
```

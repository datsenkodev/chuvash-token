# BulCoin — спецификация API, экономики карточек и финансов

> Дополнение к [`FINAL_TZ.md`](./FINAL_TZ.md) и [`WORK_PLAN.md`](./WORK_PLAN.md)  
> Статус: **утверждение логики** — формулы анализатора комиссий (§6) согласуются отдельно  
> Обновлено: 2026-06-17

---

## 1. Онбординг и карточки обновлений

### 1.1. Новый пользователь

1. После первой успешной авторизации (`initData` → создание `users`):
   - Показать **цепочку onboarding-слайдов** (из react `Onbordynh` + legacy-стиль).
   - В конце — **стартовые карточки обновления** (те же, что и при релизе, см. §1.2).
2. Флаг в БД: `users.onboarding_completed_at`.
3. Повторно onboarding **не показывать**.

### 1.2. Обновление приложения

1. В админке задаётся **`app_version`** (semver) и набор **`release_cards`** (контент-карточки: что нового).
2. При входе, если `users.last_seen_app_version < app_version`:
   - Показать карточки релиза **один раз**.
   - Обновить `users.last_seen_app_version`.
3. **Новый пользователь** видит актуальные release_cards как часть первого onboarding (отдельный повтор не нужен).

### 1.3. API

| Method | Path | Описание |
|--------|------|----------|
| GET | `/api/onboarding/slides` | Слайды для нового юзера |
| GET | `/api/onboarding/release-cards` | Карточки текущей версии |
| POST | `/api/onboarding/complete` | Завершить onboarding |
| POST | `/api/onboarding/release-seen` | Отметить просмотр release cards |

---

## 2. Финансовая архитектура

### 2.1. Принцип: БД — источник истины для игроков

```
Игрок видит баланс  ←→  ledger (PostgreSQL)  ←→  сверка  ←→  серверный Web3-кошелёк
```

- **Все** операции (депозит, вывод, открытие карточки, реферал, приз) — **записи в ledger**.
- Баланс пользователя = `SUM(credits) - SUM(debits)` по `ledger_entries` (или materialized `balances`).
- Web3 используется **только** на границе: **ввод** (deposit) и **вывод** (withdraw).
- Внутри приложения — только BLC в БД (до включения multi-token режима).

### 2.2. Серверный кошелёк (hot wallet)

| Аспект | Реализация |
|--------|------------|
| Создание | При первом деплое `server` генерирует пару ключей (TON / EVM — по сети BLC) |
| Хранение | Private key **никогда** не в коде и не в логах |
| Шифрование | AES-256-GCM; ключ = `WALLET_ENCRYPTION_KEY` из env / KMS (AWS/GCP/Vault) |
| В БД | Только `wallet_address`, `encrypted_private_key`, `key_version` |
| Операции | Депозиты → мониторинг входящих tx на адрес; выводы → подпись на server |
| Лимиты | Hot wallet max balance; излишек → cold wallet (v2) |

**Инвариант сверки (cron каждые N минут):**

```
W_onchain  ≈  P_sum + pending_withdrawals + house_reserve + surplus_pool
```

где:
- `P_sum` — сумма балансов всех игроков в БД
- `pending_withdrawals` — замороженные суммы на вывод
- `house_reserve` — резерв дома (настраивается)
- `surplus_pool` = `max(0, W_onchain - P_sum - pending - reserve)` — «лишние» средства для режима раздачи

Расхождение > порога → алерт админам + пауза выводов.

### 2.3. Double-entry ledger

Таблица `ledger_entries`:

| Поле | Тип | Описание |
|------|-----|----------|
| id | uuid | |
| user_id | fk | nullable для system |
| type | enum | deposit, withdraw, card_open, card_prize, referral, admin_adjust, fee, partner_prize |
| amount | bigint | в минимальных единицах BLC (nano) |
| direction | credit/debit | |
| reference_id | uuid | card_open_id, tx_id, … |
| idempotency_key | string unique | защита от дублей |
| created_at | timestamp | |

Все мутации баланса — **в одной DB-транзакции** с row-level lock на `balances`.

---

## 3. Админка

### 3.1. Модель доступа

- Админ = пользователь с `telegram_id ∈ ADMIN_TELEGRAM_IDS` (env + таблица `admins` для runtime).
- Каждый admin-запрос:
  1. `telegramAuth` middleware (HMAC initData, свежесть ≤ 24h)
  2. Проверка `user.telegram_id` в whitelist
  3. Audit log: `admin_actions (admin_id, action, payload, ip, ts)`

**Безопасность Telegram-admin (MVP):**

| Риск | Митигация |
|------|-----------|
| Подмена initData | HMAC с `BOT_TOKEN`, reject stale |
| Компрометация аккаунта TG админа | Мин. число админов, audit, алерты на критичные изменения |
| CSRF / replay | idempotency keys, короткий TTL initData |
| Escalation | Admin routes отдельный prefix `/api/admin/*`, rate limit |

Для production v2: отдельный admin-bot + TOTP или Telegram WebApp `signature` + second factor.

### 3.2. Настройки админки (таблица `system_settings`)

| Key | Тип | Default | Описание |
|-----|-----|---------|----------|
| `withdraw_min_amount` | bigint | 1000 | Мин. вывод BLC |
| `withdraw_fee_percent` | decimal | 1.0 | Комиссия вывода % |
| `withdraw_fee_fixed` | bigint | 0 | Фикс. комиссия |
| `card_price_min` | bigint | 100 | Мин. стоимость открытия |
| `card_price_max` | bigint | 10000000 | Макс. стоимость (абсолютный потолок) |
| `card_price_balance_divisor` | int | 5 | max_price = balance / divisor |
| `casino_house_edge_percent` | decimal | 3.0 | Базовая комиссия дома (режим казино) |
| `casino_house_edge_max` | decimal | 5.0 | Потолок комиссии при росте игроков |
| `distribution_enabled` | bool | true | Авто-режим раздачи |
| `distribution_target_days` | int | 30 | Срок «слива» surplus |
| `free_card_interval_min_sec` | int | 600 | 10 мин |
| `free_card_interval_max_sec` | int | 3600 | 60 мин |
| `free_card_prize_multiplier` | decimal | 1.0 | Приз ≈ стоимость следующей платной |
| `dedust_swap_enabled` | bool | true | TON/USDT → BLC через DeDust |
| `multi_token_enabled` | bool | false | Отключить автосwap, хранить мультитокены |
| `auto_mode_enabled` | bool | true | Авто-переключение **только** distribution → casino при исчерпании surplus |
| `project_launched` | bool | false | Публичный запуск (игра доступна после admin launch) |
| `setup_min_wallet_blc` | bigint | 100000 | Мин. баланс кошелька для launch |
| `app_version` | string | 1.0.0 | Версия для release cards |

*(v2: `casino_house_edge_percent` читается из DAO on-chain голосования)*

### 3.3. Установка и первый запуск

**Порядок при деплое:**

1. `npm run db:migrate` + `ensureServerWallet()` — генерация server wallet (ключ в БД, AES-256-GCM).
2. Админ пополняет on-chain адрес кошелька (баланс раздачи / bankroll).
3. Админ фиксирует сумму: `POST /api/admin/setup/wallet-balance`.
4. Админ запускает проект: `POST /api/admin/setup/launch` → `project_launched = true`, `current_mode = distribution`.
5. До launch эндпоинты `/api/cards/*` возвращают **503** `SETUP_REQUIRED`.

**Режимы после запуска:**

| Событие | Кто | Результат |
|---------|-----|-----------|
| Первый launch | admin setup | `distribution` |
| Surplus исчерпан (S ≤ 0.5% P) | авто-анализатор | `casino` |
| Повторная раздача | **только admin** `force-mode: distribution` | `distribution`, сброс PID integral |

`DEV_MODE=true`: seed автоматически launch + тестовый wallet balance (локальная разработка).

---

## 4. Режимы карточек

### 4.1. Режим «Казино» (`casino`)

- Мат. ожидание для дома: **+r%** от оборота (`r = casino_house_edge_percent`, динамически до 5%).
- Игрок **всегда** получает приз > 0, но в среднем по сессии/попulation дом в плюсе на `r`.
- RTP игрока ≈ `100% - r`.

### 4.2. Режим «Раздача» (`distribution`)

- Тот же UI и механика открытия.
- **Отрицательный** house edge: `r_dist < 0` — дом **отдаёт** surplus игрокам.
- Цель: израсходовать `surplus_pool` за `distribution_target_days` (≈30 дней).

### 4.3. Глобальный режим (не per-user)

`system_settings.current_economy_mode`: `casino` | `distribution`  
Переключает **анализатор** (§6). Per-open расчёт использует текущий режим + partner prizes.

---

## 5. Механика карточек (Home)

### 5.1. Отображение

- На Home — **4 случайные карточки** из пула активных `card_templates`.
- У каждой свой **`open_price`** (пересчитывается per user, §5.3).
- У каждой свой **`tier`** / `card_type` — для partner prizes.

### 5.2. Приз при открытии

Параметры (server-side only):

```
base_ev   = open_price * (1 - effective_house_edge/100)
prize     = random_in_range(min_prize, max_prize)
min_prize = max(1, open_price * 0.05)
max_prize = open_price * max_win_multiplier(tier, open_price)
```

- `effective_house_edge` — из текущего режима + анализатора (§6).
- **Partner prize** (если сработал roll): добавка из `partner_prizes` (§5.5).
- Итог **всегда ≥ min_prize** (никогда «пустое» открытие).

### 5.3. Динамическая цена открытия (per user)

```
user_max = floor(balance / card_price_balance_divisor)
effective_max = min(card_price_max, user_max, balance)
effective_min = card_price_min

for each of 4 cards:
  open_price = random_in_range(effective_min, effective_max)
  (ensure 4 distinct prices if pool allows)
```

Если `balance < card_price_min`:
- Карточки disabled.
- UI: «До бесплатного открытия: {timer}» + кнопка **Пополнить**.
- Timer из `free_card_state.next_available_at`.

### 5.4. Бесплатное открытие

- Интервал: random ∈ `[free_card_interval_min_sec, free_card_interval_max_sec]` после каждого бесплатного/платного открытия (настраивается).
- Приз бесплатной карточки:

```
free_prize_target = next_cheapest_paid_card_price(user) * free_card_prize_multiplier
```

- Таймер на Home: `GET /api/cards/free-timer` → `{ next_available_at, seconds_left }`.

### 5.5. Партнёрские призы (админка)

Таблица `partner_prizes`:

| Поле | Описание |
|------|----------|
| name | Название |
| prize_type | blc / external_coupon / nft_meta |
| value_blc | сумма или эквивалент |
| trigger_percent | % шанс при открытии |
| card_type_filter | null = все типы, или `tier_a`, `tier_b`, … |
| is_active | |

При открытии: независимый roll на каждый подходящий partner_prize; запись в `partner_prize_wins`.

---

## 6. Авто-анализатор режима и комиссий

> **Утверждено:** гибрид **B + C** (§6.7) + **ratchet** для casino-комиссии (только рост, без отката).  
> Статус реализации: **код в `server/src/services/economy.service.ts`**

### 6.1. Входные переменные (каждые 5–15 мин, cron)

| Symbol | Источник |
|--------|----------|
| `W` | On-chain баланс server wallet |
| `P` | `SUM(user.balance)` |
| `S` | `max(0, W - P - pending_withdrawals - reserve)` — surplus |
| `N` | Активные игроки (≥1 open за 7d) |
| `N7` | Новые регистрации за 7d |
| `G` | `(N7 - N7_prev) / max(N7_prev, 1)` — тренд роста |
| `V` | Daily volume (сумма open_price за 24h) |
| `T` | `distribution_target_days` (30) |

### 6.2. Выбор режима

**Старт:** после install/launch — всегда **`distribution`**. Процент раздачи считается по формулам B+C (§6.7.3) от surplus кошелька.

**Автоматика (односторонняя):**

```
if mode == distribution and S <= P * surplus_low_ratio:   # default 0.005
  mode = casino
```

**В distribution автоматически не переключаемся** — только вручную через admin:

```
POST /api/admin/economy/force-mode  { "mode": "distribution" }
```

*(Параметр `surplus_threshold_ratio` больше не используется для auto-switch; может применяться в tuning/PID.)*

### 6.3. Вариант A — линейный drain (простой)

**Distribution:**

```
daily_surplus_budget = S / T
r_dist = -100 * min(daily_surplus_budget / max(V, ε), 0.5)   # cap -50% edge
```

**Casino (при G > 0):**

```
r_casino = min(casino_house_edge_max, casino_house_edge_base + k_growth * G)
```
`k_growth` ≈ 2–5 (подбирается симуляцией).

### 6.4. Вариант B — с учётом числа игроков (рекомендуемый черновик)

**Distribution:**

```
surplus_ratio = S / max(P, 1)
players_factor = sqrt(N) / sqrt(N_ref)     # N_ref = 100 baseline
daily_budget = S / T
r_dist = -100 * (daily_budget / max(V, ε)) * players_factor
r_dist = clamp(r_dist, -50, 0)
```

Больше игроков → чуть агрессивнее раздача при том же S.

**Casino → повышение комиссии:**

```
if mode == casino and G > 0.05:
  r_casino = min(casino_house_edge_max,
                 casino_house_edge_base + (casino_house_edge_max - base) * (1 - exp(-λ * G)))
else:
  r_casino = casino_house_edge_base
```

`λ` ≈ 3–7. Плавный рост до 5% при устойчивом притоке игроков.

### 6.5. Вариант C — PID-контроллер surplus (научный)

Цель: `S_target = P * reserve_ratio` (e.g. 1–3% of P).

```
error = S - S_target
integral += error * dt
r_adjust = Kp*error/P + Ki*integral/P + Kd*(d_error/dt)/P

if error > 0:  mode = distribution, r_effective = -clamp(r_adjust, 0, 50)
else:          mode = casino,       r_effective = clamp(r_adjust, base, 5)
```

Требует tuning Kp, Ki, Kd на симуляторе исторических данных.

### 6.6. Параметры по умолчанию (tuning)

| Параметр | Default | Описание |
|----------|---------|----------|
| `surplus_threshold_ratio` | 0.02 | distribution if S > 2% P |
| `surplus_low_ratio` | 0.005 | casino if S < 0.5% P |
| `S_target` | P × 0.02 | целевой surplus для PID (2% P) |
| `distribution_target_days` | 30 | T |
| `N_ref` | 100 | baseline для √N |
| `G_min_growth` | 0.02 | рост комиссии только если G ≥ 2% |
| `λ` | 5 | скорость роста r по G (вариант B) |
| `Kp` | 8 | PID пропорциональный gain (вариант C) |
| `Ki` | 0.5 | PID интегральный gain |
| `casino_house_edge_base` | 3% | стартовая комиссия |
| `casino_house_edge_max` | 5% | потолок ratchet |
| `analyzer_interval_min` | 10 | пересчёт каждые 10 мин |

**Deliverable перед кодом:** симулятор 30 дней × 3 сценария (рост / стагнация / отток N).

---

### 6.7. Утверждённая модель: B + C + ratchet (casino)

#### 6.7.1. Persisted state (PostgreSQL `economy_state`)

| Поле | Описание |
|------|----------|
| `r_casino_locked` | **Текущая casino-комиссия %** — ratchet, только ↑ |
| `current_mode` | `casino` \| `distribution` (default **`distribution`**) |
| `surplus_integral` | накопитель для PID (вариант C) |
| `last_analyzed_at` | timestamp |

Инициализация: `r_casino_locked = casino_house_edge_base` (3%).

#### 6.7.2. Шаг 1 — режим

```
# Старт после launch: mode = distribution (persisted)
# Auto: distribution → casino when surplus depleted
if mode == distribution and S <= P * surplus_low_ratio → mode = casino
# Return to distribution: admin force-mode only (§6.2)
```

#### 6.7.3. Шаг 2 — distribution (B + C)

**База от B** (drain surplus с учётом игроков):

```
daily_budget   = S / T
players_factor = sqrt(N / N_ref)
r_dist_b       = -100 * (daily_budget / max(V, ε)) * players_factor
```

**Коррекция от C** (PID по surplus — усилить раздачу, если S сильно выше цели):

```
error           = S - S_target
surplus_integral += error * dt_hours
r_pid           = -Kp * (error / P) * 100 - Ki * (surplus_integral / P) * 100
r_pid           = min(r_pid, 0)    # PID только увеличивает щедрость (более отрицательный r)
```

**Итог distribution:**

```
r_effective = clamp(r_dist_b + r_pid, -50, 0)
```

> В режиме distribution r **может** меняться в обе стороны tick-to-tick (surplus меняется).  
> **Ratchet** применяется **только** к casino-комиссии (§6.7.4).

#### 6.7.4. Шаг 3 — casino + ratchet (только рост, без отката)

**Кандидат на повышение** (вариант B, только при росте игроков):

```
if G >= G_min_growth:
  r_candidate = base + (max - base) * (1 - exp(-λ * G))
else:
  r_candidate = null   # сигнал «не повышать»
```

**Ratchet (правило заказчика):**

```
if G >= G_min_growth and r_candidate != null:
  r_casino_locked = min(max, max(r_casino_locked, r_candidate))
# иначе: r_casino_locked не меняется (ни вверх принудительно, ни вниз — никогда)

r_effective = r_casino_locked
```

| Ситуация | Поведение r_casino_locked |
|----------|---------------------------|
| G ≥ 2% (рост игроков) | может **вырасти** до min(r_candidate, 5%) |
| G < 2% (стагнация) | **заморожен** на текущем значении |
| G < 0 (отток) | **заморожен**, не падает |
| Переключение distribution → casino | продолжаем с **сохранённого** r_casino_locked |
| Admin reset | только `POST /api/admin/economy/reset-r-casino` |

**Пример:**

```
День 1:  G=0%   → r_locked = 3.0%
День 10: G=15%  → r_candidate≈3.9% → r_locked = 3.9%
День 20: G=30%  → r_candidate≈4.5% → r_locked = 4.5%
День 30: G=0%   → r_locked = 4.5%  (не падает до 3%)
День 40: G=-10% → r_locked = 4.5%  (отток — всё равно не падает)
```

#### 6.7.5. Сводная блок-схема

```
cron tick
  → W, P, S, N, V, G
  → mode (distribution→casino if surplus low; distribution entry = admin only)
  → if distribution: r_eff = B_drain + C_PID (clamp −50..0)
  → if casino:
       if G >= G_min: r_locked = max(r_locked, r_candidate(G))
       r_eff = r_locked
  → save economy_state, economy_snapshots
  → card opens use r_eff
```

#### 6.7.6. Отличие от черновиков §6.3–6.5

| Было (B черновик) | Стало (утверждено) |
|-------------------|---------------------|
| r_casino = base при G < 5% | r_casino = **r_locked** (не base) |
| r мог бы «откатиться» при падении G | **ratchet** — только ↑ |
| distribution только B | **B + C PID** по surplus |
| — | `r_casino_locked` в БД |

---

## 7. Депозиты и выводы

### 7.1. Пополнение BLC (native)

1. User → `POST /api/deposits/intent` → `{ deposit_address, memo/tag, expires_at }`.
2. Chain watcher / webhook фиксирует tx → `ledger credit` + notify user.
3. Idempotency по `tx_hash`.

### 7.2. Пополнение TON / USDT

1. User выбирает валюту → intent с адресом server wallet.
2. После подтверждения tx:
   - If `dedust_swap_enabled`: DeDust API swap → BLC → credit user BLC balance.
   - Else: credit internal balance in TON/USDT (`multi_token_enabled`).
3. Курс: DeDust quote + slippage limit из админки.

### 7.3. Вывод

1. `POST /api/withdrawals` — сумма, адрес кошелька.
2. Validations:
   - `amount >= withdraw_min_amount`
   - `amount + fee <= balance`
   - rate limit, daily cap per user
   - KYC flags (v2)
3. Freeze суммы в ledger → queue → server sign tx → on success `debit` + fee to house.
4. Fee: `withdraw_fee_percent` + `withdraw_fee_fixed` из админки.

---

## 8. Полная спецификация API

### 8.1. Auth

Все `/api/*` кроме `/api/health`, `/api/webhooks/*`:

```
Header: X-Telegram-Init-Data: <query string>
```

Admin: дополнительно `telegram_id ∈ admins`.

### 8.2. Public / User API

#### Users & profile

| Method | Path | Body | Response |
|--------|------|------|----------|
| GET | `/api/health` | — | `{ status, version }` |
| GET | `/api/users/me` | — | profile, level, xp, flags |
| PATCH | `/api/users/me` | `{ bio? }` | updated profile |
| GET | `/api/users/me/balance` | — | `{ blc, pending_withdrawal }` |

#### Onboarding

| Method | Path | Description |
|--------|------|-------------|
| GET | `/api/onboarding/status` | `{ needs_onboarding, needs_release_cards }` |
| GET | `/api/onboarding/slides` | slides[] |
| GET | `/api/onboarding/release-cards` | cards[] |
| POST | `/api/onboarding/complete` | mark onboarding done |
| POST | `/api/onboarding/release-seen` | mark version seen |

#### Cards (core)

| Method | Path | Description |
|--------|------|-------------|
| GET | `/api/cards/home` | 4 cards: `{ id, type, cover, open_price, tier }` |
| GET | `/api/cards/free-timer` | `{ next_available_at, seconds_left, can_open_free }` |
| POST | `/api/cards/open` | `{ card_id, is_free?: bool }` → prize, new balance |
| GET | `/api/cards/history` | paginated opens |

#### Deposits

| Method | Path | Description |
|--------|------|-------------|
| GET | `/api/deposits/methods` | `[blc, ton, usdt]` + flags |
| POST | `/api/deposits/intent` | `{ currency, amount? }` → address, memo |
| GET | `/api/deposits/:id/status` | pending/confirmed |

#### Withdrawals

| Method | Path | Description |
|--------|------|-------------|
| GET | `/api/withdrawals/limits` | min, fee%, fee fixed, daily cap |
| POST | `/api/withdrawals` | `{ amount, address }` |
| GET | `/api/withdrawals/history` | list |

#### Referrals

| Method | Path | Description |
|--------|------|-------------|
| GET | `/api/referrals` | link, friends[], earned |
| POST | `/api/referrals/claim` | claim bonus |

#### Exchange rates (DeDust)

| Method | Path | Description |
|--------|------|-------------|
| GET | `/api/rates/quote` | `?from=TON&to=BLC&amount=` |

#### Config (read-only for client)

| Method | Path | Description |
|--------|------|-------------|
| GET | `/api/config/public` | card limits, intervals, feature flags, `projectLaunched` |

### 8.3. Admin API (`/api/admin/*`)

| Method | Path | Description |
|--------|------|-------------|
| GET | `/api/admin/settings` | all system_settings |
| PATCH | `/api/admin/settings` | partial update |
| GET | `/api/admin/economy/state` | W, P, S, mode, r_effective, N, G |
| POST | `/api/admin/economy/force-mode` | `{ mode }` — **единственный** способ вернуть `distribution` |
| POST | `/api/admin/economy/reset-r-casino` | сброс `r_casino_locked` → base (admin only) |
| GET | `/api/admin/setup/status` | wallet address, balances, `canLaunch`, инструкции |
| POST | `/api/admin/setup/wallet-balance` | `{ walletBalanceBlc }` — после on-chain пополнения |
| POST | `/api/admin/setup/launch` | первый публичный запуск (distribution mode) |
| CRUD | `/api/admin/card-templates` | card pool |
| CRUD | `/api/admin/partner-prizes` | partner prizes |
| CRUD | `/api/admin/onboarding/slides` | |
| CRUD | `/api/admin/onboarding/release-cards` | |
| CRUD | `/api/admin/admins` | telegram_ids |
| GET | `/api/admin/ledger/export` | audit |
| GET | `/api/admin/reconciliation` | W vs P report |
| POST | `/api/admin/users/:id/adjust-balance` | manual adjust + reason |

### 8.4. Webhooks

| Method | Path | Description |
|--------|------|-------------|
| POST | `/api/webhooks/chain/deposit` | internal / TonAPI / Alchemy |
| POST | `/api/webhooks/dedust` | swap completion (if applicable) |

---

## 9. Схема БД (расширенная)

```sql
-- Core
users (id, telegram_id, username, bio, level, xp, onboarding_completed_at, last_seen_app_version, created_at)
admins (telegram_id, role, created_at)
balances (user_id, blc_amount, updated_at)  -- или только ledger

ledger_entries (...)

-- Cards
card_templates (id, name, tier, card_type, cover_url, weight, is_active)
card_opens (id, user_id, card_template_id, open_price, prize_amount, is_free, economy_mode, partner_prize_id, idempotency_key, created_at)
free_card_state (user_id, next_available_at, last_interval_sec)

-- Partner
partner_prizes (...)
partner_prize_wins (...)

-- Finance
deposits (id, user_id, currency, amount, tx_hash, status, dedust_route_id, ...)
withdrawals (id, user_id, amount, fee, address, status, tx_hash, ...)
server_wallet (address, encrypted_private_key, key_version)

-- Economy
system_settings (key, value, updated_at, updated_by)
economy_state (r_casino_locked, current_mode, surplus_integral, last_analyzed_at)
economy_snapshots (ts, W, P, S, N, G, V, mode, r_effective, r_casino_locked)  -- аудит

-- Onboarding
onboarding_slides (sort, title, body, image_url, is_active)
release_cards (app_version, sort, title, body, image_url)

-- Referrals
referrals (referrer_id, referred_id, bonus_amount, claimed_at)

-- Admin audit
admin_actions (...)
```

---

## 10. Server modules (структура кода)

```
server/src/
├── services/
│   ├── ledger.service.ts       # double-entry, locks
│   ├── wallet.service.ts       # encrypt/decrypt, sign tx
│   ├── card.service.ts           # open, prize calc, free timer
│   ├── economy.analyzer.ts     # §6 cron logic
│   ├── deposit.service.ts      # intents, chain watch
│   ├── withdraw.service.ts     # queue, fees
│   ├── dedust.service.ts       # swap TON/USDT → BLC
│   ├── referral.service.ts
│   └── reconciliation.service.ts
├── jobs/
│   ├── economy-analyzer.job.ts
│   ├── chain-watcher.job.ts
│   └── reconciliation.job.ts
```

---

## 11. Аудит: взломоустойчивость и bug bounty / abuse

> Выполняется **перед production** и после каждого релиза с финансовой логикой.

### 11.1. Threat model

| Угроза | Вектор |
|--------|--------|
| Подделка баланса | API без auth, race on open |
| Double spend | Параллельные open/withdraw |
| Prize manipulation | Client-side RNG |
| Admin impersonation | Stolen initData admin TG |
| Key theft | Leaked env, logs |
| Deposit fake | Spoof webhook |
| Referral farming | Sybil accounts |
| Free card abuse | Timer bypass, timezone |
| Price manipulation | Client sends open_price |
| Withdraw drain | No limits, no reconciliation pause |

### 11.2. Обязательные контрмеры

- [ ] RNG и **весь prize calc только server-side**
- [ ] `open_price` **пересчитывается server** при open (не доверять client)
- [ ] Idempotency-Key на open, withdraw, deposit credit
- [ ] Serializable / `SELECT FOR UPDATE` на balance при мутациях
- [ ] Rate limits: open/min, withdraw/day, deposit intents/hour
- [ ] Withdraw cooldown после deposit (configurable)
- [ ] Reconciliation pause if `|W - expected| > threshold`
- [ ] Admin actions immutable audit log
- [ ] Secrets rotation procedure documented
- [ ] No private keys in CI logs, Sentry, client bundle

### 11.3. Abuse scenarios (тест-кейсы)

1. Два параллельных `POST /cards/open` при balance = 1× price → только один успех.
2. Replay `initData` старше 24h → 401.
3. Подмена `card_id` на дорогую при низком balance → 402.
4. Free open до `next_available_at` → 403.
5. Withdraw ниже min / выше balance → 400.
6. Накрутка referral self-refer → blocked by telegram_id uniqueness + device heuristics (v2).
7. Fuzz admin endpoints без admin id → 403.
8. SQL injection / oversized payload → rejected.

### 11.4. Deliverables аудита

- [ ] Checklist §11.2 signed off
- [ ] Pen-test report (internal or external)
- [ ] Economy simulator runs 10k users × 30 days — house not bankrupt, S drains as expected
- [ ] Runbook: incident response (pause withdraw, freeze mode)

---

## 12. Обновление плана работ (новые этапы)

| Этап | Содержание |
|------|------------|
| **2b** | Cards API + Home UI (4 cards, open, free timer) |
| **3b** | Economy analyzer (вариант после согласования §6) |
| **3c** | Deposits BLC + chain watcher |
| **3d** | DeDust TON/USDT (feature flag) |
| **3e** | Withdrawals + fees + min |
| **4b** | Admin API + TG whitelist |
| **5** | Onboarding + release cards |
| **7** | Security audit §11 |

---

## 13. Принятые решения (дополнение)

| Тема | Решение |
|------|---------|
| Онбординг | 1 раз новому юзеру + release cards при обновлении (новому — как стартовые) |
| Баланс | Только из БД (ledger) |
| Web3 | Только deposit/withdraw на server wallet |
| Ключи | Encrypted at rest, env/KMS |
| Admin | Telegram ID whitelist + audit |
| Карточки | 4 random, casino/distribution, auto analyzer |
| Free card | 10–60 min (admin), prize ≈ 1 paid open |
| Цена open | min–max admin, max ≤ balance/5 |
| Пополнение | BLC, TON, USDT (+ DeDust, отключаемо) |
| Формулы analyzer | **B + C + ratchet** (§6.7), casino r только ↑ при G ≥ 2% |

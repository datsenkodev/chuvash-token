CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- BulCoin schema

CREATE TABLE IF NOT EXISTS users (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  telegram_id BIGINT UNIQUE NOT NULL,
  username TEXT,
  first_name TEXT,
  last_name TEXT,
  bio TEXT DEFAULT '',
  level INT DEFAULT 1,
  xp BIGINT DEFAULT 0,
  onboarding_completed_at TIMESTAMPTZ,
  last_seen_app_version TEXT DEFAULT '0.0.0',
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS admins (
  telegram_id BIGINT PRIMARY KEY,
  role TEXT DEFAULT 'admin',
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS balances (
  user_id UUID PRIMARY KEY REFERENCES users(id),
  blc_amount BIGINT NOT NULL DEFAULT 0,
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS ledger_entries (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES users(id),
  type TEXT NOT NULL,
  amount BIGINT NOT NULL,
  direction TEXT NOT NULL CHECK (direction IN ('credit', 'debit')),
  reference_id UUID,
  idempotency_key TEXT UNIQUE,
  meta JSONB DEFAULT '{}',
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS system_settings (
  key TEXT PRIMARY KEY,
  value JSONB NOT NULL,
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  updated_by BIGINT
);

CREATE TABLE IF NOT EXISTS economy_state (
  id INT PRIMARY KEY DEFAULT 1 CHECK (id = 1),
  r_casino_locked NUMERIC(6, 3) NOT NULL DEFAULT 3.0,
  current_mode TEXT NOT NULL DEFAULT 'distribution',
  surplus_integral NUMERIC(20, 4) NOT NULL DEFAULT 0,
  wallet_balance_blc BIGINT NOT NULL DEFAULT 0,
  last_analyzed_at TIMESTAMPTZ,
  n7_prev BIGINT DEFAULT 0
);

INSERT INTO economy_state (id) VALUES (1) ON CONFLICT DO NOTHING;

CREATE TABLE IF NOT EXISTS economy_snapshots (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  ts TIMESTAMPTZ DEFAULT NOW(),
  w_blc BIGINT,
  p_blc BIGINT,
  s_blc BIGINT,
  n_active INT,
  g_growth NUMERIC(10, 4),
  v_daily BIGINT,
  mode TEXT,
  r_effective NUMERIC(8, 3),
  r_casino_locked NUMERIC(6, 3)
);

CREATE TABLE IF NOT EXISTS card_templates (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  tier TEXT NOT NULL DEFAULT 'standard',
  card_type TEXT NOT NULL DEFAULT 'default',
  cover_url TEXT,
  weight INT DEFAULT 1,
  max_win_multiplier NUMERIC(6, 2) DEFAULT 3.0,
  is_active BOOLEAN DEFAULT TRUE
);

CREATE TABLE IF NOT EXISTS card_opens (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES users(id),
  card_template_id UUID REFERENCES card_templates(id),
  open_price BIGINT NOT NULL,
  prize_amount BIGINT NOT NULL,
  is_free BOOLEAN DEFAULT FALSE,
  economy_mode TEXT,
  partner_prize_id UUID,
  idempotency_key TEXT UNIQUE,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS free_card_state (
  user_id UUID PRIMARY KEY REFERENCES users(id),
  next_available_at TIMESTAMPTZ NOT NULL,
  last_interval_sec INT
);

CREATE TABLE IF NOT EXISTS partner_prizes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  prize_type TEXT DEFAULT 'blc',
  value_blc BIGINT NOT NULL,
  trigger_percent NUMERIC(6, 3) NOT NULL,
  card_type_filter TEXT,
  is_active BOOLEAN DEFAULT TRUE
);

CREATE TABLE IF NOT EXISTS partner_prize_wins (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES users(id),
  partner_prize_id UUID REFERENCES partner_prizes(id),
  card_open_id UUID REFERENCES card_opens(id),
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS referrals (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  referrer_id UUID NOT NULL REFERENCES users(id),
  referred_id UUID NOT NULL REFERENCES users(id) UNIQUE,
  bonus_amount BIGINT DEFAULT 500,
  claimed_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS deposits (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES users(id),
  currency TEXT NOT NULL,
  amount BIGINT NOT NULL,
  amount_nano BIGINT,
  expected_blc BIGINT,
  memo TEXT,
  blc_credited BIGINT,
  tx_hash TEXT UNIQUE,
  status TEXT DEFAULT 'pending',
  quote_source TEXT,
  expires_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS withdrawals (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES users(id),
  amount BIGINT NOT NULL,
  fee BIGINT NOT NULL DEFAULT 0,
  address TEXT NOT NULL,
  status TEXT DEFAULT 'pending',
  tx_hash TEXT,
  error_message TEXT,
  processed_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS chain_state (
  id INT PRIMARY KEY DEFAULT 1 CHECK (id = 1),
  last_event_id TEXT,
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

INSERT INTO chain_state (id) VALUES (1) ON CONFLICT DO NOTHING;

CREATE TABLE IF NOT EXISTS server_wallet (
  id INT PRIMARY KEY DEFAULT 1 CHECK (id = 1),
  address TEXT,
  encrypted_private_key TEXT,
  key_version INT DEFAULT 1,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS onboarding_slides (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  sort_order INT NOT NULL,
  title TEXT,
  body TEXT,
  image_url TEXT,
  is_active BOOLEAN DEFAULT TRUE
);

CREATE TABLE IF NOT EXISTS release_cards (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  app_version TEXT NOT NULL,
  sort_order INT NOT NULL,
  title TEXT,
  body TEXT,
  image_url TEXT,
  is_active BOOLEAN DEFAULT TRUE
);

CREATE TABLE IF NOT EXISTS admin_actions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  admin_telegram_id BIGINT NOT NULL,
  action TEXT NOT NULL,
  payload JSONB,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_card_opens_user ON card_opens(user_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_ledger_user ON ledger_entries(user_id, created_at DESC);

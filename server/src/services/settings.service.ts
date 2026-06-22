import { query } from '../db/pool.js'

const DEFAULTS: Record<string, unknown> = {
  withdraw_min_amount: 1000,
  withdraw_fee_percent: 1.0,
  withdraw_fee_fixed: 0,
  card_price_min: 100,
  card_price_max: 10000000,
  card_price_balance_divisor: 5,
  casino_house_edge_base: 3.0,
  casino_house_edge_max: 5.0,
  surplus_threshold_ratio: 0.02,
  surplus_low_ratio: 0.005,
  distribution_target_days: 30,
  n_ref: 100,
  g_min_growth: 0.02,
  lambda_growth: 5,
  kp_pid: 8,
  ki_pid: 0.5,
  s_target_ratio: 0.02,
  free_card_interval_min_sec: 600,
  free_card_interval_max_sec: 3600,
  free_card_prize_multiplier: 1.0,
  dedust_swap_enabled: true,
  multi_token_enabled: false,
  auto_mode_enabled: true,
  project_launched: false,
  setup_min_wallet_blc: 100000,
  app_version: '1.0.0',
  pending_withdrawals_reserve: 0,
  house_reserve_blc: 0,
  blc_jetton_master: '',
  usdt_jetton_master: '',
  blc_jetton_decimals: 9,
  bot_username: '',
  deposit_slippage_percent: 2,
  dedust_slippage_bps: 100,
  tonco_slippage_bps: 100,
  tonco_swap_enabled: true,
  tonco_blc_pool_address: '',
  tonco_blc_ton_pool: '',
  tonco_blc_usdt_pool: '',
  tonco_router_address: 'EQC_-t0nCnOFMdp7E7qPxAOCbCWGFz-e3pwxb6tTvFmshjt5',
  swap_router_strategy: 'dedust_first',
  swap_allow_tonco_fallback: true,
  dedust_max_splits: 4,
  dedust_max_length: 3,
  withdraw_min_ton_reserve: 1,
  withdraw_ton_refill_target: 10,
  withdraw_gas_ton_estimate: 0.08,
  withdraw_fee_gas_multiplier: 2,
}

export async function getSetting<T = unknown>(key: string): Promise<T> {
  const res = await query<{ value: T }>(`SELECT value FROM system_settings WHERE key = $1`, [key])
  if (res.rows[0]) return res.rows[0].value
  return DEFAULTS[key] as T
}

export async function getSettings(): Promise<Record<string, unknown>> {
  const res = await query<{ key: string; value: unknown }>(`SELECT key, value FROM system_settings`)
  const out = { ...DEFAULTS }
  for (const row of res.rows) out[row.key] = row.value
  return out
}

export async function setSetting(key: string, value: unknown, adminId?: number) {
  await query(
    `INSERT INTO system_settings (key, value, updated_at, updated_by) VALUES ($1, $2, NOW(), $3)
     ON CONFLICT (key) DO UPDATE SET value = EXCLUDED.value, updated_at = NOW(), updated_by = EXCLUDED.updated_by`,
    [key, JSON.stringify(value), adminId ?? null],
  )
}

export async function getNumericSetting(key: string): Promise<number> {
  const v = await getSetting<number>(key)
  return Number(v)
}

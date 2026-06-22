import { query } from '../db/pool.js'
import { getNumericSetting, getSetting } from './settings.service.js'
import { getTotalPlayerBalances } from './ledger.service.js'
import { getPendingWithdrawalsReserve } from './deposit.service.js'

export type EconomyMode = 'casino' | 'distribution'

export interface EconomyResult {
  mode: EconomyMode
  rEffective: number
  rCasinoLocked: number
  wBlc: bigint
  pBlc: bigint
  sBlc: bigint
  nActive: number
  gGrowth: number
  vDaily: bigint
}

async function getDailyVolume(): Promise<bigint> {
  const res = await query<{ sum: string }>(
    `SELECT COALESCE(SUM(open_price), 0) as sum FROM card_opens WHERE created_at > NOW() - INTERVAL '24 hours' AND is_free = false`,
  )
  return BigInt(res.rows[0].sum)
}

async function getActivePlayers(): Promise<number> {
  const res = await query<{ count: string }>(
    `SELECT COUNT(DISTINCT user_id) as count FROM card_opens WHERE created_at > NOW() - INTERVAL '7 days'`,
  )
  return parseInt(res.rows[0].count, 10)
}

async function getNewUsers7d(): Promise<number> {
  const res = await query<{ count: string }>(
    `SELECT COUNT(*) as count FROM users WHERE created_at > NOW() - INTERVAL '7 days'`,
  )
  return parseInt(res.rows[0].count, 10)
}

function computeRCandidate(g: number, base: number, max: number, lambda: number, gMin: number): number | null {
  if (g < gMin) return null
  return base + (max - base) * (1 - Math.exp(-lambda * g))
}

export async function runEconomyAnalyzer(): Promise<EconomyResult> {
  const state = await query<{
    r_casino_locked: string
    current_mode: EconomyMode
    surplus_integral: string
    wallet_balance_blc: string
    n7_prev: string
    last_analyzed_at: Date | null
  }>(`SELECT * FROM economy_state WHERE id = 1`)

  const row = state.rows[0]
  let rLocked = parseFloat(row.r_casino_locked)
  let mode = row.current_mode
  let surplusIntegral = parseFloat(row.surplus_integral)

  const base = await getNumericSetting('casino_house_edge_base')
  const max = await getNumericSetting('casino_house_edge_max')
  const surplusLow = await getNumericSetting('surplus_low_ratio')
  const T = await getNumericSetting('distribution_target_days')
  const nRef = await getNumericSetting('n_ref')
  const gMin = await getNumericSetting('g_min_growth')
  const lambda = await getNumericSetting('lambda_growth')
  const kp = await getNumericSetting('kp_pid')
  const ki = await getNumericSetting('ki_pid')
  const sTargetRatio = await getNumericSetting('s_target_ratio')
  const houseReserve = BigInt(await getNumericSetting('house_reserve_blc'))
  const pendingReserve = await getPendingWithdrawalsReserve()

  const pBlc = await getTotalPlayerBalances()
  const wBlc = BigInt(row.wallet_balance_blc)
  const sBlc = wBlc > pBlc + pendingReserve + houseReserve ? wBlc - pBlc - pendingReserve - houseReserve : 0n

  const pNum = Number(pBlc) || 1
  const sNum = Number(sBlc)

  // Mode: distribution → casino only when surplus is depleted (automatic).
  // Return to distribution — admin only (force-mode), never automatic.
  if (mode === 'distribution' && sNum <= pNum * surplusLow) {
    mode = 'casino'
  }

  const nActive = await getActivePlayers()
  const n7 = await getNewUsers7d()
  const n7Prev = parseInt(row.n7_prev || '0', 10) || 1
  const gGrowth = (n7 - n7Prev) / Math.max(n7Prev, 1)

  const vDaily = await getDailyVolume()
  const vNum = Number(vDaily) || 1

  let rEffective: number

  if (mode === 'distribution') {
    const dailyBudget = sNum / T
    const playersFactor = Math.sqrt(nActive / nRef)
    const rDistB = -100 * (dailyBudget / vNum) * playersFactor

    const sTarget = pNum * sTargetRatio
    const error = sNum - sTarget
    const dtHours = row.last_analyzed_at
      ? (Date.now() - new Date(row.last_analyzed_at).getTime()) / 3600000
      : 1
    surplusIntegral += error * dtHours
    const rPid = -kp * (error / pNum) * 100 - ki * (surplusIntegral / pNum) * 100
    const rPidClamped = Math.min(rPid, 0)

    rEffective = Math.max(-50, Math.min(0, rDistB + rPidClamped))
  } else {
    const rCandidate = computeRCandidate(gGrowth, base, max, lambda, gMin)
    if (rCandidate !== null) {
      rLocked = Math.min(max, Math.max(rLocked, rCandidate))
    }
    rEffective = rLocked
  }

  await query(
    `UPDATE economy_state SET
      r_casino_locked = $1, current_mode = $2, surplus_integral = $3,
      n7_prev = $4, last_analyzed_at = NOW()
     WHERE id = 1`,
    [rLocked, mode, surplusIntegral, n7],
  )

  await query(
    `INSERT INTO economy_snapshots (w_blc, p_blc, s_blc, n_active, g_growth, v_daily, mode, r_effective, r_casino_locked)
     VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)`,
    [
      wBlc.toString(),
      pBlc.toString(),
      sBlc.toString(),
      nActive,
      gGrowth,
      vDaily.toString(),
      mode,
      rEffective,
      rLocked,
    ],
  )

  return {
    mode,
    rEffective,
    rCasinoLocked: rLocked,
    wBlc,
    pBlc,
    sBlc,
    nActive,
    gGrowth,
    vDaily,
  }
}

export async function getCurrentEconomy(): Promise<{ mode: EconomyMode; rEffective: number }> {
  const state = await query<{ current_mode: EconomyMode; r_casino_locked: string }>(
    `SELECT current_mode, r_casino_locked FROM economy_state WHERE id = 1`,
  )
  const mode = state.rows[0]?.current_mode ?? 'distribution'
  const r =
    mode === 'casino'
      ? parseFloat(state.rows[0]?.r_casino_locked ?? '3')
      : await getLastSnapshotREffective()
  return { mode, rEffective: r }
}

async function getLastSnapshotREffective(): Promise<number> {
  const res = await query<{ r_effective: string }>(
    `SELECT r_effective FROM economy_snapshots ORDER BY ts DESC LIMIT 1`,
  )
  return parseFloat(res.rows[0]?.r_effective ?? '-2')
}

export async function resetRCasinoLocked() {
  const base = await getNumericSetting('casino_house_edge_base')
  await query(`UPDATE economy_state SET r_casino_locked = $1 WHERE id = 1`, [base])
}

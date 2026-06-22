import { query, withTransaction } from '../db/pool.js'
import { env } from '../config/env.js'
import { getBalance, transferCredit, debit } from './ledger.service.js'
import { getSetting, getNumericSetting } from './settings.service.js'
import { validateWithdrawAddress, getUserPendingWithdrawalTotal } from './withdraw.service.js'
import { calculateWithdrawFee, previewWithdrawFee } from './gas.service.js'

export async function getUserProfile(userId: string) {
  const res = await query<{
    id: string
    telegram_id: string
    username: string | null
    first_name: string | null
    last_name: string | null
    bio: string | null
    level: number
    xp: number
    onboarding_completed_at: Date | null
    last_seen_app_version: string | null
  }>(`SELECT * FROM users WHERE id = $1`, [userId])
  return res.rows[0]
}

export async function updateBio(userId: string, bio: string) {
  await query(`UPDATE users SET bio = $2 WHERE id = $1`, [userId, bio.slice(0, 500)])
}

export async function getReferrals(userId: string, telegramId: number) {
  const friends = await query<{
    first_name: string | null
    username: string | null
    blc_amount: string
  }>(
    `SELECT u.first_name, u.username, b.blc_amount
     FROM referrals r
     JOIN users u ON u.id = r.referred_id
     JOIN balances b ON b.user_id = u.id
     WHERE r.referrer_id = $1`,
    [userId],
  )
  const botName =
    String(await getSetting('bot_username')) || process.env.BOT_USERNAME || env.BOT_USERNAME || 'your_bot'
  const link = `https://t.me/${botName.replace('@', '')}?start=${telegramId}`
  return {
    link,
    friends: friends.rows.map(f => ({
      name: f.first_name || f.username || 'User',
      balance: parseInt(f.blc_amount, 10),
    })),
    bonusPerReferral: 500,
  }
}

export async function claimReferralBonus(userId: string) {
  const unclaimed = await query<{ id: string; bonus_amount: string }>(
    `SELECT id, bonus_amount FROM referrals WHERE referrer_id = $1 AND claimed_at IS NULL`,
    [userId],
  )
  let total = 0n
  for (const row of unclaimed.rows) {
    total += BigInt(row.bonus_amount)
    await query(`UPDATE referrals SET claimed_at = NOW() WHERE id = $1`, [row.id])
  }
  if (total > 0n) {
    await transferCredit(userId, total, 'referral')
  }
  return Number(total)
}

export async function createWithdrawal(userId: string, amount: number, address: string) {
  const min = await getNumericSetting('withdraw_min_amount')

  if (amount < min) throw new Error(`Minimum withdrawal is ${min} BLC`)
  validateWithdrawAddress(address)

  const { fee } = await calculateWithdrawFee(amount)
  const total = amount + fee

  return withTransaction(async client => {
    await debit(client, userId, BigInt(total), 'withdraw')
    const res = await client.query<{ id: string }>(
      `INSERT INTO withdrawals (user_id, amount, fee, address, status) VALUES ($1, $2, $3, $4, 'pending') RETURNING id`,
      [userId, amount, fee, address],
    )
    return { id: res.rows[0].id, amount, fee, status: 'pending' as const }
  })
}

export async function getWithdrawLimits() {
  const base = {
    min: await getNumericSetting('withdraw_min_amount'),
    feePercent: await getNumericSetting('withdraw_fee_percent'),
    feeFixed: await getNumericSetting('withdraw_fee_fixed'),
    gasTonEstimate: Number(await getSetting('withdraw_gas_ton_estimate')) || 0.08,
    feeGasMultiplier: Number(await getSetting('withdraw_fee_gas_multiplier')) || 2,
  }
  try {
    const preview = await previewWithdrawFee(base.min)
    return {
      ...base,
      minFeeBlc: preview.minFeeBlc,
      blcPerTon: preview.blcPerTon,
      sampleFeeBlc: preview.fee,
    }
  } catch {
    return { ...base, minFeeBlc: null, blcPerTon: null, sampleFeeBlc: null }
  }
}

export async function getWithdrawFeePreview(amount: number) {
  return previewWithdrawFee(amount)
}

export async function getUserBalanceDetails(userId: string) {
  const balance = await getBalance(userId)
  const pending = await getUserPendingWithdrawalTotal(userId)
  return { blc: Number(balance), pendingWithdrawal: Number(pending) }
}

export async function getOnboardingStatus(userId: string) {
  const user = await getUserProfile(userId)
  const appVersion = String(await getSetting('app_version'))
  return {
    needsOnboarding: !user?.onboarding_completed_at,
    needsReleaseCards: user?.last_seen_app_version !== appVersion,
    appVersion,
  }
}

export async function completeOnboarding(userId: string) {
  await query(`UPDATE users SET onboarding_completed_at = NOW() WHERE id = $1`, [userId])
}

export async function markReleaseSeen(userId: string, version: string) {
  await query(`UPDATE users SET last_seen_app_version = $2 WHERE id = $1`, [userId, version])
}

export async function getOnboardingSlides() {
  const res = await query(`SELECT sort_order, title, body, image_url FROM onboarding_slides WHERE is_active = true ORDER BY sort_order`)
  return res.rows
}

export async function getReleaseCards(version: string) {
  const res = await query(
    `SELECT sort_order, title, body, image_url FROM release_cards WHERE app_version = $1 AND is_active = true ORDER BY sort_order`,
    [version],
  )
  return res.rows
}

export { getUserWithdrawals } from './withdraw.service.js'

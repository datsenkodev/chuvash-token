import crypto from 'crypto'
import pg from 'pg'
import { query, withTransaction } from '../db/pool.js'
import { credit, debit, getBalance } from './ledger.service.js'
import { getCurrentEconomy } from './economy.service.js'
import { getNumericSetting } from './settings.service.js'

export interface HomeCard {
  id: string
  name: string
  tier: string
  cardType: string
  coverUrl: string | null
  openPrice: number
}

function randomInt(min: number, max: number) {
  return crypto.randomInt(min, max + 1)
}

function randomInterval(minSec: number, maxSec: number) {
  return randomInt(minSec, maxSec)
}

export async function computePriceRange(balance: bigint) {
  const min = await getNumericSetting('card_price_min')
  const maxAbs = await getNumericSetting('card_price_max')
  const divisor = await getNumericSetting('card_price_balance_divisor')
  const bal = Number(balance)
  const userMax = Math.floor(bal / divisor)
  const effectiveMax = Math.min(maxAbs, userMax, bal)
  return { min, effectiveMax: Math.max(min, effectiveMax), balance: bal }
}

export async function getHomeCards(userId: string): Promise<{
  cards: HomeCard[]
  balance: number
  canOpen: boolean
  freeTimerSeconds: number
  insufficientMessage?: string
}> {
  const balance = await getBalance(userId)
  const { min, effectiveMax, balance: bal } = await computePriceRange(balance)

  const templates = await query<{
    id: string
    name: string
    tier: string
    card_type: string
    cover_url: string | null
    weight: number
  }>(`SELECT * FROM card_templates WHERE is_active = true`)

  if (templates.rows.length === 0) {
    return { cards: [], balance: bal, canOpen: false, freeTimerSeconds: 0 }
  }

  const prices = new Set<number>()
  const cards: HomeCard[] = []
  const pool = [...templates.rows]

  while (cards.length < 4 && pool.length > 0) {
    const idx = randomInt(0, pool.length - 1)
    const t = pool.splice(idx, 1)[0]
    let price = effectiveMax <= min ? min : randomInt(min, effectiveMax)
    let attempts = 0
    while (prices.has(price) && attempts < 20) {
      price = randomInt(min, effectiveMax)
      attempts++
    }
    prices.add(price)
    cards.push({
      id: t.id,
      name: t.name,
      tier: t.tier,
      cardType: t.card_type,
      coverUrl: t.cover_url,
      openPrice: price,
    })
  }

  const freeState = await query<{ next_available_at: Date }>(
    `SELECT next_available_at FROM free_card_state WHERE user_id = $1`,
    [userId],
  )
  const nextAt = freeState.rows[0]?.next_available_at
  const freeTimerSeconds = nextAt ? Math.max(0, Math.floor((nextAt.getTime() - Date.now()) / 1000)) : 0

  const canOpen = bal >= min
  let insufficientMessage: string | undefined
  if (!canOpen) {
    insufficientMessage =
      freeTimerSeconds > 0
        ? `Free open in ${formatTimer(freeTimerSeconds)} — or top up balance`
        : 'Free card available — or top up balance'
  }

  return { cards, balance: bal, canOpen, freeTimerSeconds, insufficientMessage }
}

function formatTimer(sec: number) {
  const m = Math.floor(sec / 60)
  const s = sec % 60
  return `${m}:${s.toString().padStart(2, '0')}`
}

function calculatePrize(openPrice: number, rEffective: number, maxMultiplier: number): number {
  const baseEv = openPrice * (1 - rEffective / 100)
  const minPrize = Math.max(1, Math.floor(openPrice * 0.05))
  const maxPrize = Math.floor(openPrice * maxMultiplier)
  const center = Math.max(minPrize, Math.min(maxPrize, Math.floor(baseEv)))
  const spread = Math.max(1, Math.floor((maxPrize - minPrize) * 0.3))
  const low = Math.max(minPrize, center - spread)
  const high = Math.min(maxPrize, center + spread)
  return randomInt(low, high)
}

async function rollPartnerPrizes(userId: string, cardType: string, cardOpenId: string, client: pg.PoolClient) {
  const prizes = await client.query<{
    id: string
    value_blc: string
    trigger_percent: string
    card_type_filter: string | null
  }>(`SELECT * FROM partner_prizes WHERE is_active = true`)

  let totalBonus = 0
  for (const p of prizes.rows) {
    if (p.card_type_filter && p.card_type_filter !== cardType) continue
    const roll = crypto.randomInt(0, 100000) / 1000
    if (roll <= parseFloat(p.trigger_percent)) {
      const bonus = BigInt(p.value_blc)
      totalBonus += Number(bonus)
      await client.query(
        `INSERT INTO partner_prize_wins (user_id, partner_prize_id, card_open_id) VALUES ($1, $2, $3)`,
        [userId, p.id, cardOpenId],
      )
      await credit(client, userId, bonus, 'partner_prize', undefined, cardOpenId, { partner_prize_id: p.id })
    }
  }
  return totalBonus
}

export async function openCard(
  userId: string,
  cardTemplateId: string,
  openPrice: number,
  isFree: boolean,
  idempotencyKey?: string,
) {
  const template = await query<{
    id: string
    card_type: string
    max_win_multiplier: string
  }>(`SELECT id, card_type, max_win_multiplier FROM card_templates WHERE id = $1 AND is_active = true`, [
    cardTemplateId,
  ])
  if (!template.rows[0]) throw new Error('Card not found')

  const { mode, rEffective } = await getCurrentEconomy()
  const maxMult = parseFloat(template.rows[0].max_win_multiplier)

  if (isFree) {
    const freeState = await query<{ next_available_at: Date }>(
      `SELECT next_available_at FROM free_card_state WHERE user_id = $1`,
      [userId],
    )
    if (!freeState.rows[0] || freeState.rows[0].next_available_at.getTime() > Date.now()) {
      throw new Error('Free card not available yet')
    }
    const mult = await getNumericSetting('free_card_prize_multiplier')
    openPrice = Math.floor(openPrice * mult) || 100
  } else {
    const balance = await getBalance(userId)
    const { min, effectiveMax } = await computePriceRange(balance)
    if (openPrice < min || openPrice > effectiveMax) throw new Error('Invalid open price')
    if (balance < BigInt(openPrice)) throw new Error('Insufficient balance')
  }

  const prize = calculatePrize(openPrice, isFree ? -5 : rEffective, maxMult)

  const result = await withTransaction(async client => {
    if (!isFree) {
      await debit(client, userId, BigInt(openPrice), 'card_open', idempotencyKey)
    }

    const openRes = await client.query<{ id: string }>(
      `INSERT INTO card_opens (user_id, card_template_id, open_price, prize_amount, is_free, economy_mode, idempotency_key)
       VALUES ($1, $2, $3, $4, $5, $6, $7) RETURNING id`,
      [userId, cardTemplateId, openPrice, prize, isFree, mode, idempotencyKey ?? null],
    )
    const openId = openRes.rows[0].id

    await credit(client, userId, BigInt(prize), 'card_prize', `${idempotencyKey}-prize`, openId)

    const partnerBonus = await rollPartnerPrizes(userId, template.rows[0].card_type, openId, client)

    const minSec = await getNumericSetting('free_card_interval_min_sec')
    const maxSec = await getNumericSetting('free_card_interval_max_sec')
    const interval = randomInterval(minSec, maxSec)
    await client.query(
      `UPDATE free_card_state SET next_available_at = NOW() + ($2 || ' seconds')::interval, last_interval_sec = $2
       WHERE user_id = $1`,
      [userId, interval],
    )

    const balRes = await client.query<{ blc_amount: string }>(`SELECT blc_amount FROM balances WHERE user_id = $1`, [
      userId,
    ])

    return {
      openId,
      prizeAmount: prize + partnerBonus,
      newBalance: parseInt(balRes.rows[0].blc_amount, 10),
      nextFreeInSec: interval,
    }
  })

  return result
}

export async function getFreeTimer(userId: string) {
  const freeState = await query<{ next_available_at: Date }>(
    `SELECT next_available_at FROM free_card_state WHERE user_id = $1`,
    [userId],
  )
  const nextAt = freeState.rows[0]?.next_available_at
  const secondsLeft = nextAt ? Math.max(0, Math.floor((nextAt.getTime() - Date.now()) / 1000)) : 0
  return { nextAvailableAt: nextAt?.toISOString() ?? null, secondsLeft, canOpenFree: secondsLeft === 0 }
}

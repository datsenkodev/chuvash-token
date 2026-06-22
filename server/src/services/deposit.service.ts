import { query } from '../db/pool.js'
import { transferCredit } from './ledger.service.js'
import { getSwapQuote } from './rates.service.js'
import { swapDepositToBlc } from './swap-execute.service.js'
import { getSetting } from './settings.service.js'
import { getServerWalletAddress } from './wallet.service.js'
import { blcToJettonNano, jettonNanoToBlc, parseTonAddress, tonToNano } from './ton.service.js'

const DEPOSIT_TTL_MS = 60 * 60 * 1000

export async function createDepositIntent(userId: string, currency: string, amount: number) {
  const normalized = currency.toLowerCase()
  if (!['blc', 'ton', 'usdt'].includes(normalized)) throw new Error('Unsupported currency')
  if (amount <= 0) throw new Error('Amount must be positive')

  const address = await getServerWalletAddress()
  if (!address) throw new Error('Server wallet not ready')

  const blcMaster = String(await getSetting('blc_jetton_master'))
  if (!blcMaster) throw new Error('BLC jetton master not configured')

  let amountNano: bigint
  if (normalized === 'ton') amountNano = tonToNano(amount)
  else if (normalized === 'usdt') amountNano = BigInt(Math.floor(amount * 1e6))
  else amountNano = blcToJettonNano(amount, Number(await getSetting('blc_jetton_decimals')) || 9)

  const quote = await getSwapQuote({ currency: normalized, amountNano })
  const memo = cryptoRandomMemo()
  const autoSwap = normalized === 'ton' || normalized === 'usdt'

  const expiresAt = new Date(Date.now() + DEPOSIT_TTL_MS)
  const res = await query<{ id: string }>(
    `INSERT INTO deposits (user_id, currency, amount, amount_nano, expected_blc, memo, status, expires_at, quote_source)
     VALUES ($1, $2, $3, $4, $5, $6, 'pending', $7, $8) RETURNING id`,
    [userId, normalized, amount, amountNano.toString(), quote.outAmountBlc, memo, expiresAt, quote.source],
  )

  return {
    depositId: res.rows[0].id,
    address,
    memo,
    currency: normalized,
    sendAmount: amount,
    expectedBlc: quote.outAmountBlc,
    quoteSource: quote.source,
    autoSwap,
    amountNano: amountNano.toString(),
    expiresAt: expiresAt.toISOString(),
    tonTransferUrl:
      normalized === 'ton'
        ? `https://app.tonkeeper.com/transfer/${address}?amount=${amountNano}&text=${encodeURIComponent(memo)}`
        : null,
    instructions:
      normalized === 'usdt'
        ? `Send ${amount} USDT jetton to ${address} with comment/memo: ${memo}. BLC auto-purchased via DeDust/TonCo router.`
        : normalized === 'ton'
          ? `Send ${amount} TON with memo ${memo}. BLC auto-purchased via DeDust/TonCo (~${quote.outAmountBlc} BLC est., route: ${quote.source}).`
          : `Send ${amount} BLC jetton with memo ${memo}.`,
  }
}

function cryptoRandomMemo() {
  return Math.random().toString(36).slice(2, 10).toUpperCase()
}

export async function getDepositStatus(depositId: string, userId: string) {
  const res = await query<{
    id: string
    status: string
    expected_blc: string | null
    blc_credited: string | null
    tx_hash: string | null
    currency: string
    memo: string | null
    quote_source: string | null
    expires_at: Date | null
  }>(`SELECT * FROM deposits WHERE id = $1 AND user_id = $2`, [depositId, userId])
  const row = res.rows[0]
  if (!row) throw new Error('Deposit not found')

  if (row.status === 'pending' && row.expires_at && new Date(row.expires_at) < new Date()) {
    await query(`UPDATE deposits SET status = 'expired' WHERE id = $1`, [depositId])
    row.status = 'expired'
  }

  return {
    depositId: row.id,
    status: row.status,
    expectedBlc: row.expected_blc ? Number(row.expected_blc) : null,
    blcCredited: row.blc_credited ? Number(row.blc_credited) : null,
    txHash: row.tx_hash,
    currency: row.currency,
    memo: row.memo,
    quoteSource: row.quote_source,
  }
}

export async function confirmDepositFromChain(params: {
  depositId: string
  txHash: string
  blcAmount: bigint
}) {
  const dep = await query<{ user_id: string; status: string }>(
    `SELECT user_id, status FROM deposits WHERE id = $1`,
    [params.depositId],
  )
  if (!dep.rows[0] || !['pending', 'swapping', 'received'].includes(dep.rows[0].status)) return false

  await transferCredit(dep.rows[0].user_id, params.blcAmount, 'deposit', `dep-${params.txHash}`, params.depositId)
  await query(
    `UPDATE deposits SET status = 'confirmed', blc_credited = $2, tx_hash = $3 WHERE id = $1`,
    [params.depositId, params.blcAmount.toString(), params.txHash],
  )
  return true
}

async function processAutoSwapDeposit(depositId: string, txHash: string) {
  const dep = await query<{
    currency: string
    amount_nano: string
    expected_blc: string
  }>(`SELECT currency, amount_nano, expected_blc FROM deposits WHERE id = $1`, [depositId])

  const row = dep.rows[0]
  if (!row) return false

  await query(`UPDATE deposits SET status = 'swapping', tx_hash = $2 WHERE id = $1`, [depositId, txHash])

  try {
    const blcAmount = await swapDepositToBlc(row.currency, BigInt(row.amount_nano))
    return confirmDepositFromChain({ depositId, txHash, blcAmount })
  } catch (e) {
    console.error('[deposit] auto-swap failed, crediting quoted amount:', e)
    const fallback = BigInt(row.expected_blc)
    return confirmDepositFromChain({ depositId, txHash: `${txHash}-quoted`, blcAmount: fallback })
  }
}

export async function matchAndConfirmTransfer(params: {
  memo: string | null
  txHash: string
  kind: 'ton' | 'jetton'
  amountNano: bigint
  jettonMaster: string | null
}) {
  if (!params.memo) return false

  const dep = await query<{
    id: string
    user_id: string
    currency: string
    amount_nano: string
    expected_blc: string
    status: string
    expires_at: Date | null
  }>(
    `SELECT * FROM deposits WHERE memo = $1 AND status = 'pending' ORDER BY created_at DESC LIMIT 1`,
    [params.memo],
  )
  const row = dep.rows[0]
  if (!row) return false
  if (row.expires_at && new Date(row.expires_at) < new Date()) {
    await query(`UPDATE deposits SET status = 'expired' WHERE id = $1`, [row.id])
    return false
  }

  const slippage = Number(await getSetting('deposit_slippage_percent')) || 2
  const expectedNano = BigInt(row.amount_nano ?? 0)
  const minAccepted = (expectedNano * BigInt(100 - slippage)) / 100n

  if (params.kind === 'ton' && row.currency === 'ton') {
    if (params.amountNano < minAccepted) return false
    return processAutoSwapDeposit(row.id, params.txHash)
  }

  if (params.kind === 'jetton') {
    const blcMaster = String(await getSetting('blc_jetton_master'))
    const usdtMaster = String(await getSetting('usdt_jetton_master'))
    const decimals = Number(await getSetting('blc_jetton_decimals')) || 9

    if (row.currency === 'blc' && params.jettonMaster && addressesLooselyEqual(params.jettonMaster, blcMaster)) {
      if (params.amountNano < minAccepted) return false
      const blc = jettonNanoToBlc(params.amountNano, decimals)
      return confirmDepositFromChain({ depositId: row.id, txHash: params.txHash, blcAmount: blc })
    }

    if (row.currency === 'usdt' && params.jettonMaster && addressesLooselyEqual(params.jettonMaster, usdtMaster)) {
      if (params.amountNano < minAccepted) return false
      return processAutoSwapDeposit(row.id, params.txHash)
    }
  }

  return false
}

function addressesLooselyEqual(a: string, b: string) {
  if (!a || !b) return false
  try {
    const pa = parseTonAddress(a).toRawString()
    const pb = parseTonAddress(b).toRawString()
    return pa === pb
  } catch {
    return a.toLowerCase() === b.toLowerCase()
  }
}

export async function expireOldDeposits() {
  await query(`UPDATE deposits SET status = 'expired' WHERE status = 'pending' AND expires_at < NOW()`)
}

export async function listRecentDeposits(limit = 50) {
  const res = await query(
    `SELECT d.id, d.currency, d.amount, d.status, d.expected_blc, d.blc_credited, d.memo, d.tx_hash, d.quote_source, d.created_at,
            u.telegram_id, u.username
     FROM deposits d JOIN users u ON u.id = d.user_id
     ORDER BY d.created_at DESC LIMIT $1`,
    [limit],
  )
  return res.rows
}

export async function getPendingWithdrawalsReserve(): Promise<bigint> {
  const res = await query<{ sum: string }>(
    `SELECT COALESCE(SUM(amount + fee), 0) as sum FROM withdrawals WHERE status IN ('pending', 'processing')`,
  )
  return BigInt(res.rows[0].sum)
}

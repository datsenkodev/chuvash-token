import { query } from '../db/pool.js'
import { getSetting } from './settings.service.js'
import { blcToJettonNano, parseTonAddress, sendJettonTransfer } from './ton.service.js'
import { ensureServerTonForWithdrawals } from './gas.service.js'

export async function processPendingWithdrawals() {
  await ensureServerTonForWithdrawals().catch(err => console.error('[gas]', err))
  const pending = await query<{
    id: string
    user_id: string
    amount: string
    address: string
  }>(
    `SELECT id, user_id, amount, address FROM withdrawals WHERE status = 'pending' ORDER BY created_at ASC LIMIT 5`,
  )

  const blcMaster = String(await getSetting('blc_jetton_master'))
  if (!blcMaster) return { processed: 0, error: 'BLC jetton master not configured' }

  const decimals = Number(await getSetting('blc_jetton_decimals')) || 9
  let processed = 0

  for (const row of pending.rows) {
    await query(`UPDATE withdrawals SET status = 'processing' WHERE id = $1 AND status = 'pending'`, [row.id])

    try {
      parseTonAddress(row.address)
      const jettonNano = blcToJettonNano(BigInt(row.amount), decimals)
      const { seqno } = await sendJettonTransfer({
        jettonMaster: blcMaster,
        toAddress: row.address,
        jettonAmountNano: jettonNano,
      })

      await query(
        `UPDATE withdrawals SET status = 'completed', tx_hash = $2, processed_at = NOW(), error_message = NULL WHERE id = $1`,
        [row.id, `seqno-${seqno}-${Date.now()}`],
      )
      processed++
    } catch (e) {
      const msg = e instanceof Error ? e.message : 'Withdraw failed'
      await query(
        `UPDATE withdrawals SET status = 'failed', error_message = $2, processed_at = NOW() WHERE id = $1`,
        [row.id, msg],
      )
    }
  }

  return { processed }
}

export async function listWithdrawals(status?: string, limit = 50) {
  const params: unknown[] = [limit]
  let sql = `SELECT w.*, u.telegram_id, u.username FROM withdrawals w
             JOIN users u ON u.id = w.user_id`
  if (status) {
    sql += ` WHERE w.status = $2`
    params.push(status)
  }
  sql += ` ORDER BY w.created_at DESC LIMIT $1`
  const res = await query(sql, params)
  return res.rows
}

export async function getUserWithdrawals(userId: string) {
  const res = await query(
    `SELECT id, amount, fee, address, status, tx_hash, created_at, processed_at FROM withdrawals
     WHERE user_id = $1 ORDER BY created_at DESC LIMIT 20`,
    [userId],
  )
  return res.rows
}

export async function validateWithdrawAddress(address: string) {
  parseTonAddress(address)
}

export async function getUserPendingWithdrawalTotal(userId: string): Promise<bigint> {
  const res = await query<{ sum: string }>(
    `SELECT COALESCE(SUM(amount), 0) as sum FROM withdrawals WHERE user_id = $1 AND status IN ('pending', 'processing')`,
    [userId],
  )
  return BigInt(res.rows[0].sum)
}

import pg from 'pg'
import { query, withTransaction } from '../db/pool.js'

export async function getBalance(userId: string): Promise<bigint> {
  const res = await query<{ blc_amount: string }>(`SELECT blc_amount FROM balances WHERE user_id = $1`, [
    userId,
  ])
  return BigInt(res.rows[0]?.blc_amount ?? 0)
}

export async function getTotalPlayerBalances(): Promise<bigint> {
  const res = await query<{ sum: string }>(`SELECT COALESCE(SUM(blc_amount), 0) as sum FROM balances`)
  return BigInt(res.rows[0].sum)
}

export async function credit(
  client: pg.PoolClient,
  userId: string,
  amount: bigint,
  type: string,
  idempotencyKey?: string,
  referenceId?: string,
  meta?: object,
) {
  if (amount <= 0n) throw new Error('Credit amount must be positive')
  await client.query(
    `INSERT INTO ledger_entries (user_id, type, amount, direction, idempotency_key, reference_id, meta)
     VALUES ($1, $2, $3, 'credit', $4, $5, $6)`,
    [userId, type, amount.toString(), idempotencyKey ?? null, referenceId ?? null, JSON.stringify(meta ?? {})],
  )
  await client.query(
    `UPDATE balances SET blc_amount = blc_amount + $2, updated_at = NOW() WHERE user_id = $1`,
    [userId, amount.toString()],
  )
}

export async function debit(
  client: pg.PoolClient,
  userId: string,
  amount: bigint,
  type: string,
  idempotencyKey?: string,
  referenceId?: string,
  meta?: object,
) {
  if (amount <= 0n) throw new Error('Debit amount must be positive')
  const bal = await client.query<{ blc_amount: string }>(
    `SELECT blc_amount FROM balances WHERE user_id = $1 FOR UPDATE`,
    [userId],
  )
  const current = BigInt(bal.rows[0]?.blc_amount ?? 0)
  if (current < amount) throw new Error('Insufficient balance')
  await client.query(
    `INSERT INTO ledger_entries (user_id, type, amount, direction, idempotency_key, reference_id, meta)
     VALUES ($1, $2, $3, 'debit', $4, $5, $6)`,
    [userId, type, amount.toString(), idempotencyKey ?? null, referenceId ?? null, JSON.stringify(meta ?? {})],
  )
  await client.query(
    `UPDATE balances SET blc_amount = blc_amount - $2, updated_at = NOW() WHERE user_id = $1`,
    [userId, amount.toString()],
  )
}

export async function transferCredit(
  userId: string,
  amount: bigint,
  type: string,
  idempotencyKey?: string,
  referenceId?: string,
) {
  return withTransaction(async client => {
    await credit(client, userId, amount, type, idempotencyKey, referenceId)
  })
}

export async function transferDebit(
  userId: string,
  amount: bigint,
  type: string,
  idempotencyKey?: string,
  referenceId?: string,
) {
  return withTransaction(async client => {
    await debit(client, userId, amount, type, idempotencyKey, referenceId)
  })
}

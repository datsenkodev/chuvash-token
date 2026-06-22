import { FastifyInstance } from 'fastify'
import { adminOnlyMiddleware } from '../middleware/telegramAuth.js'
import { getSettings, setSetting } from '../services/settings.service.js'
import { runEconomyAnalyzer, resetRCasinoLocked } from '../services/economy.service.js'
import { getTotalPlayerBalances, transferCredit, transferDebit } from '../services/ledger.service.js'
import {
  getSetupStatus,
  setWalletBalanceBlc,
  launchProject,
  forceDistributionMode,
  syncWalletBalanceFromChain,
} from '../services/setup.service.js'
import { getConfigStatus } from '../config/env.js'
import { listRecentDeposits } from '../services/deposit.service.js'
import { listWithdrawals } from '../services/withdraw.service.js'
import { query } from '../db/pool.js'

const adminHook = { preHandler: adminOnlyMiddleware }

export async function registerAdminRoutes(app: FastifyInstance) {
  app.get('/api/admin/settings', adminHook, async () => getSettings())

  app.patch('/api/admin/settings', adminHook, async req => {
    const body = req.body as Record<string, unknown>
    const adminId = req.auth!.telegramUser.id
    for (const [key, value] of Object.entries(body)) {
      await setSetting(key, value, adminId)
    }
    await query(`INSERT INTO admin_actions (admin_telegram_id, action, payload) VALUES ($1, 'settings_update', $2)`, [
      adminId,
      JSON.stringify(body),
    ])
    return { ok: true }
  })

  app.get('/api/admin/economy/state', adminHook, async () => {
    const result = await runEconomyAnalyzer()
    return {
      ...result,
      wBlc: Number(result.wBlc),
      pBlc: Number(result.pBlc),
      sBlc: Number(result.sBlc),
      vDaily: Number(result.vDaily),
    }
  })

  app.post('/api/admin/economy/force-mode', adminHook, async (req, reply) => {
    const body = req.body as { mode: 'casino' | 'distribution' }
    const adminId = req.auth!.telegramUser.id
    if (body.mode === 'distribution') {
      await forceDistributionMode(adminId)
      return { ok: true, mode: 'distribution' }
    }
    await query(`UPDATE economy_state SET current_mode = $1 WHERE id = 1`, [body.mode])
    await query(
      `INSERT INTO admin_actions (admin_telegram_id, action, payload) VALUES ($1, 'force_casino', $2)`,
      [adminId, JSON.stringify({})],
    )
    return { ok: true, mode: 'casino' }
  })

  app.get('/api/admin/setup/status', adminHook, async () => getSetupStatus())

  app.post('/api/admin/setup/wallet-balance', adminHook, async (req, reply) => {
    try {
      const body = req.body as { walletBalanceBlc: number }
      await setWalletBalanceBlc(body.walletBalanceBlc, req.auth!.telegramUser.id)
      return getSetupStatus()
    } catch (e) {
      return reply.status(400).send({ error: e instanceof Error ? e.message : 'Failed' })
    }
  })

  app.post('/api/admin/setup/launch', adminHook, async (req, reply) => {
    try {
      return await launchProject(req.auth!.telegramUser.id)
    } catch (e) {
      return reply.status(400).send({ error: e instanceof Error ? e.message : 'Launch failed' })
    }
  })

  app.post('/api/admin/setup/sync-wallet', adminHook, async (req, reply) => {
    try {
      return await syncWalletBalanceFromChain(req.auth!.telegramUser.id)
    } catch (e) {
      return reply.status(400).send({ error: e instanceof Error ? e.message : 'Sync failed' })
    }
  })

  app.get('/api/admin/config-status', adminHook, async () => getConfigStatus())

  app.get('/api/admin/deposits', adminHook, async () => listRecentDeposits(50))

  app.get('/api/admin/withdrawals', adminHook, async req => {
    const q = req.query as { status?: string }
    return listWithdrawals(q.status)
  })

  app.post('/api/admin/economy/reset-r-casino', adminHook, async () => {
    await resetRCasinoLocked()
    return { ok: true }
  })

  app.get('/api/admin/reconciliation', adminHook, async () => {
    const state = await query<{ wallet_balance_blc: string }>(`SELECT wallet_balance_blc FROM economy_state WHERE id = 1`)
    const p = await getTotalPlayerBalances()
    const w = BigInt(state.rows[0]?.wallet_balance_blc ?? 0)
    return { walletBlc: Number(w), playerSumBlc: Number(p), delta: Number(w - p) }
  })

  app.post('/api/admin/users/:userId/adjust-balance', adminHook, async (req, reply) => {
    try {
      const { userId } = req.params as { userId: string }
      const body = req.body as { amount: number; reason: string }
      if (body.amount === 0) throw new Error('Amount required')
      if (body.amount > 0) {
        await transferCredit(userId, BigInt(body.amount), 'admin_adjust')
      } else {
        await transferDebit(userId, BigInt(-body.amount), 'admin_adjust')
      }
      await query(
        `INSERT INTO admin_actions (admin_telegram_id, action, payload) VALUES ($1, 'balance_adjust', $2)`,
        [req.auth!.telegramUser.id, JSON.stringify({ userId, ...body })],
      )
      return { ok: true }
    } catch (e) {
      return reply.status(400).send({ error: e instanceof Error ? e.message : 'Failed' })
    }
  })

  app.get('/api/admin/card-templates', adminHook, async () => {
    const res = await query(`SELECT * FROM card_templates ORDER BY name`)
    return res.rows
  })

  app.post('/api/admin/card-templates', adminHook, async req => {
    const b = req.body as Record<string, unknown>
    const res = await query(
      `INSERT INTO card_templates (name, tier, card_type, cover_url, weight, max_win_multiplier)
       VALUES ($1, $2, $3, $4, $5, $6) RETURNING *`,
      [b.name, b.tier ?? 'standard', b.card_type ?? 'default', b.cover_url ?? null, b.weight ?? 1, b.max_win_multiplier ?? 3],
    )
    return res.rows[0]
  })
}

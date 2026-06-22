import { FastifyInstance } from 'fastify'
import { getBalance } from '../services/ledger.service.js'
import {
  getUserProfile,
  updateBio,
  getReferrals,
  claimReferralBonus,
  createWithdrawal,
  getWithdrawLimits,
  getWithdrawFeePreview,
  getUserBalanceDetails,
  getUserWithdrawals,
  getOnboardingStatus,
  completeOnboarding,
  markReleaseSeen,
  getOnboardingSlides,
  getReleaseCards,
} from '../services/user.service.js'
import { getHomeCards, openCard, getFreeTimer } from '../services/card.service.js'
import { getSettings } from '../services/settings.service.js'
import { requireProjectLaunched } from '../middleware/requireLaunched.js'
import { isProjectLaunched } from '../services/setup.service.js'

const gameHook = { preHandler: requireProjectLaunched }

export async function registerUserRoutes(app: FastifyInstance) {
  app.get('/api/users/me', async req => {
    const profile = await getUserProfile(req.auth!.userId)
    const balance = await getBalance(req.auth!.userId)
    return {
      id: profile.id,
      telegramId: profile.telegram_id,
      username: profile.username,
      firstName: profile.first_name,
      lastName: profile.last_name,
      bio: profile.bio,
      level: profile.level,
      xp: profile.xp,
      balance: Number(balance),
      isAdmin: req.auth!.isAdmin,
    }
  })

  app.get('/api/users/me/balance', async req => getUserBalanceDetails(req.auth!.userId))

  app.patch('/api/users/me', async req => {
    const body = req.body as { bio?: string }
    if (body.bio !== undefined) await updateBio(req.auth!.userId, body.bio)
    return { ok: true }
  })

  app.get('/api/cards/home', gameHook, async req => getHomeCards(req.auth!.userId))

  app.get('/api/cards/free-timer', gameHook, async req => getFreeTimer(req.auth!.userId))

  app.post('/api/cards/open', gameHook, async (req, reply) => {
    try {
      const body = req.body as {
        cardTemplateId: string
        openPrice: number
        isFree?: boolean
        idempotencyKey?: string
      }
      const idempotencyKey = (req.headers['idempotency-key'] as string) || body.idempotencyKey
      return await openCard(
        req.auth!.userId,
        body.cardTemplateId,
        body.openPrice,
        body.isFree ?? false,
        idempotencyKey,
      )
    } catch (e) {
      return reply.status(400).send({ error: e instanceof Error ? e.message : 'Open failed' })
    }
  })

  app.get('/api/referrals', async req => getReferrals(req.auth!.userId, req.auth!.telegramUser.id))

  app.post('/api/referrals/claim', async req => {
    const amount = await claimReferralBonus(req.auth!.userId)
    return { claimed: amount }
  })

  app.get('/api/withdrawals/limits', async () => getWithdrawLimits())

  app.get('/api/withdrawals/fee-preview', async (req, reply) => {
    try {
      const q = req.query as { amount?: string }
      const amount = parseFloat(q.amount ?? '0')
      if (amount <= 0) return reply.status(400).send({ error: 'Invalid amount' })
      return getWithdrawFeePreview(amount)
    } catch (e) {
      return reply.status(400).send({ error: e instanceof Error ? e.message : 'Failed' })
    }
  })

  app.post('/api/withdrawals', async (req, reply) => {
    try {
      const body = req.body as { amount: number; address: string }
      if (!body.address?.trim()) return reply.status(400).send({ error: 'Wallet address required' })
      return await createWithdrawal(req.auth!.userId, body.amount, body.address.trim())
    } catch (e) {
      return reply.status(400).send({ error: e instanceof Error ? e.message : 'Withdraw failed' })
    }
  })

  app.get('/api/withdrawals/history', async req => getUserWithdrawals(req.auth!.userId))

  app.get('/api/config/public', async () => {
    const s = await getSettings()
    const launched = await isProjectLaunched()
    return {
      cardPriceMin: s.card_price_min,
      cardPriceMax: s.card_price_max,
      dedustEnabled: s.dedust_swap_enabled,
      multiToken: s.multi_token_enabled,
      appVersion: s.app_version,
      projectLaunched: launched,
    }
  })

  app.get('/api/onboarding/status', async req => getOnboardingStatus(req.auth!.userId))
  app.get('/api/onboarding/slides', async () => getOnboardingSlides())
  app.get('/api/onboarding/release-cards', async () => {
    const version = String((await getSettings()).app_version)
    return getReleaseCards(version)
  })
  app.post('/api/onboarding/complete', async req => {
    await completeOnboarding(req.auth!.userId)
    return { ok: true }
  })
  app.post('/api/onboarding/release-seen', async req => {
    const body = req.body as { version?: string }
    const version = body.version ?? String((await getSettings()).app_version)
    await markReleaseSeen(req.auth!.userId, version)
    return { ok: true }
  })
}

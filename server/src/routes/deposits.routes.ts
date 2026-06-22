import { FastifyInstance } from 'fastify'
import { getSetting } from '../services/settings.service.js'
import { createDepositIntent, getDepositStatus } from '../services/deposit.service.js'
import { getSwapQuote } from '../services/rates.service.js'
import { tonToNano, blcToJettonNano } from '../services/ton.service.js'

export async function registerDepositRoutes(app: FastifyInstance) {
  app.get('/api/deposits/methods', async () => {
    const dedust = await getSetting<boolean>('dedust_swap_enabled')
    const tonco = await getSetting<boolean>('tonco_swap_enabled')
    const swapOn = dedust || tonco
    const blcMaster = String(await getSetting('blc_jetton_master'))
    const usdtMaster = String(await getSetting('usdt_jetton_master'))
    return {
      routerStrategy: await getSetting('swap_router_strategy'),
      methods: [
        { currency: 'blc', enabled: Boolean(blcMaster), autoSwap: false },
        { currency: 'ton', enabled: swapOn && Boolean(blcMaster), autoSwap: true },
        { currency: 'usdt', enabled: swapOn && Boolean(usdtMaster) && Boolean(blcMaster), autoSwap: true },
      ],
    }
  })

  app.get('/api/rates/quote', async (req, reply) => {
    try {
      const q = req.query as { currency?: string; amount?: string }
      const currency = (q.currency ?? 'ton').toLowerCase()
      const amount = parseFloat(q.amount ?? '0')
      if (amount <= 0) return reply.status(400).send({ error: 'Invalid amount' })

      let amountNano: bigint
      if (currency === 'ton') amountNano = tonToNano(amount)
      else if (currency === 'usdt') amountNano = BigInt(Math.floor(amount * 1e6))
      else amountNano = blcToJettonNano(amount, Number(await getSetting('blc_jetton_decimals')) || 9)

      const quote = await getSwapQuote({ currency, amountNano })
      return {
        currency,
        amount,
        expectedBlc: quote.outAmountBlc,
        slippageBps: quote.slippageBps,
        source: quote.source,
        executable: quote.executable,
        autoSwap: currency === 'ton' || currency === 'usdt',
        disclaimer:
          'Estimate. TON/USDT auto-swapped to BLC via DeDust/TonCo router on receipt.',
      }
    } catch (e) {
      return reply.status(400).send({ error: e instanceof Error ? e.message : 'Quote failed' })
    }
  })

  app.post('/api/deposits/intent', async (req, reply) => {
    try {
      const body = req.body as { currency: string; amount: number }
      return await createDepositIntent(req.auth!.userId, body.currency, body.amount)
    } catch (e) {
      return reply.status(400).send({ error: e instanceof Error ? e.message : 'Intent failed' })
    }
  })

  app.get('/api/deposits/:id/status', async (req, reply) => {
    try {
      const { id } = req.params as { id: string }
      return await getDepositStatus(id, req.auth!.userId)
    } catch (e) {
      return reply.status(404).send({ error: e instanceof Error ? e.message : 'Not found' })
    }
  })
}

import { FastifyInstance } from 'fastify'
import { env } from '../config/env.js'
import { runChainWatcher } from '../jobs/chain.job.js'

export async function registerWebhookRoutes(app: FastifyInstance) {
  app.post('/api/webhooks/chain/deposit', async (req, reply) => {
    const secret = req.headers['x-webhook-secret']
    if (!env.CHAIN_WEBHOOK_SECRET || secret !== env.CHAIN_WEBHOOK_SECRET) {
      return reply.status(401).send({ error: 'Unauthorized' })
    }
    await runChainWatcher()
    return { ok: true }
  })
}

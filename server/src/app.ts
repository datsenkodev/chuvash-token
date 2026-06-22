import Fastify from 'fastify'
import cors from '@fastify/cors'
import { env } from './config/env.js'
import { telegramAuthMiddleware } from './middleware/telegramAuth.js'
import { registerUserRoutes } from './routes/users.routes.js'
import { registerAdminRoutes } from './routes/admin.routes.js'
import { registerDepositRoutes } from './routes/deposits.routes.js'
import { registerWebhookRoutes } from './routes/webhooks.routes.js'
import { runEconomyAnalyzer } from './services/economy.service.js'

export async function buildApp() {
  const app = Fastify({ logger: true })

  await app.register(cors, { origin: true })

  app.get('/api/health', async () => ({ status: 'ok', version: env.APP_VERSION }))

  await registerWebhookRoutes(app)

  app.register(async protectedRoutes => {
    protectedRoutes.addHook('preHandler', telegramAuthMiddleware)
    await registerUserRoutes(protectedRoutes)
    await registerDepositRoutes(protectedRoutes)
    await registerAdminRoutes(protectedRoutes)
  })

  return app
}

export function startEconomyCron() {
  const intervalMs = 10 * 60 * 1000
  runEconomyAnalyzer().catch(console.error)
  setInterval(() => runEconomyAnalyzer().catch(console.error), intervalMs)
}

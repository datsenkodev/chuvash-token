import { env, getConfigStatus } from './config/env.js'
import { migrate } from './db/migrate.js'
import { buildApp, startEconomyCron } from './app.js'
import { seed } from './db/seed.js'
import { ensureServerWallet } from './services/wallet.service.js'
import { getSetupStatus } from './services/setup.service.js'
import { startChainJobs } from './jobs/chain.job.js'

function validateProductionConfig() {
  if (env.DEV_MODE) return
  const cfg = getConfigStatus()
  const missing: string[] = []
  if (!cfg.botToken) missing.push('BOT_TOKEN')
  if (!cfg.tonapiKey) missing.push('TONAPI_KEY')
  if (!cfg.toncenterKey) missing.push('TONCENTER_API_KEY')
  if (!cfg.adminIds) missing.push('ADMIN_TELEGRAM_IDS')
  if (missing.length) {
    console.warn(`\n⚠ Production config missing: ${missing.join(', ')}`)
    console.warn('Set in .env and configure jetton masters in /admin\n')
  }
}

async function main() {
  await migrate()
  await ensureServerWallet()
  await seed()

  const setup = await getSetupStatus()
  console.log(`Server wallet: ${setup.walletAddress ?? '(generating failed)'}`)
  if (!setup.launched) {
    console.log('\n=== SETUP REQUIRED (production) ===')
    console.log('1. Fund the server wallet with BLC (distribution bankroll).')
    console.log('2. Admin UI: /admin → Sync wallet from chain')
    console.log('3. Admin: Launch project')
    console.log(`   Minimum wallet balance: ${setup.setupMinWalletBlc} BLC`)
    console.log('Game API (/api/cards/*) is blocked until launch.\n')
  } else {
    console.log(`Project launched — mode: ${setup.currentMode}, wallet: ${setup.walletBalanceBlc} BLC`)
  }

  validateProductionConfig()

  const app = await buildApp()
  startEconomyCron()
  startChainJobs()

  await app.listen({ port: env.PORT, host: '0.0.0.0' })
  console.log(`API listening on http://localhost:${env.PORT}`)
}

main().catch(err => {
  console.error(err)
  process.exit(1)
})

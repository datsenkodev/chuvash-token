import { query } from '../db/pool.js'
import { env } from '../config/env.js'
import { expireOldDeposits, matchAndConfirmTransfer } from './deposit.service.js'
import { processPendingWithdrawals } from './withdraw.service.js'
import { syncWalletBalanceFromChain } from './setup.service.js'
import { ensureServerTonForWithdrawals } from './gas.service.js'
import {
  getAccountEvents,
  isTonApiConfigured,
  parseEventTransfers,
} from './tonapi.service.js'
import { getServerWalletAddress } from './wallet.service.js'

export async function runChainWatcher() {
  if (!env.TONAPI_KEY) return

  await expireOldDeposits()

  const address = await getServerWalletAddress()
  if (!address) return

  const state = await query<{ last_event_id: string | null }>(`SELECT last_event_id FROM chain_state WHERE id = 1`)
  const seen = new Set<string>()
  const events = await getAccountEvents(address)

  for (const event of events) {
    if (seen.has(event.event_id)) continue
    seen.add(event.event_id)

    if (state.rows[0]?.last_event_id === event.event_id) break

    const transfers = parseEventTransfers(event, address)
    for (const t of transfers) {
      await matchAndConfirmTransfer({
        memo: t.comment,
        txHash: t.txHash,
        kind: t.kind,
        amountNano: t.amountNano,
        jettonMaster: t.jettonMaster,
      })
    }
  }

  if (events[0]?.event_id) {
    await query(`UPDATE chain_state SET last_event_id = $1, updated_at = NOW() WHERE id = 1`, [events[0].event_id])
  }

  await processPendingWithdrawals()
}

export async function runWalletSync() {
  if (!(await isTonApiConfigured())) return
  await syncWalletBalanceFromChain()
}

export async function runGasMaintenance() {
  if (!env.TONAPI_KEY) return
  await ensureServerTonForWithdrawals().catch(err => console.error('[gas]', err))
}

export function startChainJobs() {
  const pollMs = env.CHAIN_POLL_INTERVAL_SEC * 1000
  runChainWatcher().catch(console.error)
  runWalletSync().catch(console.error)
  runGasMaintenance().catch(console.error)
  setInterval(() => runChainWatcher().catch(console.error), pollMs)
  setInterval(() => runWalletSync().catch(console.error), 10 * 60 * 1000)
  setInterval(() => runGasMaintenance().catch(console.error), 5 * 60 * 1000)
}

import { query } from '../db/pool.js'
import { getNumericSetting, getSetting, setSetting } from './settings.service.js'
import { getTotalPlayerBalances } from './ledger.service.js'
import { getJettonBalance, getTonBalance, isTonApiConfigured } from './tonapi.service.js'
import { getServerWalletAddress } from './wallet.service.js'
import { jettonNanoToBlc } from './ton.service.js'

export async function isProjectLaunched(): Promise<boolean> {
  return Boolean(await getSetting<boolean>('project_launched'))
}

export async function getSetupStatus() {
  const launched = await isProjectLaunched()
  const minWallet = await getNumericSetting('setup_min_wallet_blc')
  const wallet = await query<{ address: string | null }>(`SELECT address FROM server_wallet WHERE id = 1`)
  const economy = await query<{ wallet_balance_blc: string; current_mode: string }>(
    `SELECT wallet_balance_blc, current_mode FROM economy_state WHERE id = 1`,
  )
  const wBlc = BigInt(economy.rows[0]?.wallet_balance_blc ?? 0)
  const pBlc = await getTotalPlayerBalances()
  const config = {
    blcJettonMaster: String(await getSetting('blc_jetton_master')),
    usdtJettonMaster: String(await getSetting('usdt_jetton_master')),
    botUsername: String(await getSetting('bot_username')) || process.env.BOT_USERNAME || '',
    tonApiConfigured: await isTonApiConfigured(),
  }

  return {
    launched,
    walletAddress: wallet.rows[0]?.address ?? null,
    walletBalanceBlc: Number(wBlc),
    onChainBlc: await fetchOnChainBlcBalance(wallet.rows[0]?.address ?? null),
    playerBalancesBlc: Number(pBlc),
    surplusBlc: Number(wBlc > pBlc ? wBlc - pBlc : 0n),
    currentMode: economy.rows[0]?.current_mode ?? 'distribution',
    setupMinWalletBlc: minWallet,
    canLaunch: !launched && wBlc >= BigInt(minWallet),
    config,
    instructions: launched
      ? null
      : [
          '1. Send BLC/TON to the server wallet address below (distribution bankroll).',
          '2. Admin: /admin → Sync wallet from chain',
          '3. Click Launch — app starts in distribution mode.',
          '4. To run distribution again later: Admin → Force mode → distribution (manual only).',
        ],
  }
}

async function fetchOnChainBlcBalance(address: string | null): Promise<number | null> {
  if (!address || !(await isTonApiConfigured())) return null
  const master = String(await getSetting('blc_jetton_master'))
  if (!master) return null
  const decimals = Number(await getSetting('blc_jetton_decimals')) || 9
  const nano = await getJettonBalance(address, master)
  return Number(jettonNanoToBlc(nano, decimals))
}

/** Sync economy W from on-chain BLC jetton balance (+ TON reserve info). */
export async function syncWalletBalanceFromChain(adminId?: number) {
  const address = await getServerWalletAddress()
  if (!address) throw new Error('Server wallet not initialized')
  if (!(await isTonApiConfigured())) throw new Error('TONAPI_KEY required')

  const master = String(await getSetting('blc_jetton_master'))
  if (!master) throw new Error('Set blc_jetton_master in admin settings first')

  const decimals = Number(await getSetting('blc_jetton_decimals')) || 9
  const jettonNano = await getJettonBalance(address, master)
  const blc = Number(jettonNanoToBlc(jettonNano, decimals))
  const tonNano = await getTonBalance(address)

  await query(`UPDATE economy_state SET wallet_balance_blc = $1 WHERE id = 1`, [blc])
  if (adminId) {
    await query(
      `INSERT INTO admin_actions (admin_telegram_id, action, payload) VALUES ($1, 'sync_wallet_chain', $2)`,
      [adminId, JSON.stringify({ blc, tonNano: tonNano.toString() })],
    )
  }
  return { walletBalanceBlc: blc, tonNano: tonNano.toString() }
}

/** Admin confirms how much is on the server wallet (after manual on-chain deposit). */
export async function setWalletBalanceBlc(amountBlc: number, adminId: number) {
  if (amountBlc < 0) throw new Error('Amount must be non-negative')
  await query(`UPDATE economy_state SET wallet_balance_blc = $1 WHERE id = 1`, [amountBlc])
  await query(
    `INSERT INTO admin_actions (admin_telegram_id, action, payload) VALUES ($1, 'setup_wallet_balance', $2)`,
    [adminId, JSON.stringify({ amountBlc })],
  )
}

/** First launch: distribution mode, then public game API unlocks. */
export async function launchProject(adminId: number) {
  const launched = await isProjectLaunched()
  if (launched) throw new Error('Project already launched')

  const minWallet = await getNumericSetting('setup_min_wallet_blc')
  const economy = await query<{ wallet_balance_blc: string }>(
    `SELECT wallet_balance_blc FROM economy_state WHERE id = 1`,
  )
  const wBlc = BigInt(economy.rows[0]?.wallet_balance_blc ?? 0)
  if (wBlc < BigInt(minWallet)) {
    throw new Error(`Wallet balance must be at least ${minWallet} BLC before launch`)
  }

  await query(
    `UPDATE economy_state SET current_mode = 'distribution', surplus_integral = 0 WHERE id = 1`,
  )
  await setSetting('project_launched', true, adminId)
  await query(
    `INSERT INTO admin_actions (admin_telegram_id, action, payload) VALUES ($1, 'project_launch', $2)`,
    [adminId, JSON.stringify({ walletBalanceBlc: Number(wBlc), mode: 'distribution' })],
  )

  return { launched: true, mode: 'distribution' as const, walletBalanceBlc: Number(wBlc) }
}

/** Only admin may re-enter distribution (see force-mode in admin routes). */
export async function forceDistributionMode(adminId: number) {
  await query(`UPDATE economy_state SET current_mode = 'distribution', surplus_integral = 0 WHERE id = 1`)
  await query(
    `INSERT INTO admin_actions (admin_telegram_id, action, payload) VALUES ($1, 'force_distribution', $2)`,
    [adminId, JSON.stringify({})],
  )
}

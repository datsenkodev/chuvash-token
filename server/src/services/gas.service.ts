import { getNumericSetting } from './settings.service.js'
import { getTonBalance } from './tonapi.service.js'
import { getServerWalletAddress } from './wallet.service.js'
import { swapBlcForTon } from './swap-execute.service.js'
import { nanoToTon, tonToNano } from './ton.service.js'
import { getBlcPerTonRate } from './rates.service.js'
import { query } from '../db/pool.js'

const DEFAULT_MIN_TON = 1
const DEFAULT_REFILL_TON = 10

/** If server TON < 1, sell BLC for ~10 TON via DeDust. */
export async function ensureServerTonForWithdrawals(): Promise<{ refilled: boolean; tonBalance: number }> {
  const address = await getServerWalletAddress()
  if (!address) return { refilled: false, tonBalance: 0 }

  const minTon = Number(await getNumericSetting('withdraw_min_ton_reserve')) || DEFAULT_MIN_TON
  const refillTarget = Number(await getNumericSetting('withdraw_ton_refill_target')) || DEFAULT_REFILL_TON

  const tonNano = await getTonBalance(address)
  const tonBal = nanoToTon(tonNano)

  if (tonNano >= tonToNano(minTon)) {
    return { refilled: false, tonBalance: tonBal }
  }

  console.log(`[gas] TON balance ${tonBal.toFixed(3)} < ${minTon}, selling BLC for ${refillTarget} TON`)
  await swapBlcForTon(refillTarget)

  await query(
    `INSERT INTO admin_actions (admin_telegram_id, action, payload) VALUES ($1, 'gas_refill', $2)`,
    [0, JSON.stringify({ tonBefore: tonBal, refillTarget })],
  )

  const after = nanoToTon(await getTonBalance(address))
  return { refilled: true, tonBalance: after }
}

/** Withdraw fee in BLC ≥ 2× estimated TON gas cost at current BLC/TON rate. */
export async function calculateWithdrawFee(amount: number): Promise<{
  fee: number
  minFeeBlc: number
  configuredFee: number
  gasTonEstimate: number
  blcPerTon: number
}> {
  const feePct = await getNumericSetting('withdraw_fee_percent')
  const feeFixed = await getNumericSetting('withdraw_fee_fixed')
  const gasTon = Number(await getNumericSetting('withdraw_gas_ton_estimate')) || 0.08
  const feeMultiplier = Number(await getNumericSetting('withdraw_fee_gas_multiplier')) || 2

  const blcPerTon = await getBlcPerTonRate()
  const minFeeBlc = Math.ceil(feeMultiplier * gasTon * blcPerTon)
  const configuredFee = Math.floor(amount * (feePct / 100) + feeFixed)
  const fee = Math.max(configuredFee, minFeeBlc)

  return { fee, minFeeBlc, configuredFee, gasTonEstimate: gasTon, blcPerTon }
}

export async function previewWithdrawFee(amount: number) {
  return calculateWithdrawFee(amount)
}

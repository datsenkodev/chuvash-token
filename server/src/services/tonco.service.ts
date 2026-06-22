import { getSetting } from './settings.service.js'
import { getTonApiRates } from './tonapi.service.js'
import { getTonClient, jettonNanoToBlc, tonToNano } from './ton.service.js'
import type { SwapQuote } from './dedust.service.js'

/** TonCo fallback: TonAPI rates (aggregates TonCo pools) + optional on-chain pool estimate. */
export async function getToncoFallbackQuote(params: {
  currency: string
  amountNano: bigint
}): Promise<SwapQuote> {
  const blcMaster = String(await getSetting('blc_jetton_master'))
  const usdtMaster = String(await getSetting('usdt_jetton_master'))
  const decimals = Number(await getSetting('blc_jetton_decimals')) || 9
  const slippageBps = Number(await getSetting('dedust_slippage_bps')) || 100

  if (!blcMaster) throw new Error('BLC jetton master not configured for TonCo fallback')

  const poolAddress = String(await getSetting('tonco_blc_pool_address'))
  if (poolAddress && params.currency === 'ton') {
    try {
      return await getToncoPoolQuote(poolAddress, params.amountNano, true, decimals, slippageBps)
    } catch {
      /* fall through to rates API */
    }
  }

  const rates = await getTonApiRates(blcMaster)
  const blcPriceTon = rates.prices.TON
  if (!blcPriceTon || blcPriceTon <= 0) throw new Error('TonCo/TonAPI: BLC price in TON unavailable')

  let outAmountBlc: number
  if (params.currency === 'ton') {
    const tonIn = Number(params.amountNano) / 1e9
    outAmountBlc = Math.floor((tonIn / blcPriceTon) * (1 - slippageBps / 10000))
  } else if (params.currency === 'usdt') {
    const usdtIn = Number(params.amountNano) / 1e6
    const tonPrice = rates.prices.TON ?? 0
    const usdPrice = rates.prices.USD ?? 0
    if (!usdPrice) throw new Error('TonCo/TonAPI: BLC USD price unavailable')
    const blcPerUsd = 1 / usdPrice
    outAmountBlc = Math.floor(usdtIn * blcPerUsd * (1 - slippageBps / 10000))
  } else if (params.currency === 'blc') {
    outAmountBlc = Math.floor(Number(jettonNanoToBlc(params.amountNano, decimals)))
  } else {
    throw new Error(`TonCo fallback: unsupported currency ${params.currency}`)
  }

  const outAmountNano = BigInt(outAmountBlc) * 10n ** BigInt(decimals)

  return {
    inAmountNano: params.amountNano,
    outAmountNano,
    outAmountBlc,
    slippageBps,
    route: { source: 'tonco_tonapi', blcPriceTon, poolAddress: poolAddress || null },
    swapData: null,
  }
}

/** On-chain TonCo pool get_swap_estimate (Algebra V3). */
async function getToncoPoolQuote(
  poolAddress: string,
  amountInNano: bigint,
  zeroToOne: boolean,
  decimals: number,
  slippageBps: number,
): Promise<SwapQuote> {
  const client = getTonClient()
  const { Address } = await import('@ton/core')
  const pool = Address.parse(poolAddress)

  const result = await client.runMethod(pool, 'get_swap_estimate', [
    { type: 'int', value: amountInNano },
    { type: 'int', value: zeroToOne ? -1n : 1n },
  ])

  const outNano = result.stack.readBigNumber()
  const outAmountBlc = Math.floor(Number(outNano) / 10 ** decimals)
  const adjusted = Math.floor(outAmountBlc * (1 - slippageBps / 10000))

  return {
    inAmountNano: amountInNano,
    outAmountNano: BigInt(adjusted) * 10n ** BigInt(decimals),
    outAmountBlc: adjusted,
    slippageBps,
    route: { source: 'tonco_pool', poolAddress },
    swapData: null,
  }
}

/** BLC per 1 TON from TonCo rates (for fee calc). */
export async function getBlcPerTonFromTonco(): Promise<number> {
  const blcMaster = String(await getSetting('blc_jetton_master'))
  const rates = await getTonApiRates(blcMaster)
  const blcPriceTon = rates.prices.TON
  if (!blcPriceTon || blcPriceTon <= 0) throw new Error('BLC/TON rate unavailable')
  return 1 / blcPriceTon
}

export async function estimateBlcForTonAmount(tonAmount: number): Promise<number> {
  const quote = await getToncoFallbackQuote({ currency: 'ton', amountNano: tonToNano(tonAmount) })
  return quote.outAmountBlc
}

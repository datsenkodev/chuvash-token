import { getRoutedSwapQuote, executeRoutedSwap, executeRoutedSwapWithFallback } from './swap-router.service.js'
import { getDedustQuote } from './dedust.service.js'
import { executeDedustSwap } from './dedust.service.js'
import { tonToNano, blcToJettonNano } from './ton.service.js'
import { getSetting } from './settings.service.js'

/** TON/USDT → BLC via routed swap (DeDust and/or TonCo). */
export async function swapDepositToBlc(currency: string, amountNano: bigint): Promise<bigint> {
  const quote = await getRoutedSwapQuote({ currency, amountNano })

  if (!quote.executable) {
    throw new Error(`No executable route for ${currency}→BLC (${quote.source} quote only)`)
  }

  const executed = await executeRoutedSwapWithFallback(quote, { currency, amountNano })
  return BigInt(executed.outAmountBlc)
}

/** Sell BLC for TON when gas is low. Uses router (DeDust first, TonCo fallback). */
export async function swapBlcForTon(tonOutTarget: number): Promise<void> {
  const tonNano = tonToNano(tonOutTarget)
  const decimals = Number(await getSetting('blc_jetton_decimals')) || 9

  try {
    const quote = await getRoutedSwapQuote({
      currency: 'blc',
      amountNano: tonNano,
      swapMode: 'exact_out',
      outMinter: 'native',
    })
    if (quote.executable) {
      await executeRoutedSwapWithFallback(quote, { currency: 'blc', amountNano: tonNano })
      return
    }
  } catch (e) {
    console.warn('[gas] routed exact_out failed:', e)
  }

  const blcPerTon = (await getRoutedSwapQuote({ currency: 'ton', amountNano: tonToNano(1) })).outAmountBlc
  const blcIn = BigInt(Math.ceil(tonOutTarget * blcPerTon * 1.1))
  const inQuote = await getRoutedSwapQuote({
    currency: 'blc',
    amountNano: blcToJettonNano(blcIn, decimals),
    swapMode: 'exact_in',
    outMinter: 'native',
  })

  if (inQuote.executable) {
    await executeRoutedSwapWithFallback(inQuote, {
      currency: 'blc',
      amountNano: blcToJettonNano(blcIn, decimals),
    })
    return
  }

  const dedust = await getDedustQuote({
    currency: 'blc',
    amountNano: blcToJettonNano(blcIn, decimals),
    swapMode: 'exact_in',
    outMinter: 'native',
  })
  if (dedust.swapData) {
    await executeDedustSwap(dedust.swapData)
    return
  }
  throw new Error('BLC→TON swap unavailable on DeDust and TonCo')
}

export { executeDedustSwap }

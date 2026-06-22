import { getRoutedSwapQuote, type RoutedSwapQuote } from './swap-router.service.js'
import { tonToNano } from './ton.service.js'
import { getBlcPerTonFromTonco } from './tonco.service.js'

export type QuoteSource = 'dedust' | 'tonco'

export type UnifiedSwapQuote = RoutedSwapQuote

export async function getSwapQuote(params: {
  currency: string
  amountNano: bigint
  swapMode?: 'exact_in' | 'exact_out'
  outMinter?: string
}): Promise<RoutedSwapQuote> {
  return getRoutedSwapQuote(params)
}

export async function getBlcPerTonRate(): Promise<number> {
  try {
    const q = await getSwapQuote({ currency: 'ton', amountNano: tonToNano(1) })
    return q.outAmountBlc
  } catch {
    return getBlcPerTonFromTonco()
  }
}

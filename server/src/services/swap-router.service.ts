import { getDedustQuote, type SwapQuote } from './dedust.service.js'
import { getToncoSwapQuote, executeToncoSwap, type ToncoExecPlan } from './tonco-swap.service.js'
import { getToncoFallbackQuote } from './tonco.service.js'
import { getSetting, getNumericSetting } from './settings.service.js'

export type SwapVenue = 'dedust' | 'tonco'
export type SwapRouterStrategy =
  | 'dedust_first'
  | 'tonco_first'
  | 'best_quote'
  | 'dedust_only'
  | 'tonco_only'

export interface RoutedSwapQuote extends SwapQuote {
  source: SwapVenue
  executable: boolean
  execPlan: unknown | null
}

async function getRouterConfig() {
  const strategy = String(await getSetting('swap_router_strategy')) as SwapRouterStrategy
  const dedustEnabled = Boolean(await getSetting('dedust_swap_enabled'))
  const toncoEnabled = Boolean(await getSetting('tonco_swap_enabled'))
  const allowToncoFallback = Boolean(await getSetting('swap_allow_tonco_fallback'))
  return { strategy, dedustEnabled, toncoEnabled, allowToncoFallback }
}

async function fetchDedustQuote(params: {
  currency: string
  amountNano: bigint
  swapMode?: 'exact_in' | 'exact_out'
  outMinter?: string
}): Promise<RoutedSwapQuote | null> {
  const maxSplits = Number(await getNumericSetting('dedust_max_splits')) || 4
  const maxLength = Number(await getNumericSetting('dedust_max_length')) || 3
  void maxSplits
  void maxLength

  const q = await getDedustQuote(params)
  return {
    ...q,
    source: 'dedust',
    executable: Boolean(q.swapData),
    execPlan: q.swapData,
  }
}

async function fetchToncoQuote(params: {
  currency: string
  amountNano: bigint
  swapMode?: 'exact_in' | 'exact_out'
  outMinter?: string
}): Promise<RoutedSwapQuote | null> {
  try {
    const q = await getToncoSwapQuote(params)
    return {
      ...q,
      source: 'tonco',
      executable: Boolean(q.execPlan),
      execPlan: q.execPlan,
    }
  } catch {
    if (params.swapMode === 'exact_out' || params.outMinter === 'native') return null
    const fallback = await getToncoFallbackQuote(params)
    return {
      ...fallback,
      source: 'tonco',
      executable: false,
      execPlan: null,
    }
  }
}

function pickBest(quotes: RoutedSwapQuote[]): RoutedSwapQuote {
  return quotes.reduce((best, q) => (q.outAmountBlc > best.outAmountBlc ? q : best))
}

/** Unified quote with routing: DeDust + TonCo per strategy settings. */
export async function getRoutedSwapQuote(params: {
  currency: string
  amountNano: bigint
  swapMode?: 'exact_in' | 'exact_out'
  outMinter?: string
}): Promise<RoutedSwapQuote> {
  const { strategy, dedustEnabled, toncoEnabled, allowToncoFallback } = await getRouterConfig()
  const quotes: RoutedSwapQuote[] = []

  const tryDedust = dedustEnabled && strategy !== 'tonco_only'
  const tryTonco = toncoEnabled && strategy !== 'dedust_only'

  if (tryDedust) {
    try {
      const q = await fetchDedustQuote(params)
      if (q) quotes.push(q)
    } catch (e) {
      console.warn('[router] DeDust quote failed:', e)
    }
  }

  if (tryTonco) {
    try {
      const q = await fetchToncoQuote(params)
      if (q) quotes.push(q)
    } catch (e) {
      console.warn('[router] TonCo quote failed:', e)
    }
  }

  if (!quotes.length) throw new Error('No swap route available (DeDust/TonCo)')

  if (strategy === 'dedust_first') {
    const dedust = quotes.find(q => q.source === 'dedust' && q.executable)
    if (dedust) return dedust
    const dedustQuote = quotes.find(q => q.source === 'dedust')
    if (dedustQuote) return dedustQuote
    if (allowToncoFallback) {
      const tonco = quotes.find(q => q.source === 'tonco' && q.executable)
      if (tonco) return tonco
    }
    return quotes.find(q => q.source === 'tonco') ?? quotes[0]
  }

  if (strategy === 'tonco_first') {
    const tonco = quotes.find(q => q.source === 'tonco' && q.executable)
    if (tonco) return tonco
    const toncoQuote = quotes.find(q => q.source === 'tonco')
    if (toncoQuote) return toncoQuote
    return quotes.find(q => q.source === 'dedust') ?? quotes[0]
  }

  if (strategy === 'best_quote') {
    const executable = quotes.filter(q => q.executable)
    if (executable.length) return pickBest(executable)
    return pickBest(quotes)
  }

  if (strategy === 'dedust_only') {
    const q = quotes.find(x => x.source === 'dedust')
    if (!q) throw new Error('DeDust-only mode: no DeDust route')
    return q
  }

  if (strategy === 'tonco_only') {
    const q = quotes.find(x => x.source === 'tonco')
    if (!q) throw new Error('TonCo-only mode: no TonCo route')
    return q
  }

  return pickBest(quotes)
}

/** Execute swap on the venue that provided the quote. */
export async function executeRoutedSwap(quote: RoutedSwapQuote): Promise<void> {
  if (quote.source === 'dedust' && quote.execPlan) {
    const { executeDedustSwap } = await import('./dedust.service.js')
    await executeDedustSwap(quote.execPlan)
    return
  }

  if (quote.source === 'tonco' && quote.execPlan) {
    await executeToncoSwap(quote.execPlan as ToncoExecPlan)
    return
  }

  throw new Error(`Quote from ${quote.source} is not executable — configure pool addresses or DeDust API`)
}

/** Try primary venue, fallback to alternate on execution failure. */
export async function executeRoutedSwapWithFallback(
  quote: RoutedSwapQuote,
  params: { currency: string; amountNano: bigint; swapMode?: 'exact_in' | 'exact_out'; outMinter?: string },
): Promise<RoutedSwapQuote> {
  try {
    await executeRoutedSwap(quote)
    return quote
  } catch (primaryErr) {
    const { allowToncoFallback, dedustEnabled, toncoEnabled } = await getRouterConfig()
    if (!allowToncoFallback) throw primaryErr

    const altVenue: SwapVenue = quote.source === 'dedust' ? 'tonco' : 'dedust'
    if (altVenue === 'tonco' && !toncoEnabled) throw primaryErr
    if (altVenue === 'dedust' && !dedustEnabled) throw primaryErr

    const altQuote =
      altVenue === 'tonco' ? await fetchToncoQuote(params) : await fetchDedustQuote(params)
    if (!altQuote?.executable) throw primaryErr
    await executeRoutedSwap(altQuote)
    return altQuote
  }
}

import { getDedustApiUrl } from '../config/env.js'
import { getSetting } from './settings.service.js'

export interface SwapQuote {
  inAmountNano: bigint
  outAmountNano: bigint
  outAmountBlc: number
  slippageBps: number
  route: unknown
  swapData: unknown | null
}

function jettonMinter(currency: string, blcMaster: string, usdtMaster: string): string {
  if (currency === 'ton') return 'native'
  if (currency === 'usdt') return usdtMaster
  if (currency === 'blc') return blcMaster
  throw new Error(`Unsupported currency: ${currency}`)
}

export async function getDedustQuote(params: {
  currency: string
  amountNano: bigint
  swapMode?: 'exact_in' | 'exact_out'
  outMinter?: string
}): Promise<SwapQuote> {
  const blcMaster = String(await getSetting('blc_jetton_master'))
  const usdtMaster = String(await getSetting('usdt_jetton_master'))
  if (!blcMaster) throw new Error('BLC jetton master not configured')

  const slippageBps = Number(await getSetting('dedust_slippage_bps')) || 100
  const maxSplits = Number(await getSetting('dedust_max_splits')) || 4
  const maxLength = Number(await getSetting('dedust_max_length')) || 3
  const decimals = Number(await getSetting('blc_jetton_decimals')) || 9
  const swapMode = params.swapMode ?? 'exact_in'

  let inMinter: string
  let outMinter: string

  if (params.outMinter === 'native') {
    inMinter = blcMaster
    outMinter = 'native'
  } else {
    inMinter = jettonMinter(params.currency, blcMaster, usdtMaster)
    outMinter = blcMaster
  }

  if (params.currency === 'blc' && swapMode === 'exact_in' && params.outMinter !== 'native') {
    const blc = Number(params.amountNano) / 10 ** decimals
    return {
      inAmountNano: params.amountNano,
      outAmountNano: params.amountNano,
      outAmountBlc: Math.floor(blc),
      slippageBps,
      route: null,
      swapData: null,
    }
  }

  const res = await fetch(`${getDedustApiUrl()}/quote`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Accept: 'application/json' },
    body: JSON.stringify({
      in_minter: inMinter,
      out_minter: outMinter,
      amount: params.amountNano.toString(),
      swap_mode: swapMode,
      slippage_bps: slippageBps,
      max_splits: maxSplits,
      max_length: maxLength,
    }),
  })

  if (!res.ok) {
    const text = await res.text()
    throw new Error(`DeDust quote failed: ${text.slice(0, 200)}`)
  }

  const data = (await res.json()) as Record<string, unknown>
  const swapData = data.swap_data ?? null
  const outRaw =
    data.out_amount ?? data.outAmount ?? (swapData as Record<string, unknown> | null)?.out_amount
  const outAmountNano = BigInt(String(outRaw ?? 0))

  const outAmountBlc =
    outMinter === 'native'
      ? 0
      : Math.floor(Number(outAmountNano) / 10 ** decimals)

  return {
    inAmountNano: params.amountNano,
    outAmountNano,
    outAmountBlc,
    slippageBps,
    route: data,
    swapData,
  }
}

export async function buildDedustSwapTransactions(senderAddress: string, swapData: unknown) {
  const res = await fetch(`${getDedustApiUrl()}/swap`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Accept: 'application/json' },
    body: JSON.stringify({ sender_address: senderAddress, swap_data: swapData }),
  })
  if (!res.ok) {
    const text = await res.text()
    throw new Error(`DeDust swap build failed: ${text.slice(0, 200)}`)
  }
  return res.json() as Promise<{ transactions?: Array<{ address: string; amount: string; payload?: string }> }>
}

export async function executeDedustSwap(swapData: unknown): Promise<void> {
  const { Cell } = await import('@ton/core')
  const { internal } = await import('@ton/ton')
  const { getOpenedServerWallet } = await import('./ton.service.js')
  const { getServerWalletAddress } = await import('./wallet.service.js')

  const sender = await getServerWalletAddress()
  if (!sender) throw new Error('Server wallet not ready')

  const built = await buildDedustSwapTransactions(sender, swapData)
  const txs = built.transactions ?? []
  if (!txs.length) throw new Error('DeDust returned no transactions')

  const { contract, keyPair } = await getOpenedServerWallet()
  let seqno = await contract.getSeqno()

  for (const tx of txs) {
    const body = tx.payload ? Cell.fromBase64(tx.payload) : undefined
    await contract.sendTransfer({
      seqno,
      secretKey: keyPair.secretKey,
      messages: [internal({ to: tx.address, value: BigInt(tx.amount), body })],
    })
    seqno++
    await new Promise(r => setTimeout(r, 2000))
  }
}

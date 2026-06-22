import { env, getTonApiBase } from '../config/env.js'

type TonApiEvent = {
  event_id: string
  timestamp: number
  actions?: Array<{
    type: string
    status?: string
    TonTransfer?: {
      amount: number
      comment?: string
      sender?: { address?: string }
      recipient?: { address?: string }
    }
    JettonTransfer?: {
      amount: string
      comment?: string
      sender?: { address?: string }
      recipient?: { address?: string }
      jetton?: { address?: string }
    }
  }>
  lt?: number
}

function headers(): Record<string, string> {
  const h: Record<string, string> = { Accept: 'application/json' }
  if (env.TONAPI_KEY) h.Authorization = `Bearer ${env.TONAPI_KEY}`
  return h
}

async function tonApiFetch<T>(path: string): Promise<T> {
  if (!env.TONAPI_KEY) throw new Error('TONAPI_KEY is required for chain operations')
  const res = await fetch(`${getTonApiBase()}${path}`, { headers: headers() })
  if (!res.ok) {
    const text = await res.text()
    throw new Error(`TonAPI ${res.status}: ${text.slice(0, 200)}`)
  }
  return res.json() as Promise<T>
}

export async function getAccountEvents(accountAddress: string, beforeLt?: string): Promise<TonApiEvent[]> {
  const encoded = encodeURIComponent(accountAddress)
  let path = `/accounts/${encoded}/events?limit=50`
  if (beforeLt) path += `&before_lt=${beforeLt}`
  const data = await tonApiFetch<{ events: TonApiEvent[] }>(path)
  return data.events ?? []
}

export async function getJettonBalance(accountAddress: string, jettonMaster: string): Promise<bigint> {
  const acc = encodeURIComponent(accountAddress)
  const jetton = encodeURIComponent(jettonMaster)
  try {
    const data = await tonApiFetch<{ balance: string }>(`/accounts/${acc}/jettons/${jetton}`)
    return BigInt(data.balance ?? 0)
  } catch {
    return 0n
  }
}

export async function getTonBalance(accountAddress: string): Promise<bigint> {
  const acc = encodeURIComponent(accountAddress)
  const data = await tonApiFetch<{ balance: number }>(`/accounts/${acc}`)
  return BigInt(data.balance ?? 0)
}

export async function getTonApiRates(jettonMaster: string): Promise<{ prices: Record<string, number> }> {
  const token = encodeURIComponent(jettonMaster)
  const data = await tonApiFetch<{ rates: Record<string, { prices: Record<string, number> }> }>(
    `/rates?tokens=${token}&currencies=ton,usd`,
  )
  const rates = data.rates ?? {}
  const entry = rates[jettonMaster] ?? Object.values(rates)[0]
  return { prices: entry?.prices ?? {} }
}

export type ParsedChainTransfer = {
  eventId: string
  txHash: string
  kind: 'ton' | 'jetton'
  amountNano: bigint
  comment: string | null
  jettonMaster: string | null
}

export function parseEventTransfers(event: TonApiEvent, serverAddress: string): ParsedChainTransfer[] {
  const out: ParsedChainTransfer[] = []
  const serverNorm = serverAddress.toLowerCase()

  for (const action of event.actions ?? []) {
    if (action.status && action.status !== 'ok') continue

    if (action.type === 'TonTransfer' && action.TonTransfer) {
      const t = action.TonTransfer
      const recipient = t.recipient?.address?.toLowerCase() ?? ''
      if (!recipient.includes(serverNorm.replace(/^0:/, '')) && recipient !== serverNorm) {
        if (!t.recipient?.address || !addressesMatch(t.recipient.address, serverAddress)) continue
      }
      out.push({
        eventId: event.event_id,
        txHash: event.event_id,
        kind: 'ton',
        amountNano: BigInt(t.amount ?? 0),
        comment: t.comment ?? null,
        jettonMaster: null,
      })
    }

    if (action.type === 'JettonTransfer' && action.JettonTransfer) {
      const j = action.JettonTransfer
      if (!j.recipient?.address || !addressesMatch(j.recipient.address, serverAddress)) continue
      out.push({
        eventId: event.event_id,
        txHash: event.event_id,
        kind: 'jetton',
        amountNano: BigInt(j.amount ?? 0),
        comment: j.comment ?? null,
        jettonMaster: j.jetton?.address ?? null,
      })
    }
  }
  return out
}

function addressesMatch(a: string, b: string): boolean {
  try {
    const na = a.toLowerCase()
    const nb = b.toLowerCase()
    return na === nb || na.includes(nb.slice(-48)) || nb.includes(na.slice(-48))
  } catch {
    return false
  }
}

export async function isTonApiConfigured(): Promise<boolean> {
  return env.TONAPI_KEY.length > 0
}

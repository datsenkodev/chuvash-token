import { Address, beginCell, Cell } from '@ton/core'
import { keyPairFromSecretKey } from '@ton/crypto'
import { internal, TonClient, WalletContractV4, toNano } from '@ton/ton'
import { env, getTonCenterEndpoint } from '../config/env.js'
import { query } from '../db/pool.js'
import { decryptPrivateKey } from './wallet.service.js'

let client: TonClient | null = null

export function getTonClient(): TonClient {
  if (!client) {
    client = new TonClient({
      endpoint: getTonCenterEndpoint(),
      apiKey: env.TONCENTER_API_KEY || undefined,
    })
  }
  return client
}

export async function getWalletKeyPair() {
  const row = await query<{ encrypted_private_key: string }>(
    `SELECT encrypted_private_key FROM server_wallet WHERE id = 1`,
  )
  if (!row.rows[0]?.encrypted_private_key) throw new Error('Server wallet not initialized')
  const secretHex = decryptPrivateKey(row.rows[0].encrypted_private_key)
  return keyPairFromSecretKey(Buffer.from(secretHex, 'hex'))
}

export async function getOpenedServerWallet() {
  const keyPair = await getWalletKeyPair()
  const wallet = WalletContractV4.create({ workchain: 0, publicKey: keyPair.publicKey })
  const contract = getTonClient().open(wallet)
  return { contract, keyPair, wallet }
}

export function parseTonAddress(raw: string): Address {
  try {
    return Address.parse(raw.trim())
  } catch {
    throw new Error('Invalid TON address')
  }
}

export function toUserFriendlyAddress(addr: Address): string {
  return addr.toString({ bounceable: false, urlSafe: true })
}

export async function getJettonWalletAddress(jettonMaster: string, owner: Address): Promise<Address> {
  const master = parseTonAddress(jettonMaster)
  const client = getTonClient()
  const res = await client.runMethod(master, 'get_wallet_address', [
    {
      type: 'slice',
      cell: beginCell().storeAddress(owner).endCell(),
    },
  ])
  return res.stack.readAddress()
}

export function buildJettonTransferBody(params: {
  amount: bigint
  destination: Address
  responseAddress: Address
  forwardPayload?: Cell
}): Cell {
  const body = beginCell()
    .storeUint(0xf8a7ea5, 32)
    .storeUint(0, 64)
    .storeCoins(params.amount)
    .storeAddress(params.destination)
    .storeAddress(params.responseAddress)
    .storeBit(0)
    .storeCoins(toNano('0.01'))

  if (params.forwardPayload) {
    body.storeBit(1).storeRef(params.forwardPayload)
  } else {
    body.storeBit(0)
  }
  return body.endCell()
}

export async function sendJettonTransfer(params: {
  jettonMaster: string
  toAddress: string
  jettonAmountNano: bigint
}) {
  const { contract, keyPair, wallet } = await getOpenedServerWallet()
  const owner = wallet.address
  const jettonWallet = await getJettonWalletAddress(params.jettonMaster, owner)
  const destination = parseTonAddress(params.toAddress)

  const body = buildJettonTransferBody({
    amount: params.jettonAmountNano,
    destination,
    responseAddress: owner,
  })

  const seqno = await contract.getSeqno()
  await contract.sendTransfer({
    seqno,
    secretKey: keyPair.secretKey,
    messages: [
      internal({
        to: jettonWallet,
        value: toNano('0.08'),
        body,
      }),
    ],
  })

  return { seqno, from: toUserFriendlyAddress(owner) }
}

export async function sendTonTransfer(params: { toAddress: string; amountNano: bigint; comment?: string }) {
  const { contract, keyPair } = await getOpenedServerWallet()
  const destination = parseTonAddress(params.toAddress)

  let body: Cell | undefined
  if (params.comment) {
    body = beginCell().storeUint(0, 32).storeStringTail(params.comment).endCell()
  }

  const seqno = await contract.getSeqno()
  await contract.sendTransfer({
    seqno,
    secretKey: keyPair.secretKey,
    messages: [
      internal({
        to: destination,
        value: params.amountNano,
        body,
      }),
    ],
  })
  return { seqno }
}

export function blcToJettonNano(blcAmount: number | bigint, decimals: number): bigint {
  const factor = 10n ** BigInt(decimals)
  return BigInt(blcAmount) * factor
}

export function jettonNanoToBlc(amountNano: bigint, decimals: number): bigint {
  const factor = 10n ** BigInt(decimals)
  return amountNano / factor
}

export function tonToNano(ton: number): bigint {
  return BigInt(Math.floor(ton * 1e9))
}

export function nanoToTon(nano: bigint): number {
  return Number(nano) / 1e9
}

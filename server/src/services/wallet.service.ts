import crypto from 'crypto'
import { WalletContractV4 } from '@ton/ton'
import { keyPairFromSeed } from '@ton/crypto'
import { env } from '../config/env.js'
import { query } from '../db/pool.js'

const ALGORITHM = 'aes-256-gcm'

function getKey() {
  return crypto.createHash('sha256').update(env.WALLET_ENCRYPTION_KEY).digest()
}

export function encryptPrivateKey(plain: string): string {
  const iv = crypto.randomBytes(12)
  const cipher = crypto.createCipheriv(ALGORITHM, getKey(), iv)
  const enc = Buffer.concat([cipher.update(plain, 'utf8'), cipher.final()])
  const tag = cipher.getAuthTag()
  return Buffer.concat([iv, tag, enc]).toString('base64')
}

export function decryptPrivateKey(encrypted: string): string {
  const buf = Buffer.from(encrypted, 'base64')
  const iv = buf.subarray(0, 12)
  const tag = buf.subarray(12, 28)
  const data = buf.subarray(28)
  const decipher = crypto.createDecipheriv(ALGORITHM, getKey(), iv)
  decipher.setAuthTag(tag)
  return Buffer.concat([decipher.update(data), decipher.final()]).toString('utf8')
}

export function generateWalletKeyPair() {
  const seed = crypto.randomBytes(32)
  const keyPair = keyPairFromSeed(seed)
  const wallet = WalletContractV4.create({ workchain: 0, publicKey: keyPair.publicKey })
  return {
    keyPair,
    address: wallet.address.toString({ bounceable: false, urlSafe: true }),
    secretHex: Buffer.from(keyPair.secretKey).toString('hex'),
  }
}

export async function persistWalletKeyPair(secretHex: string, address: string) {
  const encrypted = encryptPrivateKey(secretHex)
  await query(
    `INSERT INTO server_wallet (id, address, encrypted_private_key) VALUES (1, $1, $2)
     ON CONFLICT (id) DO UPDATE SET address = EXCLUDED.address, encrypted_private_key = EXCLUDED.encrypted_private_key`,
    [address, encrypted],
  )
}

export async function ensureServerWallet() {
  const existing = await query<{ address: string | null }>(`SELECT address FROM server_wallet WHERE id = 1`)
  if (existing.rows[0]?.address) return existing.rows[0].address as string

  const { secretHex, address } = generateWalletKeyPair()
  await persistWalletKeyPair(secretHex, address)
  return address
}

export async function getServerWalletAddress(): Promise<string | null> {
  const res = await query<{ address: string | null }>(`SELECT address FROM server_wallet WHERE id = 1`)
  return res.rows[0]?.address ?? null
}

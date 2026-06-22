import dotenv from 'dotenv'
import { z } from 'zod'

dotenv.config()

const envSchema = z.object({
  PORT: z.coerce.number().default(3000),
  DATABASE_URL: z.string().default('postgresql://bulcoin:bulcoin@localhost:5432/bulcoin'),
  BOT_TOKEN: z.string().default('dev-token'),
  BOT_USERNAME: z.string().default(''),
  ADMIN_TELEGRAM_IDS: z.string().default(''),
  WALLET_ENCRYPTION_KEY: z.string().min(32).default('dev_encryption_key_32_chars_min!!'),
  TON_NETWORK: z.enum(['mainnet', 'testnet']).default('mainnet'),
  TONAPI_KEY: z.string().default(''),
  TONCENTER_API_KEY: z.string().default(''),
  DEDUST_API_URL: z.string().default(''),
  BLC_JETTON_MASTER: z.string().default(''),
  USDT_JETTON_MASTER: z.string().default(''),
  CHAIN_WEBHOOK_SECRET: z.string().default(''),
  CHAIN_POLL_INTERVAL_SEC: z.coerce.number().default(30),
  DEV_MODE: z
    .union([z.string(), z.boolean()])
    .transform(v => v === true || v === 'true')
    .default(false),
  DEV_TELEGRAM_USER_ID: z.coerce.number().default(999001),
  DEV_TELEGRAM_USERNAME: z.string().default('devuser'),
  APP_VERSION: z.string().default('1.0.0'),
})

export const env = envSchema.parse(process.env)

export function getAdminIds(): number[] {
  return env.ADMIN_TELEGRAM_IDS.split(',')
    .map(s => s.trim())
    .filter(Boolean)
    .map(Number)
}

export function getTonApiBase(): string {
  return env.TON_NETWORK === 'testnet' ? 'https://testnet.tonapi.io/v2' : 'https://tonapi.io/v2'
}

export function getTonCenterEndpoint(): string {
  return env.TON_NETWORK === 'testnet'
    ? 'https://testnet.toncenter.com/api/v2/jsonRPC'
    : 'https://toncenter.com/api/v2/jsonRPC'
}

export function getDedustApiUrl(): string {
  if (env.DEDUST_API_URL) return env.DEDUST_API_URL
  return env.TON_NETWORK === 'testnet'
    ? 'https://api-testnet.dedust.io/v2'
    : 'https://api-mainnet.dedust.io/v2'
}

export function getConfigStatus() {
  return {
    botToken: env.BOT_TOKEN.length > 10 && env.BOT_TOKEN !== 'dev-token',
    tonapiKey: env.TONAPI_KEY.length > 0,
    toncenterKey: env.TONCENTER_API_KEY.length > 0,
    walletEncryptionKey: env.WALLET_ENCRYPTION_KEY.length >= 32,
    adminIds: getAdminIds().length > 0,
    tonNetwork: env.TON_NETWORK,
    dedustApiUrl: getDedustApiUrl(),
  }
}

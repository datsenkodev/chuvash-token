import crypto from 'crypto'
import { FastifyRequest, FastifyReply } from 'fastify'
import { env } from '../config/env.js'
import { query } from '../db/pool.js'

export interface TelegramUser {
  id: number
  first_name?: string
  last_name?: string
  username?: string
}

export interface AuthContext {
  telegramUser: TelegramUser
  userId: string
  isAdmin: boolean
}

declare module 'fastify' {
  interface FastifyRequest {
    auth?: AuthContext
  }
}

function validateInitData(initData: string, botToken: string): boolean {
  try {
    const params = new URLSearchParams(initData)
    const hash = params.get('hash')
    if (!hash) return false
    params.delete('hash')
    const dataCheckString = [...params.entries()]
      .sort(([a], [b]) => a.localeCompare(b))
      .map(([k, v]) => `${k}=${v}`)
      .join('\n')
    const secretKey = crypto.createHmac('sha256', 'WebAppData').update(botToken).digest()
    const calculated = crypto.createHmac('sha256', secretKey).update(dataCheckString).digest('hex')
    return calculated === hash
  } catch {
    return false
  }
}

function parseUser(initData: string): TelegramUser | null {
  const params = new URLSearchParams(initData)
  const userJson = params.get('user')
  if (!userJson) return null
  return JSON.parse(userJson) as TelegramUser
}

async function upsertUser(tg: TelegramUser) {
  const res = await query<{ id: string }>(
    `INSERT INTO users (telegram_id, username, first_name, last_name)
     VALUES ($1, $2, $3, $4)
     ON CONFLICT (telegram_id) DO UPDATE SET
       username = EXCLUDED.username,
       first_name = EXCLUDED.first_name,
       last_name = EXCLUDED.last_name
     RETURNING id`,
    [tg.id, tg.username ?? null, tg.first_name ?? null, tg.last_name ?? null],
  )
  const userId = res.rows[0].id
  await query(`INSERT INTO balances (user_id, blc_amount) VALUES ($1, 0) ON CONFLICT DO NOTHING`, [userId])
  await query(
    `INSERT INTO free_card_state (user_id, next_available_at, last_interval_sec)
     VALUES ($1, NOW(), 600) ON CONFLICT DO NOTHING`,
    [userId],
  )
  return userId
}

export async function telegramAuthMiddleware(request: FastifyRequest, reply: FastifyReply) {
  const initData = request.headers['x-telegram-init-data'] as string | undefined

  let tgUser: TelegramUser | null = null

  if (initData && initData.length > 0) {
    if (env.BOT_TOKEN !== 'dev-token' && !validateInitData(initData, env.BOT_TOKEN)) {
      return reply.status(401).send({ error: 'Invalid Telegram init data' })
    }
    const params = new URLSearchParams(initData)
    const authDate = parseInt(params.get('auth_date') ?? '0', 10)
    if (env.BOT_TOKEN !== 'dev-token' && authDate > 0 && Date.now() / 1000 - authDate > 86400) {
      return reply.status(401).send({ error: 'Telegram init data expired' })
    }
    tgUser = parseUser(initData)
  }

  if (!tgUser && env.DEV_MODE) {
    tgUser = {
      id: env.DEV_TELEGRAM_USER_ID,
      username: env.DEV_TELEGRAM_USERNAME,
      first_name: 'Dev',
      last_name: 'User',
    }
  }

  if (!tgUser) {
    return reply.status(401).send({ error: 'Telegram authentication required' })
  }

  const userId = await upsertUser(tgUser)
  const adminIds = env.ADMIN_TELEGRAM_IDS.split(',')
    .map(s => s.trim())
    .filter(Boolean)
    .map(Number)
  const dbAdmin = await query(`SELECT 1 FROM admins WHERE telegram_id = $1`, [tgUser.id])
  const isAdmin = adminIds.includes(tgUser.id) || dbAdmin.rowCount! > 0

  request.auth = { telegramUser: tgUser, userId, isAdmin }
}

export async function adminOnlyMiddleware(request: FastifyRequest, reply: FastifyReply) {
  if (!request.auth?.isAdmin) {
    return reply.status(403).send({ error: 'Admin access required' })
  }
}

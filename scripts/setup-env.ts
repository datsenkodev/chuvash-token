/**
 * Creates .env from .env.example and generates secrets.
 * Run: npm run setup:env
 */
import crypto from 'crypto'
import fs from 'fs'
import path from 'path'
import { fileURLToPath } from 'url'

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..')
const envPath = path.join(root, '.env')
const examplePath = path.join(root, '.env.example')

const PLACEHOLDER_KEYS = new Set([
  'change_me_32_char_minimum_secret!!',
  'random_webhook_secret',
  'your_telegram_bot_token',
  'your_bot_username',
  'your_tonapi_io_key',
  'your_toncenter_api_key',
  'EQ...',
  '',
])

function parseEnv(text: string): { lines: string[]; values: Map<string, string> } {
  const lines = text.split(/\r?\n/)
  const values = new Map<string, string>()
  for (const line of lines) {
    const m = line.match(/^([A-Za-z_][A-Za-z0-9_]*)=(.*)$/)
    if (m) values.set(m[1], m[2])
  }
  return { lines, values }
}

function isPlaceholder(v: string | undefined): boolean {
  if (v == null) return true
  const t = v.trim()
  return PLACEHOLDER_KEYS.has(t) || t.startsWith('your_')
}

function setInLines(lines: string[], key: string, value: string): string[] {
  let found = false
  const out = lines.map(line => {
    if (line.startsWith(`${key}=`)) {
      found = true
      return `${key}=${value}`
    }
    return line
  })
  if (!found) out.push(`${key}=${value}`)
  return out
}

function dedustUrl(network: string): string {
  return network === 'testnet'
    ? 'https://api-testnet.dedust.io/v2'
    : 'https://api-mainnet.dedust.io/v2'
}

function main() {
  if (!fs.existsSync(examplePath)) {
    console.error('.env.example not found')
    process.exit(1)
  }

  const created = !fs.existsSync(envPath)
  if (created) {
    fs.copyFileSync(examplePath, envPath)
    console.log('Created .env from .env.example\n')
  }

  let text = fs.readFileSync(envPath, 'utf8')
  let { lines, values } = parseEnv(text)
  const generated: string[] = []

  if (isPlaceholder(values.get('WALLET_ENCRYPTION_KEY'))) {
    const key = crypto.randomBytes(32).toString('base64')
    lines = setInLines(lines, 'WALLET_ENCRYPTION_KEY', key)
    generated.push('WALLET_ENCRYPTION_KEY')
  }

  if (isPlaceholder(values.get('CHAIN_WEBHOOK_SECRET'))) {
    const secret = crypto.randomBytes(24).toString('hex')
    lines = setInLines(lines, 'CHAIN_WEBHOOK_SECRET', secret)
    generated.push('CHAIN_WEBHOOK_SECRET')
  }

  const network = values.get('TON_NETWORK') ?? 'mainnet'
  const dedust = values.get('DEDUST_API_URL') ?? ''
  if (!dedust || dedust.includes('mainnet') && network === 'testnet') {
    lines = setInLines(lines, 'DEDUST_API_URL', dedustUrl(network))
    generated.push('DEDUST_API_URL')
  }

  fs.writeFileSync(envPath, lines.join('\n') + '\n')

  if (generated.length) {
    console.log('Auto-generated in .env:')
    for (const k of generated) console.log(`  ✓ ${k}`)
    console.log('')
  } else if (!created) {
    console.log('Secrets already set — skipped generation.\n')
  }

  console.log('Auto on first API start:')
  console.log('  ✓ Server wallet address (see log: "Server wallet: EQ...")\n')

  console.log('Fill manually in .env:\n')
  console.log('  BOT_TOKEN')
  console.log('    https://t.me/BotFather → /newbot or /token\n')
  console.log('  BOT_USERNAME')
  console.log('    username бота без @ (тот же BotFather)\n')
  console.log('  ADMIN_TELEGRAM_IDS')
  console.log('    https://t.me/userinfobot → Id\n')
  console.log('  TONAPI_KEY')
  console.log('    https://tonconsole.com → проект → API Keys\n')
  console.log('  TONCENTER_API_KEY')
  console.log('    https://t.me/tonapibot → /get_api_key\n')
  console.log('  BLC_JETTON_MASTER')
  console.log('    ваш jetton master или https://tonviewer.com (поиск BLC)\n')
  console.log('  USDT_JETTON_MASTER (опционально, mainnet jUSDT)')
  console.log('    https://tonviewer.com/EQCxE6mUtQJKFnGfaROTKOt1lZbDiiX1kCixRv7Nw2Id_sDs\n')
  console.log('TonCo pool addresses — в /admin после деплоя:')
  console.log('  https://app.tonco.io → пул → адрес в Tonviewer\n')
  console.log('DeDust API — ключ не нужен, URL уже в .env')
  console.log('  https://docs.dedust.io\n')
}

main()

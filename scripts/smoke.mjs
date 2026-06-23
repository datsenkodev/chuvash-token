/**
 * Smoke test: build artifacts + optional API health (needs Postgres).
 * Run: npm run smoke
 */
import fs from 'fs'
import path from 'path'
import { fileURLToPath } from 'url'
import { spawn } from 'child_process'

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..')

function ok(msg) {
  console.log(`  ✓ ${msg}`)
}

function fail(msg) {
  console.error(`  ✗ ${msg}`)
  process.exitCode = 1
}

async function run(cmd, args) {
  return new Promise((resolve, reject) => {
    const child = spawn(cmd, args, { stdio: 'inherit', shell: true, cwd: root })
    child.on('exit', code => (code === 0 ? resolve() : reject(new Error(`${cmd} exited ${code}`))))
  })
}

async function waitForHealth(port, ms = 20000) {
  const deadline = Date.now() + ms
  while (Date.now() < deadline) {
    try {
      const res = await fetch(`http://127.0.0.1:${port}/api/health`)
      if (res.ok) return res.json()
    } catch {
      /* retry */
    }
    await new Promise(r => setTimeout(r, 500))
  }
  throw new Error('API health timeout')
}

console.log('\n=== smoke: frontend build ===')
try {
  await run('npm', ['run', 'build:web'])
  ok('build:web')
} catch {
  fail('build:web')
}

if (fs.existsSync(path.join(root, 'dist', 'index.html'))) ok('dist/index.html')
else fail('dist/index.html missing')

console.log('\n=== smoke: full build (tsc + server) ===')
try {
  await run('npm', ['run', 'build'])
  ok('build')
} catch {
  fail('build')
}

if (fs.existsSync(path.join(root, 'server', 'dist', 'index.js'))) ok('server/dist/index.js')
else fail('server/dist/index.js missing')

console.log('\n=== smoke: API (Postgres required) ===')
const testPort = process.env.SMOKE_PORT || '3099'
let bootLog = ''
let apiProc

try {
  apiProc = spawn('node', ['server/dist/index.js'], {
    cwd: root,
    env: { ...process.env, PORT: testPort, DEV_MODE: 'true' },
    stdio: ['ignore', 'pipe', 'pipe'],
    shell: true,
  })
  apiProc.stdout?.on('data', d => {
    bootLog += d.toString()
  })
  apiProc.stderr?.on('data', d => {
    bootLog += d.toString()
  })

  const health = await waitForHealth(testPort)
  ok(`GET /api/health → ${JSON.stringify(health)}`)
} catch (e) {
  if (bootLog.includes('ECONNREFUSED')) {
    console.log('  ⚠ Postgres not running — skip API test')
    console.log('    Run: docker compose up -d && npm run db:migrate && npm run db:seed')
  } else {
    fail(`API: ${e}`)
    if (bootLog) console.error(bootLog.slice(-1000))
  }
} finally {
  apiProc?.kill()
}

console.log(process.exitCode === 1 ? '\nSmoke FAILED\n' : '\nSmoke OK\n')

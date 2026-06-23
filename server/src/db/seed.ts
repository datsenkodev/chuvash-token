import path from 'path'
import { fileURLToPath } from 'url'
import { query } from './pool.js'
import { env, getAdminIds } from '../config/env.js'
import { setSetting } from '../services/settings.service.js'
import { migrate } from './migrate.js'

const __filename = fileURLToPath(import.meta.url)

export async function seed() {
  const cards = await query(`SELECT COUNT(*) as c FROM card_templates`)
  if (parseInt(cards.rows[0].c as string, 10) === 0) {
    const covers = ['cover1.png', 'cover2.png', 'cover3.png', 'cover4.png']
    for (let i = 0; i < 8; i++) {
      await query(
        `INSERT INTO card_templates (name, tier, card_type, cover_url, weight, max_win_multiplier)
         VALUES ($1, $2, $3, $4, 1, 3.5)`,
        [`Card ${i + 1}`, i < 4 ? 'gold' : 'standard', `tier_${(i % 4) + 1}`, `/images/covers/${covers[i % 4]}`],
      )
    }
    console.log('Seeded card templates')
  }

  await query(
    `INSERT INTO system_settings (key, value) VALUES ('project_launched', 'false') ON CONFLICT (key) DO NOTHING`,
  )
  await query(
    `INSERT INTO system_settings (key, value) VALUES ('setup_min_wallet_blc', '100000') ON CONFLICT (key) DO NOTHING`,
  )

  if (env.BOT_USERNAME) await setSetting('bot_username', env.BOT_USERNAME)
  if (env.BLC_JETTON_MASTER) await setSetting('blc_jetton_master', env.BLC_JETTON_MASTER)
  if (env.USDT_JETTON_MASTER) await setSetting('usdt_jetton_master', env.USDT_JETTON_MASTER)

  await query(`UPDATE economy_state SET current_mode = 'distribution' WHERE id = 1`)

  if (env.DEV_MODE) {
    await query(
      `UPDATE economy_state SET wallet_balance_blc = 500000000, current_mode = 'distribution' WHERE id = 1`,
    )
    await setSetting('project_launched', true)
    console.log('DEV_MODE: auto-launched with test wallet balance')
  }

  for (const adminId of getAdminIds()) {
    if (adminId) {
      await query(`INSERT INTO admins (telegram_id) VALUES ($1) ON CONFLICT DO NOTHING`, [adminId])
    }
  }

  const slides = await query(`SELECT COUNT(*) as c FROM onboarding_slides`)
  if (parseInt(slides.rows[0].c as string, 10) === 0) {
    await query(
      `INSERT INTO onboarding_slides (sort_order, title, body, is_active) VALUES
       (1, 'Welcome to BulCoin', 'Open cards and win $BLC tokens', true),
       (2, 'Fair economy', 'Our system balances rewards automatically', true),
       (3, 'Invite friends', 'Earn bonus tokens for referrals', true)`,
    )
  }

  const release = await query(`SELECT COUNT(*) as c FROM release_cards`)
  if (parseInt(release.rows[0].c as string, 10) === 0) {
    await query(
      `INSERT INTO release_cards (app_version, sort_order, title, body, is_active) VALUES
       ('1.0.0', 1, 'BulCoin v1', 'Card game, deposits and withdrawals are live', true)`,
    )
  }

  await query(
    `INSERT INTO system_settings (key, value) VALUES ('app_version', $1) ON CONFLICT (key) DO NOTHING`,
    [JSON.stringify(env.APP_VERSION)],
  )

  // Dev user starter balance
  const devUser = await query(`SELECT id FROM users WHERE telegram_id = $1`, [env.DEV_TELEGRAM_USER_ID])
  if (devUser.rows[0]) {
    const bal = await query(`SELECT blc_amount FROM balances WHERE user_id = $1`, [devUser.rows[0].id])
    if (BigInt(bal.rows[0]?.blc_amount ?? 0) === 0n) {
      await query(`UPDATE balances SET blc_amount = 320322 WHERE user_id = $1`, [devUser.rows[0].id])
    }
  }

  console.log('Seed complete')
}

const isDirectRun = process.argv[1] && path.resolve(process.argv[1]) === __filename

if (isDirectRun) {
  migrate()
    .then(() => seed())
    .then(() => process.exit(0))
    .catch(e => {
      console.error(e)
      process.exit(1)
    })
}

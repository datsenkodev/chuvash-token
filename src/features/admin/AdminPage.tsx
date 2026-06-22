import { useState } from 'react'
import { Link, Navigate } from 'react-router-dom'
import {
  useAdminConfig,
  useAdminDeposits,
  useAdminEconomy,
  useAdminMutation,
  useAdminSetup,
  useAdminSettings,
  useAdminWithdrawals,
  useUserMe,
} from '@/hooks/queries'

type Tab = 'setup' | 'economy' | 'settings' | 'ops'

export function AdminPage() {
  const { data: user, isLoading } = useUserMe()
  const [tab, setTab] = useState<Tab>('setup')

  if (!isLoading && !user?.isAdmin) return <Navigate to="/" replace />

  return (
    <div className="screen px-4 pb-8 min-h-full">
      <div className="flex items-center justify-between mb-4 pt-2">
        <Link to="/" className="text-white/80 text-sm">
          ← App
        </Link>
        <h1 className="heading-normal">Admin</h1>
        <span className="w-8" />
      </div>

      <div className="flex gap-2 mb-4 flex-wrap">
        {(['setup', 'economy', 'settings', 'ops'] as Tab[]).map(t => (
          <button
            key={t}
            type="button"
            className={`px-3 py-1.5 rounded-full text-xs ${tab === t ? 'bg-white text-black' : 'bg-white/10 text-white'}`}
            onClick={() => setTab(t)}
          >
            {t}
          </button>
        ))}
      </div>

      {tab === 'setup' && <SetupTab />}
      {tab === 'economy' && <EconomyTab />}
      {tab === 'settings' && <SettingsTab />}
      {tab === 'ops' && <OpsTab />}
    </div>
  )
}

function SetupTab() {
  const { data: setup, isLoading } = useAdminSetup()
  const { data: config } = useAdminConfig()
  const mut = useAdminMutation()
  const [blcMaster, setBlcMaster] = useState('')
  const [usdtMaster, setUsdtMaster] = useState('')
  const [botUser, setBotUser] = useState('')

  if (isLoading) return <p className="text-white/60">Loading…</p>
  if (!setup) return null

  const saveConfig = () => {
    mut.mutate({
      path: '/api/admin/settings',
      method: 'PATCH',
      body: {
        blc_jetton_master: blcMaster || setup.config?.blcJettonMaster,
        usdt_jetton_master: usdtMaster || setup.config?.usdtJettonMaster,
        bot_username: botUser || setup.config?.botUsername,
      },
    })
  }

  return (
    <div className="space-y-4">
      <Section title="Env checklist">
        <ul className="text-sm text-white/80 space-y-1">
          <li>BOT_TOKEN: {config?.botToken ? '✓' : '✗ set in .env'}</li>
          <li>TONAPI_KEY: {config?.tonapiKey ? '✓' : '✗'}</li>
          <li>TONCENTER_API_KEY: {config?.toncenterKey ? '✓' : '✗'}</li>
          <li>ADMIN_TELEGRAM_IDS: {config?.adminIds ? '✓' : '✗'}</li>
          <li>Network: {String(config?.tonNetwork ?? '—')}</li>
        </ul>
      </Section>

      <Section title="Server wallet">
        <p className="text-xs break-all text-white/70">{String(setup.walletAddress ?? '—')}</p>
        <p className="text-sm mt-2">
          DB balance: {Number(setup.walletBalanceBlc).toLocaleString()} BLC
          {setup.onChainBlc != null && (
            <span className="text-white/60"> · On-chain: {Number(setup.onChainBlc).toLocaleString()}</span>
          )}
        </p>
        <div className="flex gap-2 mt-3 flex-wrap">
          <Btn
            label="Sync from chain"
            loading={mut.isPending}
            onClick={() => mut.mutate({ path: '/api/admin/setup/sync-wallet' })}
          />
          {!setup.launched && (
            <Btn
              label="Launch project"
              loading={mut.isPending}
              disabled={!setup.canLaunch}
              onClick={() => mut.mutate({ path: '/api/admin/setup/launch' })}
            />
          )}
        </div>
        {setup.launched ? (
          <p className="text-green-400 text-sm mt-2">Launched · mode: {String(setup.currentMode)}</p>
        ) : (
          <p className="text-amber-400 text-sm mt-2">Not launched — min {Number(setup.setupMinWalletBlc)} BLC</p>
        )}
      </Section>

      <Section title="Token config (DB)">
        <Field label="BLC jetton master" value={blcMaster} placeholder={String(setup.config?.blcJettonMaster ?? '')} onChange={setBlcMaster} />
        <Field label="USDT jetton master" value={usdtMaster} placeholder={String(setup.config?.usdtJettonMaster ?? '')} onChange={setUsdtMaster} />
        <Field label="Bot username" value={botUser} placeholder={String(setup.config?.botUsername ?? '')} onChange={setBotUser} />
        <Btn label="Save config" loading={mut.isPending} onClick={saveConfig} />
      </Section>
    </div>
  )
}

function EconomyTab() {
  const { data, refetch, isLoading } = useAdminEconomy()
  const mut = useAdminMutation()

  if (isLoading) return <p className="text-white/60">Loading…</p>
  if (!data) return null

  return (
    <div className="space-y-4">
      <Section title="State">
        <p className="text-sm">Mode: <b>{String(data.mode)}</b></p>
        <p className="text-sm">W: {Number(data.wBlc).toLocaleString()} · P: {Number(data.pBlc).toLocaleString()} · S: {Number(data.sBlc).toLocaleString()}</p>
        <p className="text-sm">r_effective: {Number(data.rEffective).toFixed(2)}% · casino locked: {Number(data.rCasinoLocked).toFixed(2)}%</p>
        <p className="text-sm text-white/60">N active: {Number(data.nActive)} · G: {(Number(data.gGrowth) * 100).toFixed(1)}%</p>
        <div className="flex gap-2 mt-3 flex-wrap">
          <Btn label="Refresh" onClick={() => refetch()} />
          <Btn label="→ Distribution" loading={mut.isPending} onClick={() => mut.mutate({ path: '/api/admin/economy/force-mode', body: { mode: 'distribution' } })} />
          <Btn label="→ Casino" loading={mut.isPending} onClick={() => mut.mutate({ path: '/api/admin/economy/force-mode', body: { mode: 'casino' } })} />
          <Btn label="Reset casino r" loading={mut.isPending} onClick={() => mut.mutate({ path: '/api/admin/economy/reset-r-casino' })} />
        </div>
      </Section>
    </div>
  )
}

function SettingsTab() {
  const { data: settings } = useAdminSettings()
  const mut = useAdminMutation()
  const [minWithdraw, setMinWithdraw] = useState('')
  const [minLaunch, setMinLaunch] = useState('')
  const [routerStrategy, setRouterStrategy] = useState('')
  const [toncoTonPool, setToncoTonPool] = useState('')
  const [toncoUsdtPool, setToncoUsdtPool] = useState('')
  const [dedustSplits, setDedustSplits] = useState('')
  const [dedustLength, setDedustLength] = useState('')

  if (!settings) return null

  const strategyOptions = [
    { value: 'dedust_first', label: 'DeDust first, TonCo fallback' },
    { value: 'tonco_first', label: 'TonCo first, DeDust fallback' },
    { value: 'best_quote', label: 'Best quote (executable)' },
    { value: 'dedust_only', label: 'DeDust only' },
    { value: 'tonco_only', label: 'TonCo only' },
  ]

  return (
    <div className="space-y-4">
      <Section title="Key settings">
        <Field label="Withdraw min BLC" value={minWithdraw} placeholder={String(settings.withdraw_min_amount ?? '')} onChange={setMinWithdraw} />
        <Field label="Launch min wallet BLC" value={minLaunch} placeholder={String(settings.setup_min_wallet_blc ?? '')} onChange={setMinLaunch} />
        <Btn
          label="Save general"
          loading={mut.isPending}
          onClick={() =>
            mut.mutate({
              path: '/api/admin/settings',
              method: 'PATCH',
              body: {
                ...(minWithdraw ? { withdraw_min_amount: Number(minWithdraw) } : {}),
                ...(minLaunch ? { setup_min_wallet_blc: Number(minLaunch) } : {}),
              },
            })
          }
        />
      </Section>

      <Section title="Swap router (DeDust + TonCo)">
        <p className="text-xs text-white/50 mb-3">
          TON/USDT deposits auto-swap to BLC. DeDust uses API routing; TonCo uses on-chain pools.
        </p>
        <label className="block mb-3 text-sm">
          <span className="text-white/70">Strategy</span>
          <select
            className="w-full mt-1 bg-black/20 border border-white/10 rounded-lg p-2 text-sm outline-none"
            value={routerStrategy || String(settings.swap_router_strategy ?? 'dedust_first')}
            onChange={e => setRouterStrategy(e.target.value)}
          >
            {strategyOptions.map(o => (
              <option key={o.value} value={o.value}>
                {o.label}
              </option>
            ))}
          </select>
        </label>
        <ToggleRow
          label="DeDust swap enabled"
          checked={Boolean(settings.dedust_swap_enabled)}
          onChange={v => mut.mutate({ path: '/api/admin/settings', method: 'PATCH', body: { dedust_swap_enabled: v } })}
        />
        <ToggleRow
          label="TonCo swap enabled"
          checked={Boolean(settings.tonco_swap_enabled)}
          onChange={v => mut.mutate({ path: '/api/admin/settings', method: 'PATCH', body: { tonco_swap_enabled: v } })}
        />
        <ToggleRow
          label="Allow fallback to alternate venue"
          checked={Boolean(settings.swap_allow_tonco_fallback)}
          onChange={v => mut.mutate({ path: '/api/admin/settings', method: 'PATCH', body: { swap_allow_tonco_fallback: v } })}
        />
        <Field
          label="TonCo BLC/TON pool"
          value={toncoTonPool}
          placeholder={String(settings.tonco_blc_ton_pool || settings.tonco_blc_pool_address || '')}
          onChange={setToncoTonPool}
        />
        <Field
          label="TonCo BLC/USDT pool"
          value={toncoUsdtPool}
          placeholder={String(settings.tonco_blc_usdt_pool ?? '')}
          onChange={setToncoUsdtPool}
        />
        <Field
          label="DeDust max splits"
          value={dedustSplits}
          placeholder={String(settings.dedust_max_splits ?? 4)}
          onChange={setDedustSplits}
        />
        <Field
          label="DeDust max route length"
          value={dedustLength}
          placeholder={String(settings.dedust_max_length ?? 3)}
          onChange={setDedustLength}
        />
        <Btn
          label="Save swap settings"
          loading={mut.isPending}
          onClick={() =>
            mut.mutate({
              path: '/api/admin/settings',
              method: 'PATCH',
              body: {
                swap_router_strategy: routerStrategy || String(settings.swap_router_strategy ?? 'dedust_first'),
                ...(toncoTonPool ? { tonco_blc_ton_pool: toncoTonPool, tonco_blc_pool_address: toncoTonPool } : {}),
                ...(toncoUsdtPool ? { tonco_blc_usdt_pool: toncoUsdtPool } : {}),
                ...(dedustSplits ? { dedust_max_splits: Number(dedustSplits) } : {}),
                ...(dedustLength ? { dedust_max_length: Number(dedustLength) } : {}),
              },
            })
          }
        />
      </Section>
    </div>
  )
}

function OpsTab() {
  const { data: deposits } = useAdminDeposits()
  const { data: withdrawals } = useAdminWithdrawals()

  return (
    <div className="space-y-4">
      <Section title="Pending withdrawals">
        {(withdrawals ?? []).length === 0 ? (
          <p className="text-sm text-white/60">None</p>
        ) : (
          <ul className="text-xs space-y-2">
            {(withdrawals ?? []).map(w => (
              <li key={String(w.id)} className="text-white/80">
                {Number(w.amount).toLocaleString()} BLC → {String(w.address).slice(0, 12)}… ({String(w.status)})
              </li>
            ))}
          </ul>
        )}
      </Section>
      <Section title="Recent deposits">
        <ul className="text-xs space-y-2 max-h-48 overflow-y-auto">
          {(deposits ?? []).slice(0, 15).map(d => (
            <li key={String(d.id)} className="text-white/80">
              {String(d.currency).toUpperCase()} {String(d.status)} · memo {String(d.memo ?? '—')} · {String(d.username ?? d.telegram_id)}
            </li>
          ))}
        </ul>
      </Section>
    </div>
  )
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="glass-block p-4">
      <h2 className="heading-sm mb-3">{title}</h2>
      {children}
    </div>
  )
}

function Field({ label, value, placeholder, onChange }: { label: string; value: string; placeholder: string; onChange: (v: string) => void }) {
  return (
    <label className="block mb-3 text-sm">
      <span className="text-white/70">{label}</span>
      <input
        className="w-full mt-1 bg-black/20 border border-white/10 rounded-lg p-2 text-sm outline-none"
        value={value}
        placeholder={placeholder}
        onChange={e => onChange(e.target.value)}
      />
    </label>
  )
}

function ToggleRow({ label, checked, onChange }: { label: string; checked: boolean; onChange: (v: boolean) => void }) {
  return (
    <label className="flex items-center justify-between mb-3 text-sm cursor-pointer">
      <span className="text-white/70">{label}</span>
      <input type="checkbox" checked={checked} onChange={e => onChange(e.target.checked)} className="w-4 h-4" />
    </label>
  )
}

function Btn({ label, onClick, loading, disabled }: { label: string; onClick: () => void; loading?: boolean; disabled?: boolean }) {
  return (
    <button
      type="button"
      className="btn btn--white--sm text-xs px-3 py-2 disabled:opacity-40"
      onClick={onClick}
      disabled={loading || disabled}
    >
      {loading ? '…' : label}
    </button>
  )
}

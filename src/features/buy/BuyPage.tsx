import { useEffect, useMemo, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import {
  useDepositIntent,
  useDepositMethods,
  useDepositStatus,
  useRateQuote,
  useUserMe,
} from '@/hooks/queries'
import { useTelegram } from '@/hooks/useTelegram'

const CURRENCY_META: Record<string, { label: string; icon: string }> = {
  ton: { label: 'TON', icon: '/images/currencies/ton.svg' },
  usdt: { label: 'USDT', icon: '/images/currencies/usdt.svg' },
  blc: { label: 'BLC', icon: '/images/currencies/ton.svg' },
}

export function BuyPage() {
  const navigate = useNavigate()
  const { data: user } = useUserMe()
  const { data: methodsData } = useDepositMethods()
  const intent = useDepositIntent()
  const { showAlert } = useTelegram()

  const currencies = useMemo(
    () =>
      (methodsData?.methods ?? [])
        .filter(m => m.enabled)
        .map(m => ({
          id: m.currency,
          autoSwap: m.autoSwap,
          ...CURRENCY_META[m.currency] ?? { label: m.currency.toUpperCase(), icon: '/images/currencies/ton.svg' },
        })),
    [methodsData],
  )

  const [currencyId, setCurrencyId] = useState('ton')
  const [amount, setAmount] = useState('1')
  const [step, setStep] = useState<'form' | 'pay' | 'wait'>('form')
  const [depositId, setDepositId] = useState<string | null>(null)
  const [payInfo, setPayInfo] = useState<{
    address: string
    memo: string
    expectedBlc: number
    quoteSource: string
    autoSwap: boolean
    instructions?: string
    tonTransferUrl: string | null
  } | null>(null)

  const currency = currencies.find(c => c.id === currencyId) ?? currencies[0]
  const amountNum = parseFloat(amount) || 0
  const quote = useRateQuote(currencyId, amountNum, step === 'form' && amountNum > 0)
  const status = useDepositStatus(depositId, step === 'wait')

  useEffect(() => {
    if (currencies.length && !currencies.find(c => c.id === currencyId)) {
      setCurrencyId(currencies[0].id)
    }
  }, [currencies, currencyId])

  useEffect(() => {
    if (status.data?.status === 'confirmed') {
      showAlert(`Credited ${status.data.blcCredited ?? status.data.expectedBlc} BLC`)
      navigate('/')
    }
  }, [status.data, navigate, showAlert])

  const startDeposit = async () => {
    try {
      const res = await intent.mutateAsync({ currency: currencyId, amount: amountNum })
      setDepositId(res.depositId)
      setPayInfo(res)
      setStep('pay')
    } catch (e) {
      showAlert(e instanceof Error ? e.message : 'Deposit failed')
    }
  }

  const openWallet = () => {
    if (payInfo?.tonTransferUrl) window.open(payInfo.tonTransferUrl, '_blank')
  }

  if (step === 'wait') {
    return (
      <div className="screen buy-screen px-4 flex flex-col min-h-full items-center justify-center">
        <p className="heading-normal mb-2">Waiting for payment…</p>
        <p className="text-sm text-white/60">Status: {status.data?.status ?? 'pending'}</p>
        {status.data?.status === 'swapping' && (
          <p className="text-xs text-amber-300/90 mt-2">Auto-buying BLC via DeDust…</p>
        )}
        <p className="text-xs text-white/40 mt-4">Memo: {payInfo?.memo}</p>
      </div>
    )
  }

  if (step === 'pay' && payInfo) {
    return (
      <div className="screen buy-screen px-4 flex flex-col min-h-full">
        <button type="button" className="flex items-center mb-2 gap-1.5 text-white" onClick={() => setStep('form')}>
          ← Back
        </button>
        <h2 className="heading-2xl text-center mb-6">Send payment</h2>
        <div className="glass-block p-6 mb-4 space-y-3 text-sm">
          <p>{payInfo.instructions ?? `Send ${amount} ${currency?.label} with memo ${payInfo.memo}`}</p>
          <p className="break-all text-xs text-white/70">{payInfo.address}</p>
          <p>
            Memo: <b className="text-amber-300">{payInfo.memo}</b>
          </p>
          <p>
            ≈ <b>{payInfo.expectedBlc}</b> BLC (quote: {payInfo.quoteSource})
          </p>
          {payInfo.autoSwap && (
            <p className="text-xs text-white/50">BLC will be auto-purchased via DeDust when payment arrives.</p>
          )}
        </div>
        {payInfo.tonTransferUrl && (
          <button type="button" className="btn btn--white--sm w-full mb-3" onClick={openWallet}>
            Open in wallet
          </button>
        )}
        <button type="button" className="btn btn--white--sm w-full mb-8" onClick={() => setStep('wait')}>
          I sent it
        </button>
      </div>
    )
  }

  return (
    <div className="screen buy-screen px-4 flex flex-col min-h-full">
      <button type="button" className="flex items-center mb-2 gap-1.5 text-white" onClick={() => navigate(-1)}>
        ← Back
      </button>
      <h2 className="heading-2xl text-center mb-6">Buy BLC</h2>

      {!currencies.length ? (
        <p className="text-center text-white/60">Deposits not configured. Admin must set jetton addresses.</p>
      ) : (
        <>
          <div className="glass-block p-6 mb-2">
            <label className="heading-normal block mb-4">Send</label>
            <div className="flex gap-2 mb-3 flex-wrap">
              {currencies.map(c => (
                <button
                  key={c.id}
                  type="button"
                  className={`px-3 py-2 rounded-lg text-sm flex items-center gap-2 ${currencyId === c.id ? 'bg-white text-black' : 'bg-white/10'}`}
                  onClick={() => setCurrencyId(c.id)}
                >
                  <img src={c.icon} alt="" className="size-5" />
                  {c.label}
                </button>
              ))}
            </div>
            <input
              type="number"
              className="w-full bg-transparent border border-white/10 rounded-lg p-3 heading-sm outline-none"
              value={amount}
              onChange={e => setAmount(e.target.value)}
              step="0.01"
            />
          </div>
          <div className="glass-block p-6 mb-20">
            <p className="heading-sm mb-2">Receive (estimate)</p>
            <p className="text-sm">
              {quote.isLoading ? '…' : (quote.data?.expectedBlc ?? '—')}{' '}
              <span className="text-white/60">BLC</span>
            </p>
            {quote.data?.source && (
              <p className="text-xs text-white/45 mt-2">
                Rate: {quote.data.source === 'dedust' ? 'DeDust' : 'TonCo (backup)'}
                {quote.data.autoSwap && ' · auto-swap on receipt'}
              </p>
            )}
            {quote.data?.disclaimer && (
              <p className="text-xs text-white/40 mt-1">{quote.data.disclaimer}</p>
            )}
          </div>
          <button
            type="button"
            className="btn btn--white--sm w-full mt-auto mb-8"
            onClick={startDeposit}
            disabled={!amountNum || intent.isPending || quote.isLoading}
          >
            Continue
          </button>
        </>
      )}
      {user && <p className="text-center text-12 text-white/40 mb-4">Balance: {user.balance} BLC</p>}
    </div>
  )
}

import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import {
  useWithdraw,
  useWithdrawLimits,
  useWithdrawHistory,
  useWithdrawFeePreview,
  useUserMe,
} from '@/hooks/queries'
import { useTelegram } from '@/hooks/useTelegram'
import { formatBlc } from '@/lib/utils'

export function WithdrawPage() {
  const navigate = useNavigate()
  const { data: user } = useUserMe()
  const { data: limits } = useWithdrawLimits()
  const { data: history } = useWithdrawHistory()
  const withdraw = useWithdraw()
  const { showAlert } = useTelegram()
  const [amount, setAmount] = useState('')
  const [address, setAddress] = useState('')
  const [step, setStep] = useState<'form' | 'confirm' | 'done'>('form')

  const amountNum = parseFloat(amount) || 0
  const feePreview = useWithdrawFeePreview(amountNum, step !== 'done' && amountNum > 0)

  const confirm = async () => {
    if (!address.trim()) {
      showAlert('Enter TON wallet address')
      return
    }
    try {
      await withdraw.mutateAsync({ amount: amountNum, address: address.trim() })
      setStep('done')
    } catch (e) {
      showAlert(e instanceof Error ? e.message : 'Withdraw failed')
    }
  }

  if (step === 'done') {
    return (
      <div className="screen buy-screen px-4 flex flex-col min-h-full items-center justify-center text-center">
        <h2 className="heading-normal mb-2">Withdrawal queued</h2>
        <p className="text-sm text-white/70 mb-6">
          {amount} BLC will be sent to your wallet on-chain shortly.
        </p>
        <button type="button" className="btn btn--white--sm" onClick={() => navigate('/')}>
          Home
        </button>
      </div>
    )
  }

  return (
    <div className="screen buy-screen px-4 flex flex-col min-h-full">
      <button type="button" className="flex items-center mb-2 gap-1.5 text-white" onClick={() => navigate(-1)}>
        ← Back
      </button>
      <h2 className="heading-2xl text-center mb-6">Withdraw BLC</h2>

      {step === 'form' ? (
        <>
          <div className="glass-block p-6 mb-2">
            <label className="heading-normal block mb-4">Amount</label>
            <input
              type="number"
              className="w-full bg-transparent border border-white/10 rounded-lg p-3 heading-sm outline-none"
              value={amount}
              onChange={e => setAmount(e.target.value)}
            />
            <div className="flex justify-between text-xs text-white/70 mt-3">
              <span>Balance:</span>
              <span>{formatBlc(user?.balance ?? 0)}</span>
            </div>
            {limits && (
              <p className="text-12 mt-2 text-white/50">
                Min: {limits.min} · Base fee: {limits.feePercent}%
                {limits.minFeeBlc != null && ` · Min fee: ${limits.minFeeBlc} BLC (≥2× gas)`}
              </p>
            )}
            {feePreview.data && (
              <p className="text-12 mt-2 text-amber-300/80">
                Fee: {feePreview.data.fee} BLC (~{feePreview.data.gasTonEstimate} TON gas × 2 @{' '}
                {Math.round(feePreview.data.blcPerTon)} BLC/TON)
              </p>
            )}
          </div>
          <div className="glass-block p-6 mb-4">
            <label className="heading-sm block mb-2">TON wallet address</label>
            <input
              className="w-full bg-transparent border border-white/10 rounded-lg p-2 text-sm outline-none"
              placeholder="UQ… or EQ…"
              value={address}
              onChange={e => setAddress(e.target.value)}
            />
          </div>
          {history && history.length > 0 && (
            <div className="glass-block p-4 mb-4">
              <p className="text-xs text-white/50 mb-2">Recent</p>
              {history.slice(0, 3).map(h => (
                <p key={h.id} className="text-xs text-white/70">
                  {Number(h.amount).toLocaleString()} BLC — {h.status}
                </p>
              ))}
            </div>
          )}
          <button
            type="button"
            className="btn btn--white--sm w-full mt-auto mb-8"
            onClick={() => setStep('confirm')}
            disabled={!amount || amountNum <= 0 || !address.trim()}
          >
            Continue
          </button>
        </>
      ) : (
        <>
          <div className="glass-block p-6 mb-6 text-sm">
            <p className="mb-2">
              Withdraw <b>{amount}</b> BLC
              {feePreview.data && (
                <span>
                  {' '}
                  + fee <b>{feePreview.data.fee}</b> BLC
                </span>
              )}
            </p>
            <p className="break-all text-white/70">To: {address}</p>
          </div>
          <button type="button" className="btn btn--white--sm w-full mt-auto mb-8" onClick={confirm} disabled={withdraw.isPending}>
            Confirm withdraw
          </button>
        </>
      )}
    </div>
  )
}

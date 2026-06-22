import { useNavigate } from 'react-router-dom'
import { useHomeCards, useOpenCard } from '@/hooks/queries'
import { useTelegram } from '@/hooks/useTelegram'
import { formatBlc, formatTimer } from '@/lib/utils'
import { CongratsModal } from '@/components/CongratsModal'
import { useState } from 'react'

export function HomePage() {
  const { data, isLoading, error } = useHomeCards()
  const openCard = useOpenCard()
  const { haptic, showAlert } = useTelegram()
  const navigate = useNavigate()
  const [prize, setPrize] = useState<number | null>(null)

  const handleOpen = async (cardId: string, price: number, isFree = false) => {
    try {
      haptic('medium')
      const res = await openCard.mutateAsync({ cardTemplateId: cardId, openPrice: price, isFree })
      setPrize(res.prizeAmount)
    } catch (e) {
      showAlert(e instanceof Error ? e.message : 'Failed to open')
    }
  }

  if (isLoading) return <div className="screen text-center text-white/60">Loading...</div>
  if (error) return <div className="screen text-center text-red-400">Failed to load cards</div>

  return (
    <div className="screen home-screen">
      <div className="flex flex-col items-center w-full gap-2 mb-2">
        <p className="flex items-center gap-2 text-white font-medium text-xs">
          <img src="/images/rank-1.svg" alt="" className="size-4 shrink-0" />
          Total balance
        </p>
        <h1 className="text-lg font-semibold text-white font-inter">
          {formatBlc(data?.balance ?? 0)} <span className="text-gold">$BLC</span>
        </h1>
      </div>

      {!data?.canOpen && (
        <div className="glass-block mb-4 text-center">
          <p className="text-12 mb-2">{data?.insufficientMessage}</p>
          {data && data.freeTimerSeconds > 0 && (
            <p className="heading-sm mb-2">Free open: {formatTimer(data.freeTimerSeconds)}</p>
          )}
          {data && data.freeTimerSeconds === 0 && data.cards[0] && (
            <button
              type="button"
              className="btn btn--white--sm w-full mb-2"
              onClick={() => handleOpen(data.cards[0].id, data.cards[0].openPrice, true)}
            >
              Open free card
            </button>
          )}
          <button type="button" className="btn btn--white--sm w-full" onClick={() => navigate('/buy')}>
            Top up balance
          </button>
        </div>
      )}

      <div className="grid grid-cols-2 gap-[3px] w-full">
        {data?.cards.map(card => (
          <button
            key={card.id}
            type="button"
            disabled={!data.canOpen || openCard.isPending}
            className="h-[210px] rounded-xl p-2 flex flex-col justify-end cursor-pointer relative overflow-hidden disabled:opacity-50 text-left"
            onClick={() => handleOpen(card.id, card.openPrice)}
          >
            <img src="/images/rank-1.svg" alt="" className="absolute left-2 top-2 size-5" />
            {card.coverUrl && (
              <img
                src={card.coverUrl}
                alt=""
                className="absolute w-full h-full left-0 top-0 object-cover"
                onError={e => {
                  ;(e.target as HTMLImageElement).style.display = 'none'
                }}
              />
            )}
            <div className="absolute inset-0 bg-gradient-to-t from-black/80 to-transparent" />
            <p className="w-full flex items-center justify-center gap-1 p-2 text-white font-medium text-sm backdrop-blur-sm z-10 rounded-[32px]">
              <img src="/images/rank-1.svg" alt="" className="size-4 shrink-0" />
              {formatBlc(card.openPrice)}
            </p>
          </button>
        ))}
      </div>

      {data && data.canOpen && data.freeTimerSeconds > 0 && (
        <p className="text-center text-12 mt-4">Next free card: {formatTimer(data.freeTimerSeconds)}</p>
      )}

      {prize !== null && (
        <CongratsModal
          amount={prize}
          message="You won"
          onClose={() => setPrize(null)}
        />
      )}
    </div>
  )
}

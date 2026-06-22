import { useReferrals } from '@/hooks/queries'
import { useTelegram } from '@/hooks/useTelegram'
import { formatBlc } from '@/lib/utils'

export function ReferralPage() {
  const { data, isLoading } = useReferrals()
  const { showAlert, haptic } = useTelegram()

  const copyLink = () => {
    if (!data?.link) return
    navigator.clipboard.writeText(data.link)
    haptic('light')
    showAlert('Link copied to clipboard!')
  }

  const invite = () => {
    if (!data?.link) return
    const shareUrl = `https://t.me/share/url?url=${encodeURIComponent(data.link)}&text=${encodeURIComponent('Join me on BulCoin!')}`
    window.open(shareUrl, '_blank')
  }

  if (isLoading) return <div className="screen text-white/60">Loading...</div>

  return (
    <div className="screen referral-screen mb-14">
      <div className="flex flex-col items-center gap-2 mb-6">
        <h2 className="text-2xl font-bold">Invite friends</h2>
        <p className="text-14">You and your friend will get bonuses</p>
      </div>

      <div className="flex flex-col gap-3 mb-6">
        <div className="glass-block flex flex-col gap-2">
          <p className="heading-sm">To invite a friend</p>
          <p className="text-12">Bonuses for referring a friend — {data?.bonusPerReferral ?? 500} tokens</p>
        </div>
        <div className="glass-block flex flex-col gap-2">
          <p className="heading-sm">Have a friend bring a friend</p>
          <p className="text-12">Bonuses for referring a friend — {data?.bonusPerReferral ?? 500} tokens</p>
        </div>
      </div>

      <div className="mb-6">
        <h3 className="heading-normal mb-3">Your list of friends ({data?.friends.length ?? 0})</h3>
        <div className="flex flex-col gap-2 glass-block">
          {data?.friends.map((f, i) => (
            <div
              key={i}
              className="flex items-center justify-between mb-2 pb-2 border-b border-[rgba(71,71,71,0.3)] last:border-0"
            >
              <p className="heading-sm">{f.name}</p>
              <span className="text-12 font-semibold">
                {formatBlc(f.balance)} <span className="text-gold text-[0.6875rem]">$BLC</span>
              </span>
            </div>
          ))}
          {(!data?.friends.length || data.friends.length === 0) && (
            <p className="text-12 text-center py-4">No referrals yet</p>
          )}
        </div>
      </div>

      <div className="fixed bottom-[105px] left-0 right-0 px-4 border-t border-[#474747] bg-[#201915] py-3">
        <div className="flex gap-px">
          <button type="button" className="btn btn--white grow" onClick={invite}>
            <span>Invite Friend</span>
          </button>
          <button type="button" className="btn btn--white !rounded-2xl px-4" onClick={copyLink} aria-label="Copy link">
            📋
          </button>
        </div>
      </div>
    </div>
  )
}

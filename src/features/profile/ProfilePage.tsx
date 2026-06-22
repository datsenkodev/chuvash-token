import { Link, useNavigate } from 'react-router-dom'
import { useUserMe } from '@/hooks/queries'
import { useTelegram } from '@/hooks/useTelegram'
import { formatBlc } from '@/lib/utils'

export function ProfilePage() {
  const { data: user, isLoading } = useUserMe()
  const { user: tg } = useTelegram()
  const navigate = useNavigate()

  const name = user ? `${user.firstName ?? ''} ${user.lastName ?? ''}`.trim() || user.username : tg?.firstName
  const avatarUrl = `https://ui-avatars.com/api/?name=${encodeURIComponent(name ?? 'User')}&size=120&background=random`

  if (isLoading) return <div className="screen text-white/60">Loading...</div>

  return (
    <div className="screen profile-screen">
      <div className="flex flex-col items-center mb-4">
        <div className="profile-avatar-large mb-4">
          <img src={avatarUrl} alt="Profile" className="w-full h-full object-cover rounded-full relative z-10" />
          <img src="/images/avatar-frame-bronze.svg" alt="" className="avatar-frame" />
        </div>
        <h2 className="heading-2xl mb-3">{name}</h2>
        <div className="flex items-center gap-2">
          <img src="/images/rank-1.svg" alt="" className="size-5 shrink-0" />
          <span className="heading-lg">{formatBlc(user?.balance ?? 0)}</span>
        </div>
      </div>

      <div className="flex gap-2 mb-4">
        <button type="button" className="btn btn--white--sm flex-1" onClick={() => navigate('/buy')}>
          Buy
        </button>
        <button type="button" className="btn btn--lg flex-1" onClick={() => navigate('/withdraw')}>
          Withdraw
        </button>
      </div>

      <div className="mb-6 glass-block">
        <div className="flex items-center justify-between gap-2 mb-3">
          <div className="flex items-center gap-1.5">
            <img src="/images/avatar-frame-bronze.svg" alt="" className="size-6" />
            <span className="text-xs font-medium text-white">{user?.level ?? 10} LVL</span>
          </div>
          <div className="flex items-center gap-1.5">
            <img src="/images/avatar-frame-silver.svg" alt="" className="size-6" />
            <span className="text-xs font-medium text-white">{(user?.level ?? 10) + 1} LVL</span>
          </div>
        </div>
        <div className="w-full h-2 bg-[#1a1714] rounded-full mb-2">
          <div className="h-full golden-gradient rounded-full" style={{ width: '50%' }} />
        </div>
        <div className="flex items-center justify-between gap-2">
          <span className="font-medium text-xs text-[#d6d2d2]">{formatBlc(user?.xp ?? 0)}</span>
          <span className="font-medium text-xs text-[#d6d2d2]">—</span>
        </div>
      </div>

      {user?.isAdmin && (
        <Link to="/admin" className="block text-center text-sm text-amber-300/90 mt-4 mb-2">
          Admin panel
        </Link>
      )}

      <div className="glass-block mt-0">
        <div className="flex items-center justify-between mb-3">
          <h3 className="heading-normal">BIO</h3>
        </div>
        <p className="text-left text-xs text-[#d6d2d2] font-light leading-[183%]">
          {user?.bio || 'No bio yet.'}
        </p>
      </div>
    </div>
  )
}

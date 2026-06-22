import { useNavigate } from 'react-router-dom'
import { useTelegram } from '@/hooks/useTelegram'

export function Header() {
  const { user } = useTelegram()
  const navigate = useNavigate()
  const displayName = user?.username || user?.firstName || 'username'

  return (
    <header className="header">
      <div className="user-info">
        <span id="username">{displayName}</span>
      </div>
      <button type="button" className="btn withdraw-btn" onClick={() => navigate('/withdraw')}>
        Withdraw
      </button>
    </header>
  )
}

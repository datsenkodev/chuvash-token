import { createContext, useContext, useEffect, useMemo, ReactNode } from 'react'

interface TelegramContextValue {
  user: { id: number; username?: string; firstName?: string; lastName?: string } | null
  showAlert: (msg: string) => void
  haptic: (type?: string) => void
}

const TelegramContext = createContext<TelegramContextValue | null>(null)

export function TelegramProvider({ children }: { children: ReactNode }) {
  useEffect(() => {
    const tg = window.Telegram?.WebApp
    if (tg) {
      tg.expand()
      tg.enableClosingConfirmation()
      tg.setHeaderColor('#000000')
      tg.setBackgroundColor('#131211')
    }
  }, [])

  const value = useMemo<TelegramContextValue>(() => {
    const tg = window.Telegram?.WebApp
    const u = tg?.initDataUnsafe?.user
    return {
      user: u
        ? {
            id: u.id,
            username: u.username,
            firstName: u.first_name,
            lastName: u.last_name,
          }
        : { id: 0, username: 'devuser', firstName: 'Dev' },
      showAlert: (msg: string) => tg?.showAlert(msg) ?? alert(msg),
      haptic: (type = 'medium') => tg?.HapticFeedback?.impactOccurred(type),
    }
  }, [])

  return <TelegramContext.Provider value={value}>{children}</TelegramContext.Provider>
}

export function useTelegram() {
  const ctx = useContext(TelegramContext)
  if (!ctx) throw new Error('useTelegram must be used within TelegramProvider')
  return ctx
}

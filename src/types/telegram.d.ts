export interface TelegramWebAppUser {
  id: number
  first_name?: string
  last_name?: string
  username?: string
}

export interface TelegramWebApp {
  initData: string
  initDataUnsafe: { user?: TelegramWebAppUser }
  expand: () => void
  enableClosingConfirmation: () => void
  setHeaderColor: (color: string) => void
  setBackgroundColor: (color: string) => void
  showAlert: (msg: string) => void
  HapticFeedback?: { impactOccurred: (style: string) => void }
  openLink?: (url: string) => void
}

declare global {
  interface Window {
    Telegram?: { WebApp: TelegramWebApp }
  }
}

export {}

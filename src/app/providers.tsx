import { QueryClientProvider } from '@tanstack/react-query'
import { ReactNode } from 'react'
import { queryClient } from '@/lib/queryClient'
import { TelegramProvider } from '@/hooks/useTelegram'

export function Providers({ children }: { children: ReactNode }) {
  return (
    <QueryClientProvider client={queryClient}>
      <TelegramProvider>{children}</TelegramProvider>
    </QueryClientProvider>
  )
}

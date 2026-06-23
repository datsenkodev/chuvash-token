import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { api } from '@/services/api-client'

export interface HomeCard {
  id: string
  name: string
  tier: string
  cardType: string
  coverUrl: string | null
  openPrice: number
}

export interface HomeData {
  cards: HomeCard[]
  balance: number
  canOpen: boolean
  freeTimerSeconds: number
  insufficientMessage?: string
}

export function useHomeCards() {
  return useQuery({ queryKey: ['cards', 'home'], queryFn: () => api.get<HomeData>('/api/cards/home') })
}

export function useUserMe() {
  return useQuery({
    queryKey: ['user', 'me'],
    queryFn: () =>
      api.get<{
        balance: number
        firstName?: string
        lastName?: string
        username?: string
        bio?: string
        level: number
        xp: number
        isAdmin?: boolean
      }>('/api/users/me'),
  })
}

export function useOpenCard() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (payload: { cardTemplateId: string; openPrice: number; isFree?: boolean }) =>
      api.post<{ prizeAmount: number; newBalance: number }>('/api/cards/open', payload, {
        'Idempotency-Key': `${payload.cardTemplateId}-${Date.now()}`,
      }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['cards'] })
      qc.invalidateQueries({ queryKey: ['user'] })
    },
  })
}

export function useReferrals() {
  return useQuery({
    queryKey: ['referrals'],
    queryFn: () =>
      api.get<{ link: string; friends: { name: string; balance: number }[]; bonusPerReferral: number }>(
        '/api/referrals',
      ),
  })
}

export function useDepositMethods() {
  return useQuery({
    queryKey: ['deposits', 'methods'],
    queryFn: () =>
      api.get<{
        routerStrategy?: string
        methods: { currency: string; enabled: boolean; autoSwap: boolean }[]
      }>('/api/deposits/methods'),
  })
}

export function useRateQuote(currency: string, amount: number, enabled: boolean) {
  return useQuery({
    queryKey: ['rates', currency, amount],
    queryFn: () =>
      api.get<{
        expectedBlc: number
        source: 'dedust' | 'tonco'
        autoSwap?: boolean
        disclaimer?: string
      }>(`/api/rates/quote?currency=${currency}&amount=${amount}`),
    enabled: enabled && amount > 0,
  })
}

export function useDepositIntent() {
  return useMutation({
    mutationFn: (body: { currency: string; amount: number }) =>
      api.post<{
        depositId: string
        address: string
        memo: string
        expectedBlc: number
        quoteSource: string
        autoSwap: boolean
        instructions?: string
        tonTransferUrl: string | null
      }>('/api/deposits/intent', body),
  })
}

export function useDepositStatus(depositId: string | null, poll: boolean) {
  return useQuery({
    queryKey: ['deposits', depositId],
    queryFn: () =>
      api.get<{ status: string; blcCredited: number | null; expectedBlc: number | null; quoteSource?: string }>(
        `/api/deposits/${depositId}/status`,
      ),
    enabled: Boolean(depositId),
    refetchInterval: poll ? 5000 : false,
  })
}

export function useWithdraw() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (body: { amount: number; address: string }) =>
      api.post<{ id: string; status: string }>('/api/withdrawals', body),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['user'] }),
  })
}

export function useWithdrawLimits() {
  return useQuery({
    queryKey: ['withdrawals', 'limits'],
    queryFn: () =>
      api.get<{
        min: number
        feePercent: number
        feeFixed: number
        minFeeBlc?: number | null
        gasTonEstimate?: number
        feeGasMultiplier?: number
        blcPerTon?: number | null
      }>('/api/withdrawals/limits'),
  })
}

export function useWithdrawFeePreview(amount: number, enabled: boolean) {
  return useQuery({
    queryKey: ['withdrawals', 'fee', amount],
    queryFn: () =>
      api.get<{
        fee: number
        minFeeBlc: number
        configuredFee: number
        gasTonEstimate: number
        blcPerTon: number
      }>(`/api/withdrawals/fee-preview?amount=${amount}`),
    enabled: enabled && amount > 0,
  })
}

export function useWithdrawHistory() {
  return useQuery({
    queryKey: ['withdrawals', 'history'],
    queryFn: () =>
      api.get<
        { id: string; amount: string; status: string; tx_hash: string | null; created_at: string }[]
      >('/api/withdrawals/history'),
  })
}

export function useOnboardingStatus() {
  return useQuery({
    queryKey: ['onboarding', 'status'],
    queryFn: () =>
      api.get<{ needsOnboarding: boolean; needsReleaseCards: boolean; appVersion: string }>(
        '/api/onboarding/status',
      ),
  })
}

// --- Admin ---

export interface AdminSetupStatus {
  launched: boolean
  walletAddress: string | null
  walletBalanceBlc: number
  onChainBlc: number | null
  canLaunch: boolean
  setupMinWalletBlc: number
  currentMode?: string
  config?: {
    blcJettonMaster: string
    usdtJettonMaster: string
    botUsername: string
    tonApiConfigured?: boolean
  }
}

export function useAdminSetup() {
  return useQuery({
    queryKey: ['admin', 'setup'],
    queryFn: () => api.get<AdminSetupStatus>('/api/admin/setup/status'),
  })
}

export function useAdminConfig() {
  return useQuery({
    queryKey: ['admin', 'config'],
    queryFn: () => api.get<Record<string, boolean | string>>('/api/admin/config-status'),
  })
}

export function useAdminEconomy() {
  return useQuery({
    queryKey: ['admin', 'economy'],
    queryFn: () => api.get<Record<string, unknown>>('/api/admin/economy/state'),
  })
}

export function useAdminSettings() {
  return useQuery({
    queryKey: ['admin', 'settings'],
    queryFn: () => api.get<Record<string, unknown>>('/api/admin/settings'),
  })
}

export function useAdminDeposits() {
  return useQuery({
    queryKey: ['admin', 'deposits'],
    queryFn: () => api.get<Record<string, unknown>[]>('/api/admin/deposits'),
  })
}

export function useAdminWithdrawals() {
  return useQuery({
    queryKey: ['admin', 'withdrawals'],
    queryFn: () => api.get<Record<string, unknown>[]>('/api/admin/withdrawals?status=pending'),
  })
}

export function useAdminMutation() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: ({ path, method = 'POST', body }: { path: string; method?: string; body?: unknown }) => {
      if (method === 'PATCH') return api.patch(path, body)
      return api.post(path, body)
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['admin'] })
    },
  })
}

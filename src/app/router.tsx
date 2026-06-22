import { BrowserRouter, Navigate, Route, Routes } from 'react-router-dom'
import { AppLayout } from '@/components/layout/AppLayout'
import { HomePage } from '@/features/home/HomePage'
import { ProfilePage } from '@/features/profile/ProfilePage'
import { ReferralPage } from '@/features/referral/ReferralPage'
import { BuyPage } from '@/features/buy/BuyPage'
import { WithdrawPage } from '@/features/withdraw/WithdrawPage'
import { AdminPage } from '@/features/admin/AdminPage'
import { OnboardingGate } from '@/features/onboarding/OnboardingGate'

export function AppRouter() {
  return (
    <BrowserRouter>
      <OnboardingGate>
        <Routes>
          <Route element={<AppLayout />}>
            <Route index element={<HomePage />} />
            <Route path="referral" element={<ReferralPage />} />
            <Route path="profile" element={<ProfilePage />} />
          </Route>
          <Route path="buy" element={<BuyPage />} />
          <Route path="withdraw" element={<WithdrawPage />} />
          <Route path="admin" element={<AdminPage />} />
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </OnboardingGate>
    </BrowserRouter>
  )
}

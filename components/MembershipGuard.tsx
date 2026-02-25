'use client'

import { useEffect } from 'react'
import { useRouter, usePathname } from 'next/navigation'
import { useAuth } from '@/contexts/AuthContext'

// Routes members without active subscriptions can still visit
const PAYWALL_EXEMPT = ['/member/', '/auth/', '/profile']

export default function MembershipGuard({ children }: { children: React.ReactNode }) {
  const { profile, loading } = useAuth()
  const router = useRouter()
  const pathname = usePathname()

  useEffect(() => {
    if (loading) return
    if (!profile) return

    // Trainers and admins always have full access
    if (profile.is_trainer || profile.is_admin) return

    // Full-access accounts (direct trainer clients) bypass paywall
    if (profile.has_full_access) return

    // Active members with paid subscription pass through
    if (profile.is_member && profile.membership_status === 'active') return

    // Everyone else (unpaid members, "nobody" users) → paywall
    const isExempt = PAYWALL_EXEMPT.some((prefix) => pathname.startsWith(prefix))
    if (!isExempt) {
      router.replace('/member/plans')
    }
  }, [loading, profile, pathname, router])

  return <>{children}</>
}

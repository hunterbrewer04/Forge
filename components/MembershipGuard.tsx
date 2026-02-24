'use client'

import { useEffect } from 'react'
import { useRouter, usePathname } from 'next/navigation'
import { useAuth } from '@/contexts/AuthContext'

// Routes members without active subscriptions can still visit
const PAYWALL_EXEMPT = ['/member/', '/login', '/signup', '/auth/']

export default function MembershipGuard({ children }: { children: React.ReactNode }) {
  const { profile, loading } = useAuth()
  const router = useRouter()
  const pathname = usePathname()

  useEffect(() => {
    if (loading) return
    if (!profile) return
    if (!profile.is_member) return

    if (profile.membership_status !== 'active') {
      const isExempt = PAYWALL_EXEMPT.some((prefix) => pathname.startsWith(prefix))
      if (!isExempt) {
        router.replace('/member/plans')
      }
    }
  }, [loading, profile, pathname, router])

  return <>{children}</>
}

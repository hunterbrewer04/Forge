'use client'

import { useEffect } from 'react'
import { useRouter, usePathname } from 'next/navigation'
import { useAuth } from '@/contexts/AuthContext'

// Routes members without active subscriptions can still visit
const PAYWALL_EXEMPT = ['/member/', '/auth/', '/profile']

function hasAccess(profile: { is_trainer: boolean; is_admin: boolean; has_full_access: boolean; is_member: boolean; membership_status: string | null }) {
  if (profile.is_trainer || profile.is_admin) return true
  if (profile.has_full_access) return true
  if (profile.is_member && profile.membership_status === 'active') return true
  return false
}

export default function MembershipGuard({ children }: { children: React.ReactNode }) {
  const { profile, loading } = useAuth()
  const router = useRouter()
  const pathname = usePathname()

  const isExempt = PAYWALL_EXEMPT.some((prefix) => pathname.startsWith(prefix))

  useEffect(() => {
    if (loading) return
    if (!profile) return
    if (hasAccess(profile)) return
    if (isExempt) return

    router.replace('/member/plans')
  }, [loading, profile, pathname, router, isExempt])

  // Exempt routes (login, signup, member/*) always render immediately
  if (isExempt) return <>{children}</>

  // Still loading auth — don't flash protected content
  if (loading) return null

  // Not logged in — let the page handle its own auth redirect
  if (!profile) return <>{children}</>

  // User has access — render normally
  if (hasAccess(profile)) return <>{children}</>

  // User needs paywall — suppress content while redirect happens
  return null
}

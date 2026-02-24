'use client'

import { useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { useAuth } from '@/contexts/AuthContext'

export default function ChatLayout({ children }: { children: React.ReactNode }) {
  const { profile, loading } = useAuth()
  const router = useRouter()

  useEffect(() => {
    if (!loading && profile && !profile.has_full_access && !profile.is_trainer) {
      router.replace('/home')
    }
  }, [loading, profile, router])

  if (loading || (!profile?.has_full_access && !profile?.is_trainer)) {
    return null
  }

  return <>{children}</>
}

'use client'

import { createContext, useContext, useEffect, useState, useCallback } from 'react'
import { useUser, useClerk } from '@clerk/nextjs'

interface Profile {
  id: string
  full_name: string | null
  avatar_url: string | null
  username: string | null
  is_trainer: boolean
  is_admin: boolean
  has_full_access: boolean
  is_member: boolean
  membership_status: 'active' | 'past_due' | 'canceled' | null
  created_at: string
}

interface AuthContextType {
  user: { id: string; email: string | undefined } | null
  profile: Profile | null
  loading: boolean
  signOut: () => Promise<void>
  refreshProfile: () => Promise<void>
}

const AuthContext = createContext<AuthContextType>({
  user: null,
  profile: null,
  loading: true,
  signOut: async () => {},
  refreshProfile: async () => {},
})

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const { user: clerkUser, isLoaded } = useUser()
  const { signOut: clerkSignOut } = useClerk()
  const [profile, setProfile] = useState<Profile | null>(null)
  const [profileLoading, setProfileLoading] = useState(false)

  const fetchProfile = useCallback(async () => {
    setProfileLoading(true)
    try {
      const res = await fetch('/api/profile')
      if (res.ok) {
        const data = await res.json()
        setProfile(data.profile)
      } else {
        setProfile(null)
      }
    } catch {
      setProfile(null)
    } finally {
      setProfileLoading(false)
    }
  }, [])

  useEffect(() => {
    if (isLoaded && clerkUser) {
      fetchProfile()
    } else if (isLoaded && !clerkUser) {
      setProfile(null)
    }
  }, [isLoaded, clerkUser, fetchProfile])

  const signOut = async () => {
    if (typeof navigator !== 'undefined' && 'serviceWorker' in navigator) {
      try {
        const timeout = new Promise<null>(resolve => setTimeout(() => resolve(null), 1000))
        const reg = await Promise.race([navigator.serviceWorker.ready, timeout])
        reg?.active?.postMessage({ type: 'CLEAR_DYNAMIC_CACHE' })
      } catch (err) {
        console.warn('Failed to clear SW cache:', err)
      }
    }
    await clerkSignOut()
  }

  const user = clerkUser
    ? { id: clerkUser.id, email: clerkUser.primaryEmailAddress?.emailAddress }
    : null

  return (
    <AuthContext.Provider value={{
      user,
      profile,
      loading: !isLoaded || profileLoading,
      signOut,
      refreshProfile: fetchProfile,
    }}>
      {children}
    </AuthContext.Provider>
  )
}

export function useAuth() {
  const context = useContext(AuthContext)
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider')
  }
  return context
}

'use client'

import { createContext, useContext, useEffect, useState, useCallback, useMemo } from 'react'
import { useUser, useClerk } from '@clerk/nextjs'
import { clearDynamicCache } from '@/lib/utils/sw-cache'

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
  // eslint-disable-next-line react-hooks/exhaustive-deps -- intentionally using clerkUser?.id to avoid re-fetches on object reference changes
  }, [isLoaded, clerkUser?.id, fetchProfile])

  const signOut = useCallback(async () => {
    await clearDynamicCache()
    await clerkSignOut()
  }, [clerkSignOut])

  const user = useMemo(
    () => clerkUser
      ? { id: clerkUser.id, email: clerkUser.primaryEmailAddress?.emailAddress }
      : null,
    // eslint-disable-next-line react-hooks/exhaustive-deps -- intentionally using stable primitives instead of full clerkUser object
    [clerkUser?.id, clerkUser?.primaryEmailAddress?.emailAddress]
  )

  const loading = !isLoaded || profileLoading

  const value = useMemo(
    () => ({ user, profile, loading, signOut, refreshProfile: fetchProfile }),
    [user, profile, loading, signOut, fetchProfile]
  )

  return (
    <AuthContext.Provider value={value}>
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

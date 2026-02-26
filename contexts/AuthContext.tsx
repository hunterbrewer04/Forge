'use client'

import { createContext, useContext, useEffect, useState, useCallback, useRef, useMemo } from 'react'
import { User, AuthError } from '@supabase/supabase-js'
import { createClient } from '@/lib/supabase-browser'

interface Profile {
  id: string
  full_name: string | null
  avatar_url: string | null
  username: string | null
  is_trainer: boolean
  is_admin: boolean
  has_full_access: boolean   // renamed from is_client
  is_member: boolean
  membership_status: 'active' | 'past_due' | 'canceled' | null
  created_at: string
}

interface AuthContextType {
  user: User | null
  profile: Profile | null
  loading: boolean
  error: AuthError | null
  signOut: () => Promise<void>
  refreshSession: () => Promise<void>
  refreshProfile: () => Promise<void>
}

const AuthContext = createContext<AuthContextType>({
  user: null,
  profile: null,
  loading: true,
  error: null,
  signOut: async () => {},
  refreshSession: async () => {},
  refreshProfile: async () => {},
})

/**
 * AuthProvider component that manages authentication state
 *
 * Security Features (Phase 2):
 * - Automatic session refresh on auth state changes
 * - Profile fetching with error handling
 * - Proper cleanup on component unmount
 * - Error state tracking for auth failures
 * - Session refresh capability for manual token refresh
 */
export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null)
  const [profile, setProfile] = useState<Profile | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<AuthError | null>(null)
  // Memoize supabase client to prevent recreation on every render
  // This fixes infinite useEffect loop caused by changing dependencies
  const supabase = useMemo(() => createClient(), [])
  const profileFetched = useRef(false)
  const authTimeoutRef = useRef<NodeJS.Timeout | null>(null)

  // Fetch user profile with error handling
  const fetchProfile = useCallback(async (userId: string) => {
    try {
      const { data: profileData, error: profileError } = await supabase
        .from('profiles')
        .select('id, full_name, avatar_url, username, is_trainer, is_admin, has_full_access, is_member, membership_status, created_at')
        .eq('id', userId)
        .single()

      if (profileError) {
        console.error('Error fetching profile:', profileError)
        setProfile(null)
        return
      }

      setProfile(profileData)
    } catch (err) {
      console.error('Unexpected error fetching profile:', err)
      setProfile(null)
    }
  }, [supabase])

  // Manual session refresh function
  const refreshSession = useCallback(async () => {
    try {
      const { data: { session }, error: refreshError } = await supabase.auth.refreshSession()

      if (refreshError) {
        console.error('Error refreshing session:', refreshError)
        setError(refreshError)
        setUser(null)
        setProfile(null)
        return
      }

      setUser(session?.user ?? null)
      setError(null)

      if (session?.user) {
        await fetchProfile(session.user.id)
      } else {
        setProfile(null)
      }
    } catch (err) {
      console.error('Unexpected error refreshing session:', err)
      setUser(null)
      setProfile(null)
    }
  }, [supabase, fetchProfile])

  useEffect(() => {
    let mounted = true

    // Safety timeout - if auth takes longer than 10 seconds, stop loading
    // This prevents infinite loading states from network issues or edge cases
    authTimeoutRef.current = setTimeout(() => {
      if (mounted && loading) {
        console.warn('Auth timeout reached - forcing loading to false')
        setLoading(false)
      }
    }, 10000)

    // Get initial session
    const getSession = async () => {
      try {
        const { data: { session }, error: sessionError } = await supabase.auth.getSession()

        if (!mounted) return

        if (sessionError) {
          console.error('Error getting session:', sessionError)
          setError(sessionError)
          setUser(null)
          setProfile(null)
          setLoading(false)
          return
        }

        setUser(session?.user ?? null)
        setError(null)

        if (session?.user && !profileFetched.current) {
          profileFetched.current = true
          await fetchProfile(session.user.id)
        }

        setLoading(false)
      } catch (err) {
        console.error('Unexpected error getting session:', err)
        if (mounted) {
          setUser(null)
          setProfile(null)
          setLoading(false)
        }
      }
    }

    getSession()

    // Listen for auth changes
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      async (event, session) => {
        if (!mounted) return

        // Handle different auth events
        if (event === 'SIGNED_OUT') {
          profileFetched.current = false  // Reset on logout
          setUser(null)
          setProfile(null)
          setError(null)
          setLoading(false)
          // Clear SW navigation cache to prevent serving stale authenticated pages
          // Use Promise.race to avoid hanging if no SW is active
          if (typeof navigator !== 'undefined' && 'serviceWorker' in navigator) {
            const timeout = new Promise<null>(resolve => setTimeout(() => resolve(null), 1000))
            Promise.race([navigator.serviceWorker.ready, timeout]).then(
              reg => reg?.active?.postMessage({ type: 'CLEAR_DYNAMIC_CACHE' })
            ).catch((err) => { console.warn('Failed to clear SW cache:', err) })
          }
        } else if (event === 'TOKEN_REFRESHED') {
          // Session was refreshed, update user
          setUser(session?.user ?? null)
          setError(null)
          setLoading(false)
        } else if (event === 'SIGNED_IN' || event === 'USER_UPDATED') {
          setUser(session?.user ?? null)
          setError(null)

          if (session?.user && !profileFetched.current) {
            profileFetched.current = true
            await fetchProfile(session.user.id)
          } else if (!session?.user) {
            setProfile(null)
          }
          setLoading(false)
        }
      }
    )

    return () => {
      mounted = false
      if (authTimeoutRef.current) {
        clearTimeout(authTimeoutRef.current)
      }
      subscription.unsubscribe()
    }
  // loading intentionally excluded — re-running this effect during loading transitions would re-bootstrap auth and re-subscribe to realtime events.
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [supabase, fetchProfile])

  const refreshProfile = useCallback(async () => {
    if (!user) {
      console.warn('refreshProfile called with no authenticated user')
      return
    }
    await fetchProfile(user.id)
  }, [user, fetchProfile])

  const signOut = async () => {
    try {
      // Clear SW navigation cache before signing out
      // Use Promise.race to avoid hanging if no SW is active
      if (typeof navigator !== 'undefined' && 'serviceWorker' in navigator) {
        const timeout = new Promise<null>(resolve => setTimeout(() => resolve(null), 1000))
        Promise.race([navigator.serviceWorker.ready, timeout]).then(
          reg => reg?.active?.postMessage({ type: 'CLEAR_DYNAMIC_CACHE' })
        ).catch((err) => { console.warn('Failed to clear SW cache:', err) })
      }

      const { error: signOutError } = await supabase.auth.signOut()

      if (signOutError) {
        console.error('Error signing out:', signOutError)
        setError(signOutError)
        return
      }

      setUser(null)
      setProfile(null)
      setError(null)
    } catch (err) {
      console.error('Unexpected error signing out:', err)
    }
  }

  return (
    <AuthContext.Provider value={{ user, profile, loading, error, signOut, refreshSession, refreshProfile }}>
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

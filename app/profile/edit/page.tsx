'use client'

import { useAuth } from '@/contexts/AuthContext'
import { useRouter } from 'next/navigation'
import { useState, useEffect } from 'react'
import MobileLayout from '@/components/layout/MobileLayout'
import { createClient } from '@/lib/supabase-browser'
import { logger } from '@/lib/utils/logger'
import { Save, X } from '@/components/ui/icons'

export default function EditProfilePage() {
  const { user, profile, loading, refreshSession } = useAuth()
  const router = useRouter()
  const [fullName, setFullName] = useState('')
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const supabase = createClient()

  // Redirect to login if not authenticated
  useEffect(() => {
    if (!loading && !user) {
      router.push('/login')
    }
  }, [user, loading, router])

  // Initialize form with profile data
  useEffect(() => {
    if (profile?.full_name) {
      setFullName(profile.full_name)
    }
  }, [profile])

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!user) return

    setSaving(true)
    setError(null)

    try {
      const { error: updateError } = await supabase
        .from('profiles')
        .update({ full_name: fullName })
        .eq('id', user.id)

      if (updateError) throw updateError

      // Use a hard reload or force a re-fetch if possible.
      // Since AuthContext listens to real-time changes or we can trigger a refresh manually if we had access to one.
      // For now, we'll just navigate back, and the profile page should eventually update or we can rely on nextjs cache revalidation if setup.
      // The AuthContext in this app listens to onAuthStateChange 'USER_UPDATED', but updating the profile table doesn't trigger that automatically for the auth user object.
      // However, the AuthContext.tsx implementation shows it fetches profile on mount/session change.
      // We might need to manually trigger a session refresh to see the change immediately or just wait.
      
      // Let's try to refresh the session to force a profile re-fetch
      await refreshSession()
      
      router.push('/profile')
      router.refresh()
    } catch (err) {
      logger.error('Error updating profile:', err)
      setError('Failed to update profile. Please try again.')
    } finally {
      setSaving(false)
    }
  }

  if (loading) {
    return (
      <MobileLayout title="Edit Profile" showBack showNotifications={false}>
        <div className="px-4 py-6 animate-pulse space-y-6">
          <div className="space-y-2">
            <div className="h-4 bg-stone-700 rounded w-20" />
            <div className="h-12 bg-stone-700 rounded-xl w-full" />
          </div>
          <div className="flex gap-3 pt-4">
            <div className="flex-1 h-12 bg-stone-700 rounded-xl" />
            <div className="flex-1 h-12 bg-primary/30 rounded-xl" />
          </div>
        </div>
      </MobileLayout>
    )
  }

  if (!user || !profile) {
    return null
  }

  return (
    <MobileLayout
      title="Edit Profile"
      showBack
      showNotifications={false}
    >
      <div className="px-4 py-6">
        <form onSubmit={handleSave} className="space-y-6">
          <div className="space-y-2">
            <label htmlFor="fullName" className="text-sm font-medium text-stone-400">
              Full Name
            </label>
            <input
              id="fullName"
              type="text"
              value={fullName}
              onChange={(e) => setFullName(e.target.value)}
              className="w-full bg-[#2C2C2C] text-white px-4 py-3 rounded-xl border border-transparent focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary transition-all"
              placeholder="Enter your full name"
            />
          </div>

          {error && (
            <div className="p-3 bg-red-500/10 border border-red-500/20 rounded-xl text-red-400 text-sm">
              {error}
            </div>
          )}

          <div className="flex gap-3 pt-4">
            <button
              type="button"
              onClick={() => router.push('/profile')}
              disabled={saving}
              className="flex-1 flex items-center justify-center gap-2 bg-[#2C2C2C] text-stone-300 py-3.5 rounded-xl font-bold transition-all active:scale-95 disabled:opacity-50"
            >
              <X size={20} strokeWidth={2} />
              Cancel
            </button>
            <button
              type="submit"
              disabled={saving}
              className="flex-1 flex items-center justify-center gap-2 bg-primary text-white py-3.5 rounded-xl font-bold transition-all active:scale-95 disabled:opacity-50"
            >
              <Save size={20} strokeWidth={2} />
              {saving ? 'Saving...' : 'Save Changes'}
            </button>
          </div>
        </form>
      </div>
    </MobileLayout>
  )
}
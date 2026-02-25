'use client'

import { useAuth } from '@/contexts/AuthContext'
import { useRouter } from 'next/navigation'
import { useState, useEffect } from 'react'
import MobileLayout from '@/components/layout/MobileLayout'
import { createClient } from '@/lib/supabase-browser'
import { logger } from '@/lib/utils/logger'
import { Save, X, Mail, Info } from '@/components/ui/icons'

export default function EditProfilePage() {
  const { user, profile, loading, refreshSession } = useAuth()
  const router = useRouter()
  const [fullName, setFullName] = useState('')
  const [username, setUsername] = useState('')
  const [email, setEmail] = useState('')
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [emailMessage, setEmailMessage] = useState<string | null>(null)
  const [usernameError, setUsernameError] = useState<string | null>(null)
  const supabase = createClient()

  // Redirect to login if not authenticated
  useEffect(() => {
    if (!loading && !user) {
      router.push('/member/login')
    }
  }, [user, loading, router])

  // Initialize form with profile data
  useEffect(() => {
    if (profile?.full_name) {
      setFullName(profile.full_name)
    }
    if (profile?.username) {
      setUsername(profile.username)
    }
    if (user?.email) {
      setEmail(user.email)
    }
  }, [profile, user])

  // Validate username format
  const validateUsername = (value: string): string | null => {
    if (!value) return null // Username is optional
    if (value.length < 3) return 'Username must be at least 3 characters'
    if (value.length > 20) return 'Username must be 20 characters or less'
    if (!/^[a-zA-Z0-9_]+$/.test(value)) return 'Username can only contain letters, numbers, and underscores'
    return null
  }

  // Check if username is unique (fail-closed: returns false on unexpected errors)
  const checkUsernameUnique = async (usernameToCheck: string): Promise<boolean> => {
    if (!usernameToCheck || usernameToCheck === profile?.username) return true

    const { data, error } = await supabase
      .from('profiles')
      .select('id')
      .eq('username', usernameToCheck)
      .neq('id', user?.id)
      .maybeSingle()

    if (error) {
      // Fail-closed: treat unexpected errors as "not unique"
      logger.error('Username uniqueness check failed:', error)
      return false
    }

    // If data is null, no matching row — username is unique
    return !data
  }

  const handleUsernameChange = (value: string) => {
    setUsername(value.toLowerCase())
    const validationError = validateUsername(value.toLowerCase())
    setUsernameError(validationError)
  }

  const handleEmailChange = async () => {
    if (!email || email === user?.email) return

    setEmailMessage(null)
    setError(null)

    try {
      const { error: emailError } = await supabase.auth.updateUser({ email })

      if (emailError) {
        // Check by status code (422) for "already registered" rather than message string
        if ('status' in emailError && emailError.status === 422) {
          setError('This email is already in use by another account.')
        } else {
          setError(`Failed to update email: ${emailError.message}`)
        }
        return
      }

      setEmailMessage('Verification email sent! Check your new email to confirm the change.')
    } catch (err) {
      logger.error('Error updating email:', err)
      setError('An unexpected error occurred while updating email.')
    }
  }

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!user) return

    // Validate username
    const usernameValidation = validateUsername(username)
    if (usernameValidation) {
      setUsernameError(usernameValidation)
      return
    }

    setSaving(true)
    setError(null)
    setUsernameError(null)

    try {
      const trimmedFullName = fullName.trim()
      if (!trimmedFullName) {
        setError('Full name cannot be empty.')
        setSaving(false)
        return
      }

      // Check username uniqueness
      if (username && username !== profile?.username) {
        const isUnique = await checkUsernameUnique(username)
        if (!isUnique) {
          setUsernameError('This username is already taken')
          setSaving(false)
          return
        }
      }

      // Update profile
      const updates: { full_name: string; username?: string | null } = { full_name: trimmedFullName }
      if (username !== profile?.username) {
        updates.username = username || null
      }

      const { error: updateError } = await supabase
        .from('profiles')
        .update(updates)
        .eq('id', user.id)

      if (updateError) throw updateError

      // Refresh the session so AuthContext re-fetches the updated profile data
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
          <div className="space-y-2">
            <div className="h-4 bg-stone-700 rounded w-20" />
            <div className="h-12 bg-stone-700 rounded-xl w-full" />
          </div>
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

  const emailChanged = email !== user.email

  return (
    <MobileLayout
      title="Edit Profile"
      showBack
      showNotifications={false}
    >
      <div className="px-4 py-6">
        <form onSubmit={handleSave} className="space-y-6">
          {/* Full Name */}
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

          {/* Username */}
          <div className="space-y-2">
            <label htmlFor="username" className="text-sm font-medium text-stone-400">
              Username
            </label>
            <div className="relative">
              <span className="absolute left-4 top-1/2 -translate-y-1/2 text-stone-500">@</span>
              <input
                id="username"
                type="text"
                value={username}
                onChange={(e) => handleUsernameChange(e.target.value)}
                className={`w-full bg-[#2C2C2C] text-white pl-8 pr-4 py-3 rounded-xl border transition-all focus:outline-none focus:ring-1 ${
                  usernameError
                    ? 'border-red-500 focus:border-red-500 focus:ring-red-500'
                    : 'border-transparent focus:border-primary focus:ring-primary'
                }`}
                placeholder="username"
                maxLength={20}
              />
            </div>
            {usernameError && (
              <p className="text-red-400 text-xs">{usernameError}</p>
            )}
            <p className="text-stone-500 text-xs">3-20 characters. Letters, numbers, and underscores only.</p>
          </div>

          {/* Email */}
          <div className="space-y-2">
            <label htmlFor="email" className="text-sm font-medium text-stone-400">
              Email Address
            </label>
            <div className="flex gap-2">
              <input
                id="email"
                type="email"
                value={email}
                onChange={(e) => {
                  setEmail(e.target.value)
                  setEmailMessage(null)
                }}
                className="flex-1 bg-[#2C2C2C] text-white px-4 py-3 rounded-xl border border-transparent focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary transition-all"
                placeholder="Enter your email"
              />
              {emailChanged && (
                <button
                  type="button"
                  onClick={handleEmailChange}
                  className="px-4 py-3 bg-primary text-white rounded-xl font-medium transition-all active:scale-95 whitespace-nowrap"
                >
                  <Mail size={20} strokeWidth={2} />
                </button>
              )}
            </div>
            {emailMessage && (
              <div className="flex items-start gap-2 p-3 bg-blue-500/10 border border-blue-500/20 rounded-xl">
                <Info size={16} strokeWidth={2} className="text-blue-400 mt-0.5 shrink-0" />
                <p className="text-blue-400 text-sm">{emailMessage}</p>
              </div>
            )}
            {emailChanged && !emailMessage && (
              <p className="text-stone-500 text-xs">Click the mail icon to send a verification email to your new address.</p>
            )}
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
              disabled={saving || !!usernameError}
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

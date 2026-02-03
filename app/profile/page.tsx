'use client'

import { useAuth } from '@/contexts/AuthContext'
import { useFacilityTheme } from '@/contexts/FacilityThemeContext'
import { useRouter } from 'next/navigation'
import { useEffect, useState, useRef } from 'react'
import MobileLayout from '@/components/layout/MobileLayout'
import { createClient } from '@/lib/supabase-browser'
import { logger } from '@/lib/utils/logger'
import { ProfileSkeleton } from '@/components/skeletons/ProfileSkeleton'
import { toast } from 'sonner'
import ConfirmModal from '@/components/ui/ConfirmModal'
import MaterialIcon from '@/components/ui/MaterialIcon'
import Image from 'next/image'

const ALLOWED_EXTENSIONS = ['jpg', 'jpeg', 'png', 'gif', 'webp']

export default function ProfilePage() {
  const { user, profile, loading, signOut, refreshSession } = useAuth()
  const { isDark, toggleTheme } = useFacilityTheme()
  const router = useRouter()
  const [signingOut, setSigningOut] = useState(false)
  const [uploadingAvatar, setUploadingAvatar] = useState(false)
  const fileInputRef = useRef<HTMLInputElement>(null)
  const supabase = createClient()
  const [showResetPasswordModal, setShowResetPasswordModal] = useState(false)

  useEffect(() => {
    if (!loading && !user) {
      router.push('/login')
    }
  }, [user, loading, router])

  const handleSignOut = async () => {
    setSigningOut(true)
    await signOut()
    router.push('/login')
  }

  const handleAvatarClick = () => {
    if (uploadingAvatar) return
    fileInputRef.current?.click()
  }

  const handleAvatarChange = async (event: React.ChangeEvent<HTMLInputElement>) => {
    if (!event.target.files || event.target.files.length === 0 || !user) return
    if (uploadingAvatar) return

    const file = event.target.files[0]
    const MAX_FILE_SIZE = 5 * 1024 * 1024
    const ALLOWED_TYPES = ['image/jpeg', 'image/png', 'image/gif', 'image/webp']

    if (!ALLOWED_TYPES.includes(file.type)) {
      toast.error('Please upload a valid image file (JPEG, PNG, GIF, or WebP)')
      return
    }

    if (file.size > MAX_FILE_SIZE) {
      toast.error('Image must be less than 5MB')
      return
    }

    const rawExt = file.name.split('.').pop()?.toLowerCase() || 'bin'
    const fileExt = ALLOWED_EXTENSIONS.includes(rawExt) ? rawExt : 'bin'
    if (fileExt === 'bin') {
      toast.error('Invalid file extension')
      return
    }

    setUploadingAvatar(true)
    const fileName = `${user.id}-${Date.now()}.${fileExt}`

    try {
      if (profile?.avatar_url) {
        const oldPath = profile.avatar_url.split('/avatars/')[1]
        if (oldPath && oldPath.startsWith(`${user.id}-`)) {
          await supabase.storage.from('avatars').remove([oldPath])
        }
      }

      const { error: uploadError } = await supabase.storage
        .from('avatars')
        .upload(fileName, file)

      if (uploadError) {
        logger.error('Upload error:', uploadError)
        toast.error(`Upload failed: ${uploadError.message}`)
        return
      }

      const { data: { publicUrl } } = supabase.storage.from('avatars').getPublicUrl(fileName)

      const { error: updateError } = await supabase
        .from('profiles')
        .update({ avatar_url: publicUrl })
        .eq('id', user.id)

      if (updateError) {
        await supabase.storage.from('avatars').remove([fileName])
        toast.error(`Failed to save: ${updateError.message}`)
        return
      }

      await refreshSession()
      toast.success('Avatar updated successfully')
    } catch (error) {
      logger.error('Error uploading avatar:', error)
      toast.error('Error updating avatar!')
    } finally {
      setUploadingAvatar(false)
    }
  }

  const confirmResetPassword = async () => {
    setShowResetPasswordModal(false)
    if (!user?.email) return

    try {
      const { error } = await supabase.auth.resetPasswordForEmail(user.email, {
        redirectTo: `${window.location.origin}/auth/update-password`,
      })
      if (error) throw error
      toast.success('Password reset email sent!')
    } catch (error) {
      logger.error('Error sending reset password email:', error)
      toast.error('Failed to send reset email.')
    }
  }

  const getMemberInfo = () => {
    if (!profile?.created_at) return 'Member'
    const date = new Date(profile.created_at)
    const month = date.toLocaleDateString('en-US', { month: 'short' })
    const year = date.getFullYear()
    return `Member since ${month} ${year}`
  }

  if (loading) {
    return (
      <MobileLayout title="Athlete Profile" showBack showNotifications={false}>
        <ProfileSkeleton />
      </MobileLayout>
    )
  }

  if (!user || !profile) {
    return null
  }

  const displayName = profile.full_name || 'User'
  const role = profile.is_trainer ? 'TRAINER' : 'VARSITY PITCHER'

  // Custom header
  const customHeader = (
    <header className="sticky top-0 z-30 w-full bg-bg-primary pt-safe-top transition-colors duration-200">
      <div className="flex items-center justify-between px-4 py-3">
        <button
          onClick={() => router.back()}
          className="size-10 flex items-center justify-center text-text-secondary hover:text-text-primary transition-colors"
          aria-label="Go back"
        >
          <MaterialIcon name="arrow_back" size={24} />
        </button>

        <h1 className="text-lg font-semibold text-text-primary">Athlete Profile</h1>

        <button
          className="size-10 flex items-center justify-center text-text-secondary hover:text-text-primary transition-colors"
          aria-label="Settings"
        >
          <MaterialIcon name="settings" size={24} />
        </button>
      </div>
    </header>
  )

  return (
    <MobileLayout customHeader={customHeader}>
      <input
        type="file"
        ref={fileInputRef}
        onChange={handleAvatarChange}
        className="hidden"
        accept="image/*"
        aria-label="Upload profile picture"
      />

      {/* Profile Header */}
      <section className="flex flex-col items-center pt-4 pb-6">
        <div
          className="relative mb-4 group cursor-pointer"
          onClick={handleAvatarClick}
          onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') handleAvatarClick() }}
          role="button"
          tabIndex={0}
          aria-label="Click to change profile picture"
        >
          {/* Avatar */}
          <div className="relative size-28 rounded-full overflow-hidden bg-bg-secondary border-4 border-primary">
            {profile?.avatar_url ? (
              <Image
                src={profile.avatar_url}
                alt={displayName}
                fill
                className="object-cover"
              />
            ) : (
              <div className="size-full flex items-center justify-center">
                <MaterialIcon name="person" size={48} className="text-text-muted" />
              </div>
            )}
            {uploadingAvatar && (
              <div className="absolute inset-0 bg-black/50 flex items-center justify-center">
                <div className="w-8 h-8 border-2 border-white border-t-transparent rounded-full animate-spin" />
              </div>
            )}
          </div>
          {/* Online indicator */}
          <div className="absolute bottom-2 right-2 size-4 bg-success rounded-full ring-4 ring-bg-primary" />
        </div>

        {/* Name & Role */}
        <h1 className="text-2xl font-bold text-text-primary mb-1">{displayName}</h1>
        <div className="bg-text-primary text-bg-primary text-xs font-bold px-3 py-1 rounded-full uppercase tracking-wider mb-2">
          {role}
        </div>
        <p className="text-text-muted text-sm">{getMemberInfo()} • #14</p>
      </section>

      {/* Account Management Section */}
      <section className="mt-2">
        <h3 className="py-2 text-xs font-semibold text-text-muted uppercase tracking-wider">
          Account Management
        </h3>
        <div className="flex flex-col bg-bg-card rounded-xl border border-border overflow-hidden">
          {/* Edit Profile */}
          <button
            onClick={() => router.push('/profile/edit')}
            className="flex items-center gap-4 px-4 py-4 hover:bg-bg-secondary transition-colors text-left"
          >
            <div className="flex items-center justify-center rounded-lg bg-bg-secondary size-10 shrink-0">
              <MaterialIcon name="person" size={22} className="text-text-primary" />
            </div>
            <span className="flex-1 text-text-primary font-medium">Edit Profile</span>
            <MaterialIcon name="chevron_right" size={22} className="text-text-muted" />
          </button>

          {/* Training History */}
          <button className="flex items-center gap-4 px-4 py-4 hover:bg-bg-secondary transition-colors text-left border-t border-border">
            <div className="flex items-center justify-center rounded-lg bg-bg-secondary size-10 shrink-0">
              <MaterialIcon name="history" size={22} className="text-text-primary" />
            </div>
            <span className="flex-1 text-text-primary font-medium">Training History</span>
            <MaterialIcon name="chevron_right" size={22} className="text-text-muted" />
          </button>

          {/* Notification Settings */}
          <button className="flex items-center gap-4 px-4 py-4 hover:bg-bg-secondary transition-colors text-left border-t border-border">
            <div className="flex items-center justify-center rounded-lg bg-bg-secondary size-10 shrink-0">
              <MaterialIcon name="notifications" size={22} className="text-text-primary" />
            </div>
            <span className="flex-1 text-text-primary font-medium">Notification Settings</span>
            <MaterialIcon name="chevron_right" size={22} className="text-text-muted" />
          </button>

          {/* Payment Methods */}
          <button
            onClick={() => router.push('/payments')}
            className="flex items-center gap-4 px-4 py-4 hover:bg-bg-secondary transition-colors text-left border-t border-border"
          >
            <div className="flex items-center justify-center rounded-lg bg-bg-secondary size-10 shrink-0">
              <MaterialIcon name="credit_card" size={22} className="text-text-primary" />
            </div>
            <span className="flex-1 text-text-primary font-medium">Payment Methods</span>
            <MaterialIcon name="chevron_right" size={22} className="text-text-muted" />
          </button>
        </div>
      </section>

      {/* Preferences Section */}
      <section className="mt-6">
        <h3 className="py-2 text-xs font-semibold text-text-muted uppercase tracking-wider">
          Preferences
        </h3>
        <div className="flex flex-col bg-bg-card rounded-xl border border-border overflow-hidden">
          {/* Theme Toggle */}
          <button
            onClick={toggleTheme}
            className="flex items-center gap-4 px-4 py-4 hover:bg-bg-secondary transition-colors text-left"
          >
            <div className="flex items-center justify-center rounded-lg bg-bg-secondary size-10 shrink-0">
              <MaterialIcon name={isDark ? 'dark_mode' : 'light_mode'} size={22} className="text-text-primary" />
            </div>
            <span className="flex-1 text-text-primary font-medium">
              {isDark ? 'Dark Mode' : 'Light Mode'}
            </span>
            <div className={`w-12 h-7 rounded-full p-1 transition-colors ${isDark ? 'bg-primary' : 'bg-bg-secondary border border-border'}`}>
              <div className={`size-5 rounded-full bg-white shadow transition-transform ${isDark ? 'translate-x-5' : 'translate-x-0'}`} />
            </div>
          </button>

          {/* Reset Password */}
          <button
            onClick={() => setShowResetPasswordModal(true)}
            className="flex items-center gap-4 px-4 py-4 hover:bg-bg-secondary transition-colors text-left border-t border-border"
          >
            <div className="flex items-center justify-center rounded-lg bg-bg-secondary size-10 shrink-0">
              <MaterialIcon name="lock" size={22} className="text-text-primary" />
            </div>
            <span className="flex-1 text-text-primary font-medium">Reset Password</span>
            <MaterialIcon name="chevron_right" size={22} className="text-text-muted" />
          </button>
        </div>
      </section>

      {/* Logout Button */}
      <section className="mt-8 mb-8">
        <button
          onClick={handleSignOut}
          disabled={signingOut}
          className="w-full flex items-center justify-center gap-2 bg-bg-card border border-border text-text-primary py-4 rounded-xl font-semibold transition-all hover:bg-bg-secondary active:scale-[0.98] disabled:opacity-50"
        >
          <MaterialIcon name="logout" size={22} />
          {signingOut ? 'Signing Out...' : 'Log Out'}
        </button>

        {/* Version Footer */}
        <div className="mt-6 text-center">
          <p className="text-xs text-text-muted">BASEPATH PRO V2.4.1</p>
        </div>
      </section>

      {/* Reset Password Confirmation Modal */}
      {showResetPasswordModal && (
        <ConfirmModal
          title="Reset Password"
          message={`Send password reset email to ${user?.email}?`}
          confirmText="Send Email"
          cancelText="Cancel"
          onConfirm={confirmResetPassword}
          onCancel={() => setShowResetPasswordModal(false)}
        />
      )}
    </MobileLayout>
  )
}

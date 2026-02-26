'use client'

import { useAuth } from '@/contexts/AuthContext'
import { useFacilityTheme } from '@/contexts/FacilityThemeContext'
import { useRouter } from 'next/navigation'
import { useEffect, useState, useRef } from 'react'
import GlassAppLayout from '@/components/layout/GlassAppLayout'
import GlassCard from '@/components/ui/GlassCard'
import { createClient } from '@/lib/supabase-browser'
import { logger } from '@/lib/utils/logger'
import { ProfileSkeleton } from '@/components/skeletons/ProfileSkeleton'
import { toast } from 'sonner'
import ConfirmModal from '@/components/ui/ConfirmModal'
import { ArrowLeft, User, ChevronRight, Clock, Bell, CreditCard, Calendar, Sun, Moon, Lock, LogOut } from '@/components/ui/icons'
import Image from 'next/image'
import dynamic from 'next/dynamic'
import { motion } from 'framer-motion'
import { staggerContainer, fadeUpItem } from '@/lib/motion'

const CalendarExportSheet = dynamic(() => import('./components/CalendarExportSheet'), { ssr: false })

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
  const [showCalendarExport, setShowCalendarExport] = useState(false)

  useEffect(() => {
    if (!loading && !user) {
      router.push('/member/login')
    }
  }, [user, loading, router])

  const handleSignOut = async () => {
    setSigningOut(true)
    await signOut()
    window.location.href = '/member/login'
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

  const LogOutButton = () => (
    <button
      onClick={handleSignOut}
      disabled={signingOut}
      className="w-full flex items-center justify-center gap-2 bg-bg-card border border-border text-text-primary py-4 rounded-xl font-semibold transition-all hover:bg-bg-secondary interactive-card disabled:opacity-50"
    >
      <LogOut size={22} />
      {signingOut ? 'Signing Out...' : 'Log Out'}
    </button>
  )

  if (loading) {
    return (
      <GlassAppLayout title="Athlete Profile" showBack showNotifications={false} desktopTitle="Athlete Profile">
        <ProfileSkeleton />
      </GlassAppLayout>
    )
  }

  if (!user || !profile) {
    return null
  }

  const displayName = profile.full_name || 'User'

  // Custom header
  const customHeader = (
    <header className="sticky top-0 z-30 w-full bg-bg-primary pt-safe-top transition-colors duration-200">
      <div className="flex items-center justify-between px-4 py-3">
        <button
          onClick={() => router.back()}
          className="size-10 flex items-center justify-center text-text-secondary hover:text-text-primary transition-colors"
          aria-label="Go back"
        >
          <ArrowLeft size={24} />
        </button>

        <h1 className="text-lg font-semibold text-text-primary">Athlete Profile</h1>

        <div className="size-10" />
      </div>
    </header>
  )

  return (
    <GlassAppLayout customHeader={customHeader} desktopTitle="Athlete Profile">
      <input
        type="file"
        ref={fileInputRef}
        onChange={handleAvatarChange}
        className="hidden"
        accept="image/*"
        aria-label="Upload profile picture"
      />

      <motion.div variants={staggerContainer} initial="hidden" animate="show" className="lg:grid lg:grid-cols-3 lg:gap-6 space-y-6 lg:space-y-0">
        {/* Left column: Identity card */}
        <motion.div variants={fadeUpItem}>
          <GlassCard variant="subtle" className="p-6">
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
                      <User size={48} className="text-text-muted" />
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

              {/* Name */}
              <h1 className="text-2xl font-bold text-text-primary mb-1 text-center w-full px-2">{displayName}</h1>
              <p className="text-text-muted text-sm">{getMemberInfo()}</p>
            </section>

            {/* Sign Out button in identity card on desktop */}
            <div className="hidden lg:block mt-2">
              <LogOutButton />
            </div>
          </GlassCard>
        </motion.div>

        {/* Right two columns: Account Management + Preferences */}
        <motion.div variants={fadeUpItem} className="lg:col-span-2 space-y-6">
          {/* Account Management Section */}
          <GlassCard variant="subtle" className="p-6">
            <section>
              <h3 className="py-2 text-xs font-semibold text-text-muted uppercase tracking-wider">
                Account Management
              </h3>
              <div className="flex flex-col bg-bg-card rounded-xl border border-border overflow-hidden">
                {/* Edit Profile */}
                <button
                  onClick={() => router.push('/profile/edit')}
                  className="flex items-center gap-4 px-4 py-4 hover:bg-bg-secondary transition-colors text-left interactive-card"
                >
                  <div className="flex items-center justify-center rounded-lg bg-bg-secondary size-10 shrink-0">
                    <User size={22} className="text-text-primary" />
                  </div>
                  <span className="flex-1 text-text-primary font-medium">Edit Profile</span>
                  <ChevronRight size={22} className="text-text-muted" />
                </button>

                {/* Training History */}
                <button onClick={() => router.push('/profile/history')} className="flex items-center gap-4 px-4 py-4 hover:bg-bg-secondary transition-colors text-left border-t border-border interactive-card">
                  <div className="flex items-center justify-center rounded-lg bg-bg-secondary size-10 shrink-0">
                    <Clock size={22} className="text-text-primary" />
                  </div>
                  <span className="flex-1 text-text-primary font-medium">Training History</span>
                  <ChevronRight size={22} className="text-text-muted" />
                </button>

                {/* Notification Settings */}
                <button onClick={() => router.push('/profile/notifications')} className="flex items-center gap-4 px-4 py-4 hover:bg-bg-secondary transition-colors text-left border-t border-border interactive-card">
                  <div className="flex items-center justify-center rounded-lg bg-bg-secondary size-10 shrink-0">
                    <Bell size={22} className="text-text-primary" />
                  </div>
                  <span className="flex-1 text-text-primary font-medium">Notification Settings</span>
                  <ChevronRight size={22} className="text-text-muted" />
                </button>

                {/* Payment Methods */}
                <button
                  onClick={() => router.push('/payments')}
                  className="flex items-center gap-4 px-4 py-4 hover:bg-bg-secondary transition-colors text-left border-t border-border interactive-card"
                >
                  <div className="flex items-center justify-center rounded-lg bg-bg-secondary size-10 shrink-0">
                    <CreditCard size={22} className="text-text-primary" />
                  </div>
                  <span className="flex-1 text-text-primary font-medium">Payment Methods</span>
                  <ChevronRight size={22} className="text-text-muted" />
                </button>

                {/* Calendar Feed */}
                <button
                  onClick={() => setShowCalendarExport(true)}
                  className="flex items-center gap-4 px-4 py-4 hover:bg-bg-secondary transition-colors text-left border-t border-border interactive-card"
                >
                  <div className="flex items-center justify-center rounded-lg bg-bg-secondary size-10 shrink-0">
                    <Calendar size={22} className="text-text-primary" />
                  </div>
                  <span className="flex-1 text-text-primary font-medium">Calendar Feed</span>
                  <ChevronRight size={22} className="text-text-muted" />
                </button>
              </div>
            </section>
          </GlassCard>

          {/* Preferences Section */}
          <GlassCard variant="subtle" className="p-6">
            <section>
              <h3 className="py-2 text-xs font-semibold text-text-muted uppercase tracking-wider">
                Preferences
              </h3>
              <div className="flex flex-col bg-bg-card rounded-xl border border-border overflow-hidden">
                {/* Theme Toggle */}
                <button
                  onClick={toggleTheme}
                  className="flex items-center gap-4 px-4 py-4 hover:bg-bg-secondary transition-colors text-left interactive-card"
                >
                  <div className="flex items-center justify-center rounded-lg bg-bg-secondary size-10 shrink-0">
                    {isDark ? <Moon size={22} className="text-text-primary" /> : <Sun size={22} className="text-text-primary" />}
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
                  className="flex items-center gap-4 px-4 py-4 hover:bg-bg-secondary transition-colors text-left border-t border-border interactive-card"
                >
                  <div className="flex items-center justify-center rounded-lg bg-bg-secondary size-10 shrink-0">
                    <Lock size={22} className="text-text-primary" />
                  </div>
                  <span className="flex-1 text-text-primary font-medium">Reset Password</span>
                  <ChevronRight size={22} className="text-text-muted" />
                </button>
              </div>
            </section>
          </GlassCard>
        </motion.div>
      </motion.div>

      {/* Logout Button — mobile only (desktop sign out is inside identity card) */}
      <section className="mt-8 mb-8 lg:hidden">
        <LogOutButton />
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

      {/* Calendar Export Sheet */}
      {showCalendarExport && (
        <CalendarExportSheet
          isOpen={showCalendarExport}
          onClose={() => setShowCalendarExport(false)}
        />
      )}
    </GlassAppLayout>
  )
}

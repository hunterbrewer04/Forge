'use client'

import { useAuth } from '@/contexts/AuthContext'
import { useFacilityTheme } from '@/contexts/FacilityThemeContext'
import { useRouter } from 'next/navigation'
import { useEffect, useState, useRef } from 'react'
import GlassAppLayout from '@/components/layout/GlassAppLayout'
import GlassCard from '@/components/ui/GlassCard'
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

export default function ProfilePage() {
  const { user, profile, loading, signOut, refreshProfile } = useAuth()
  const { isDark, toggleTheme } = useFacilityTheme()
  const router = useRouter()
  const [signingOut, setSigningOut] = useState(false)
  const [uploadingAvatar, setUploadingAvatar] = useState(false)
  const fileInputRef = useRef<HTMLInputElement>(null)
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
    if (!event.target.files || event.target.files.length === 0 || !user || !profile) return
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

    setUploadingAvatar(true)

    try {
      const formData = new FormData()
      formData.append('file', file)

      const res = await fetch('/api/avatar', { method: 'POST', body: formData })
      const data = await res.json()

      if (!res.ok) {
        toast.error(data.error || 'Failed to upload avatar')
        return
      }

      await refreshProfile()
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
    // TODO: Implement Clerk password management (e.g., redirect to Clerk's user profile or use Clerk's password reset flow)
    toast.info('Password management is handled through your account provider.')
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

      <motion.div variants={staggerContainer} initial="hidden" animate="show" className="lg:grid lg:grid-cols-2 lg:gap-8 space-y-6 lg:space-y-0">
        {/* Left column: Identity card */}
        <motion.div variants={fadeUpItem}>
          <GlassCard variant="subtle" className="overflow-hidden">
            {/* Gradient Header Banner */}
            <div className="h-28 bg-gradient-to-br from-primary via-orange-500 to-amber-500" />

            {/* Content below banner */}
            <div className="px-8 pb-8 flex flex-col items-center">
              {/* Avatar overlapping the banner */}
              <div
                className="-mt-[52px] relative mb-4 group cursor-pointer"
                onClick={handleAvatarClick}
                onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') handleAvatarClick() }}
                role="button"
                tabIndex={0}
                aria-label="Click to change profile picture"
              >
                {/* Gradient ring wrapper */}
                <div className="relative size-[104px] rounded-full p-1 bg-gradient-to-br from-primary to-orange-500">
                  <div className="relative size-full rounded-full overflow-hidden bg-bg-card">
                    {profile?.avatar_url ? (
                      <Image
                        src={profile.avatar_url}
                        alt={displayName}
                        fill
                        className="object-cover rounded-full"
                      />
                    ) : (
                      <div className="size-full flex items-center justify-center">
                        <User size={40} className="text-text-muted" />
                      </div>
                    )}
                    {uploadingAvatar && (
                      <div className="absolute inset-0 bg-black/50 flex items-center justify-center">
                        <div className="w-8 h-8 border-2 border-white border-t-transparent rounded-full animate-spin" />
                      </div>
                    )}
                  </div>
                </div>
                {/* Online indicator */}
                <div className="absolute bottom-1 right-1 size-4 bg-success rounded-full ring-4 ring-bg-card" />
              </div>

              <h1 className="text-2xl font-bold text-text-primary mb-1 text-center">{displayName}</h1>
              <p className="text-text-muted text-sm">{getMemberInfo()}</p>

              {/* Spacer */}
              <div className="flex-1 min-h-6" />

              {/* Theme Toggle */}
              <div className="w-full mt-6">
                <button
                  onClick={toggleTheme}
                  className="w-full flex items-center justify-between p-4 bg-bg-secondary rounded-xl cursor-pointer hover:bg-bg-secondary/80 transition-colors"
                >
                  <div className="flex items-center gap-3">
                    <div className="size-9 rounded-lg bg-warning/12 flex items-center justify-center">
                      {isDark ? <Moon size={18} className="text-warning" /> : <Sun size={18} className="text-warning" />}
                    </div>
                    <span className="text-text-primary font-medium text-sm">{isDark ? 'Dark Mode' : 'Light Mode'}</span>
                  </div>
                  <div className={`w-11 h-[26px] rounded-full p-0.5 transition-colors ${isDark ? 'bg-primary' : 'bg-bg-secondary border border-border'}`}>
                    <div className={`size-5 rounded-full bg-white shadow transition-transform ${isDark ? 'translate-x-[18px]' : 'translate-x-0'}`} />
                  </div>
                </button>
              </div>

              {/* Sign Out - desktop only */}
              <div className="hidden lg:block w-full mt-3">
                <LogOutButton />
              </div>
            </div>
          </GlassCard>
        </motion.div>

        {/* Right column: Settings grouped into a single card */}
        <motion.div variants={fadeUpItem}>
          <GlassCard variant="subtle" className="p-6 space-y-6">

            {/* Account section */}
            <section>
              <h3 className="pb-2 text-[11px] font-semibold text-text-muted uppercase tracking-wider">
                Account
              </h3>
              <div className="bg-bg-secondary rounded-xl overflow-hidden">
                {/* Edit Profile */}
                <button
                  onClick={() => router.push('/profile/edit')}
                  className="w-full flex items-center gap-3.5 px-4 py-4 hover:bg-bg-primary/50 transition-colors cursor-pointer text-left"
                >
                  <div className="size-10 rounded-xl bg-primary/10 flex items-center justify-center shrink-0">
                    <User size={20} className="text-primary" />
                  </div>
                  <span className="flex-1 text-text-primary font-medium text-sm">Edit Profile</span>
                  <ChevronRight size={18} className="text-text-muted" />
                </button>

                {/* Training History */}
                <button
                  onClick={() => router.push('/profile/history')}
                  className="w-full flex items-center gap-3.5 px-4 py-4 hover:bg-bg-primary/50 transition-colors cursor-pointer text-left border-t border-border"
                >
                  <div className="size-10 rounded-xl bg-primary/10 flex items-center justify-center shrink-0">
                    <Clock size={20} className="text-primary" />
                  </div>
                  <span className="flex-1 text-text-primary font-medium text-sm">Training History</span>
                  <ChevronRight size={18} className="text-text-muted" />
                </button>

                {/* Notification Settings */}
                <button
                  onClick={() => router.push('/profile/notifications')}
                  className="w-full flex items-center gap-3.5 px-4 py-4 hover:bg-bg-primary/50 transition-colors cursor-pointer text-left border-t border-border"
                >
                  <div className="size-10 rounded-xl bg-primary/10 flex items-center justify-center shrink-0">
                    <Bell size={20} className="text-primary" />
                  </div>
                  <span className="flex-1 text-text-primary font-medium text-sm">Notification Settings</span>
                  <ChevronRight size={18} className="text-text-muted" />
                </button>
              </div>
            </section>

            {/* Billing & Tools section */}
            <section>
              <h3 className="pb-2 text-[11px] font-semibold text-text-muted uppercase tracking-wider">
                Billing &amp; Tools
              </h3>
              <div className="bg-bg-secondary rounded-xl overflow-hidden">
                {/* Payment Methods */}
                <button
                  onClick={() => router.push('/payments')}
                  className="w-full flex items-center gap-3.5 px-4 py-4 hover:bg-bg-primary/50 transition-colors cursor-pointer text-left"
                >
                  <div className="size-10 rounded-xl bg-success/10 flex items-center justify-center shrink-0">
                    <CreditCard size={20} className="text-success" />
                  </div>
                  <span className="flex-1 text-text-primary font-medium text-sm">Payment Methods</span>
                  <ChevronRight size={18} className="text-text-muted" />
                </button>

                {/* Calendar Feed */}
                <button
                  onClick={() => setShowCalendarExport(true)}
                  className="w-full flex items-center gap-3.5 px-4 py-4 hover:bg-bg-primary/50 transition-colors cursor-pointer text-left border-t border-border"
                >
                  <div className="size-10 rounded-xl bg-primary/10 flex items-center justify-center shrink-0">
                    <Calendar size={20} className="text-primary" />
                  </div>
                  <span className="flex-1 text-text-primary font-medium text-sm">Calendar Feed</span>
                  <ChevronRight size={18} className="text-text-muted" />
                </button>
              </div>
            </section>

            {/* Security section */}
            <section>
              <h3 className="pb-2 text-[11px] font-semibold text-text-muted uppercase tracking-wider">
                Security
              </h3>
              <div className="bg-bg-secondary rounded-xl overflow-hidden">
                {/* Reset Password */}
                <button
                  onClick={() => setShowResetPasswordModal(true)}
                  className="w-full flex items-center gap-3.5 px-4 py-4 hover:bg-bg-primary/50 transition-colors cursor-pointer text-left"
                >
                  <div className="size-10 rounded-xl bg-error/10 flex items-center justify-center shrink-0">
                    <Lock size={20} className="text-error" />
                  </div>
                  <span className="flex-1 text-text-primary font-medium text-sm">Reset Password</span>
                  <ChevronRight size={18} className="text-text-muted" />
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

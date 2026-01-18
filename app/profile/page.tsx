'use client'

import { useAuth } from '@/contexts/AuthContext'
import { useRouter } from 'next/navigation'
import { useEffect, useState, useRef } from 'react'
import MobileLayout from '@/components/layout/MobileLayout'
import { createClient } from '@/lib/supabase-browser'
import { logger } from '@/lib/utils/logger'
import { ProfileSkeleton } from '@/components/skeletons/ProfileSkeleton'
import { MoreVertical, User, Pencil, BadgeCheck, CreditCard, Bell, Settings2, HelpCircle, LogOut, ChevronRight, Lock } from '@/components/ui/icons'
import { useToast } from '@/lib/hooks/useToast'
import Toast from '@/components/ui/Toast'
import ConfirmModal from '@/components/ui/ConfirmModal'

export default function ProfilePage() {
  const { user, profile, loading, signOut, refreshSession } = useAuth()
  const router = useRouter()
  const [signingOut, setSigningOut] = useState(false)
  const [uploadingAvatar, setUploadingAvatar] = useState(false)
  const fileInputRef = useRef<HTMLInputElement>(null)
  const supabase = createClient()
  const { toasts, showToast, removeToast } = useToast()
  const [showResetPasswordModal, setShowResetPasswordModal] = useState(false)

  // Redirect to login if not authenticated
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
    if (!event.target.files || event.target.files.length === 0 || !user) {
      return
    }

    if (uploadingAvatar) return

    const file = event.target.files[0]

    // File validation
    const MAX_FILE_SIZE = 5 * 1024 * 1024 // 5MB
    const ALLOWED_TYPES = ['image/jpeg', 'image/png', 'image/gif', 'image/webp']

    if (!ALLOWED_TYPES.includes(file.type)) {
      showToast('Please upload a valid image file (JPEG, PNG, GIF, or WebP)', 'error')
      return
    }

    if (file.size > MAX_FILE_SIZE) {
      showToast('Image must be less than 5MB', 'error')
      return
    }

    setUploadingAvatar(true)
    const fileExt = file.name.split('.').pop()
    const fileName = `${user.id}-${Math.random()}.${fileExt}`
    const filePath = `${fileName}`

    try {
      // Upload image to avatars bucket with upsert
      const { error: uploadError } = await supabase.storage
        .from('avatars')
        .upload(filePath, file, { upsert: true })

      if (uploadError) throw uploadError

      // Get public URL
      const { data: { publicUrl } } = supabase.storage
        .from('avatars')
        .getPublicUrl(filePath)

      // Update profile
      const { error: updateError } = await supabase
        .from('profiles')
        .update({ avatar_url: publicUrl })
        .eq('id', user.id)

      if (updateError) throw updateError

      // Refresh local state
      await refreshSession()

      showToast('Avatar updated successfully', 'success')
      logger.debug('Avatar updated successfully')
    } catch (error) {
      logger.error('Error uploading avatar:', error)
      showToast('Error updating avatar!', 'error')
    } finally {
      setUploadingAvatar(false)
    }
  }

  const handleResetPassword = async () => {
    if (!user?.email) return
    setShowResetPasswordModal(true)
  }

  const confirmResetPassword = async () => {
    setShowResetPasswordModal(false)
    if (!user?.email) return

    try {
      const { error } = await supabase.auth.resetPasswordForEmail(user.email, {
        redirectTo: `${window.location.origin}/auth/update-password`,
      })
      if (error) throw error
      showToast('Password reset email sent!', 'success')
    } catch (error) {
      logger.error('Error sending reset password email:', error)
      showToast('Failed to send reset email.', 'error')
    }
  }

  const getMemberSince = () => {
    if (!profile?.created_at) return 'Member'
    const year = new Date(profile.created_at).getFullYear()
    return `Member since ${year}`
  }

  if (loading) {
    return (
      <MobileLayout title="My Profile" showBack showNotifications={false}>
        <ProfileSkeleton />
      </MobileLayout>
    )
  }

  if (!user || !profile) {
    return null
  }

  const displayName = profile.full_name || 'User'

  return (
    <MobileLayout
      title="My Profile"
      showBack
      showNotifications={false}
      topBarRightContent={
        <button className="size-10 rounded-full flex items-center justify-center hover:bg-white/10 transition-colors">
          <MoreVertical size={24} strokeWidth={2} />
        </button>
      }
    >
      <input
        type="file"
        ref={fileInputRef}
        onChange={handleAvatarChange}
        className="hidden"
        accept="image/*"
        aria-label="Upload profile picture"
      />

      {/* Profile Header */}
      <section className="flex flex-col items-center pt-2 pb-2">
        <div
          className="relative mb-4 group cursor-pointer"
          onClick={handleAvatarClick}
          onKeyDown={(e) => {
            if (e.key === ' ') {
              e.preventDefault();
              handleAvatarClick();
            } else if (e.key === 'Enter') {
              handleAvatarClick();
            }
          }}
          role="button"
          tabIndex={0}
          aria-label="Click to change profile picture"
        >
          {/* Molten Ring Effect */}
          <div className="absolute -inset-1 bg-gradient-to-tr from-primary via-orange-500 to-yellow-500 rounded-full blur opacity-75 group-hover:opacity-100 transition duration-500"></div>
          <div
            className="relative size-32 rounded-full border-4 border-background-dark overflow-hidden bg-gray-800 bg-cover bg-center"
            style={
              profile?.avatar_url
                ? { backgroundImage: `url('${profile.avatar_url}')` }
                : undefined
            }
          >
            {uploadingAvatar ? (
               <div className="size-full flex items-center justify-center bg-black/50 text-white">
                 <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-white"></div>
               </div>
            ) : !profile?.avatar_url && (
              <div className="size-full flex items-center justify-center text-stone-400">
                <User size={48} strokeWidth={2} />
              </div>
            )}
          </div>
          <div className="absolute bottom-1 right-1 bg-primary text-white rounded-full p-1.5 border-4 border-background-dark shadow-sm">
            <Pencil size={16} strokeWidth={2.5} className="block" />
          </div>
        </div>
        <div className="text-center space-y-1">
          <h1 className="text-2xl font-bold tracking-tight text-white uppercase">{displayName}</h1>
          <div className="flex items-center justify-center gap-2">
            <BadgeCheck size={18} strokeWidth={2} className="text-gold" />
            <p className="text-gold text-sm font-bold tracking-wider uppercase">Elite Member</p>
          </div>
          <p className="text-gray-400 text-xs">{getMemberSince()}</p>
        </div>
      </section>

      {/* Settings Group: Account */}
      <section className="mt-2">
        <h3 className="py-2 text-xs font-bold text-gray-500 uppercase tracking-widest">Account</h3>
        <div className="flex flex-col -mx-4">
          {/* Personal Information */}
          <button 
            onClick={() => router.push('/profile/edit')}
            className="flex items-center gap-4 px-4 py-4 hover:bg-white/5 transition-colors group"
          >
            <div className="flex items-center justify-center rounded-lg bg-white/10 text-white size-10 shrink-0 group-hover:bg-primary group-hover:text-white transition-colors">
              <User size={24} strokeWidth={2} />
            </div>
            <div className="flex-1 text-left">
              <p className="text-base font-medium text-white">Personal Information</p>
              <p className="text-xs text-gray-400">Edit name, email, avatar</p>
            </div>
            <ChevronRight size={24} strokeWidth={2} className="text-gray-400" />
          </button>

          {/* Reset Password */}
          <button 
            onClick={handleResetPassword}
            className="flex items-center gap-4 px-4 py-4 hover:bg-white/5 transition-colors group"
          >
            <div className="flex items-center justify-center rounded-lg bg-white/10 text-white size-10 shrink-0 group-hover:bg-primary group-hover:text-white transition-colors">
              <Lock size={24} strokeWidth={2} />
            </div>
            <div className="flex-1 text-left">
              <p className="text-base font-medium text-white">Reset Password</p>
              <p className="text-xs text-gray-400">Update your security credentials</p>
            </div>
            <ChevronRight size={24} strokeWidth={2} className="text-gray-400" />
          </button>

          {/* Payment & Billing */}
          <button className="flex items-center gap-4 px-4 py-4 hover:bg-white/5 transition-colors group">
            <div className="flex items-center justify-center rounded-lg bg-white/10 text-white size-10 shrink-0 group-hover:bg-primary group-hover:text-white transition-colors">
              <CreditCard size={24} strokeWidth={2} />
            </div>
            <div className="flex-1 text-left">
              <p className="text-base font-medium text-white">Payment & Billing</p>
              <p className="text-xs text-gray-400">Manage cards and history</p>
            </div>
            <ChevronRight size={24} strokeWidth={2} className="text-gray-400" />
          </button>
        </div>
      </section>

      {/* Settings Group: Preferences */}
      <section className="mt-4">
        <h3 className="py-2 text-xs font-bold text-gray-500 uppercase tracking-widest">Preferences</h3>
        <div className="flex flex-col -mx-4">
          {/* Notifications */}
          <button className="flex items-center gap-4 px-4 py-4 hover:bg-white/5 transition-colors group">
            <div className="flex items-center justify-center rounded-lg bg-white/10 text-white size-10 shrink-0 group-hover:bg-primary group-hover:text-white transition-colors">
              <Bell size={24} strokeWidth={2} />
            </div>
            <div className="flex-1 text-left">
              <p className="text-base font-medium text-white">Notifications</p>
            </div>
            <ChevronRight size={24} strokeWidth={2} className="text-gray-400" />
          </button>

          {/* App Settings */}
          <button className="flex items-center gap-4 px-4 py-4 hover:bg-white/5 transition-colors group">
            <div className="flex items-center justify-center rounded-lg bg-white/10 text-white size-10 shrink-0 group-hover:bg-primary group-hover:text-white transition-colors">
              <Settings2 size={24} strokeWidth={2} />
            </div>
            <div className="flex-1 text-left">
              <p className="text-base font-medium text-white">App Settings</p>
              <p className="text-xs text-gray-400">Units, Theme</p>
            </div>
            <ChevronRight size={24} strokeWidth={2} className="text-gray-400" />
          </button>
        </div>
      </section>

      {/* Settings Group: Support & Logout */}
      <section className="mt-4 mb-8">
        <h3 className="py-2 text-xs font-bold text-gray-500 uppercase tracking-widest">Support</h3>
        <div className="flex flex-col -mx-4">
          {/* Help & Support */}
          <button className="flex items-center gap-4 px-4 py-4 hover:bg-white/5 transition-colors group">
            <div className="flex items-center justify-center rounded-lg bg-white/10 text-white size-10 shrink-0 group-hover:bg-primary group-hover:text-white transition-colors">
              <HelpCircle size={24} strokeWidth={2} />
            </div>
            <div className="flex-1 text-left">
              <p className="text-base font-medium text-white">Help & Support</p>
            </div>
            <ChevronRight size={24} strokeWidth={2} className="text-gray-400" />
          </button>

          {/* Logout Button */}
          <div className="px-4 mt-6">
            <button
              onClick={handleSignOut}
              disabled={signingOut}
              className="w-full flex items-center justify-center gap-2 bg-[#A50000] hover:bg-[#800000] disabled:opacity-50 disabled:cursor-not-allowed text-white py-4 rounded-lg font-bold tracking-wider uppercase transition-all active:scale-[0.98]"
            >
              <LogOut size={24} strokeWidth={2} />
              {signingOut ? 'Signing Out...' : 'Log Out'}
            </button>
          </div>

          {/* Version Footer */}
          <div className="mt-6 text-center pb-4">
            <p className="text-xs text-white/20">Foundry App v2.4.0</p>
          </div>
        </div>
      </section>

      {/* Toast Notifications */}
      {toasts.map((toast, index) => (
        <Toast
          key={toast.id}
          message={toast.message}
          type={toast.type}
          index={index}
          onClose={() => removeToast(toast.id)}
        />
      ))}

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

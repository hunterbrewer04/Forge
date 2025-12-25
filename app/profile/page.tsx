'use client'

import { useAuth } from '@/contexts/AuthContext'
import { useRouter } from 'next/navigation'
import { useEffect, useState } from 'react'
import MobileLayout from '@/components/layout/MobileLayout'

interface ProfileStats {
  sessions: number
  streak: number
  badges: number
}

export default function ProfilePage() {
  const { user, profile, loading, signOut } = useAuth()
  const router = useRouter()
  const [stats] = useState<ProfileStats>({ sessions: 42, streak: 5, badges: 12 })
  const [signingOut, setSigningOut] = useState(false)

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

  const getMemberSince = () => {
    if (!profile?.created_at) return 'Member'
    const year = new Date(profile.created_at).getFullYear()
    return `Member since ${year}`
  }

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background-dark">
        <div className="text-stone-400">Loading...</div>
      </div>
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
          <span className="material-symbols-outlined">more_vert</span>
        </button>
      }
    >
      {/* Profile Header */}
      <section className="flex flex-col items-center pt-2 pb-2">
        <div className="relative mb-4 group cursor-pointer">
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
            {!profile?.avatar_url && (
              <div className="size-full flex items-center justify-center text-stone-400">
                <span className="material-symbols-outlined text-[48px]">person</span>
              </div>
            )}
          </div>
          <div className="absolute bottom-1 right-1 bg-primary text-white rounded-full p-1.5 border-4 border-background-dark shadow-sm">
            <span className="material-symbols-outlined text-[16px] font-bold block">edit</span>
          </div>
        </div>
        <div className="text-center space-y-1">
          <h1 className="text-2xl font-bold tracking-tight text-white uppercase">{displayName}</h1>
          <div className="flex items-center justify-center gap-2">
            <span className="material-symbols-outlined text-gold text-[18px]">verified</span>
            <p className="text-gold text-sm font-bold tracking-wider uppercase">Elite Member</p>
          </div>
          <p className="text-gray-400 text-xs">{getMemberSince()}</p>
        </div>
      </section>

      {/* Stats Dashboard */}
      <section>
        <div className="grid grid-cols-3 gap-3">
          {/* Sessions Card */}
          <div className="flex flex-col items-center justify-center p-3 rounded-xl bg-surface-dark shadow-sm border border-white/5">
            <span className="material-symbols-outlined text-gray-400 mb-1">fitness_center</span>
            <p className="text-2xl font-bold text-white leading-none">{stats.sessions}</p>
            <p className="text-[10px] font-medium text-gray-400 uppercase tracking-wider mt-1">Sessions</p>
          </div>

          {/* Streak Card (Primary Highlight) */}
          <div className="relative flex flex-col items-center justify-center p-3 rounded-xl bg-gradient-to-br from-primary/20 to-surface-dark border border-primary/30 shadow-sm overflow-hidden">
            <div className="absolute -top-6 -right-6 w-12 h-12 bg-primary/20 rounded-full blur-xl"></div>
            <span className="material-symbols-outlined text-primary mb-1">local_fire_department</span>
            <p className="text-2xl font-bold text-primary leading-none">{stats.streak}</p>
            <p className="text-[10px] font-medium text-primary/80 uppercase tracking-wider mt-1">Day Streak</p>
          </div>

          {/* Badges Card */}
          <div className="flex flex-col items-center justify-center p-3 rounded-xl bg-surface-dark shadow-sm border border-white/5">
            <span className="material-symbols-outlined text-gray-400 mb-1">military_tech</span>
            <p className="text-2xl font-bold text-white leading-none">{stats.badges}</p>
            <p className="text-[10px] font-medium text-gray-400 uppercase tracking-wider mt-1">Badges</p>
          </div>
        </div>
      </section>

      {/* Settings Group: Account */}
      <section className="mt-2">
        <h3 className="py-2 text-xs font-bold text-gray-500 uppercase tracking-widest">Account</h3>
        <div className="flex flex-col -mx-4">
          {/* Personal Information */}
          <button className="flex items-center gap-4 px-4 py-4 hover:bg-white/5 transition-colors group">
            <div className="flex items-center justify-center rounded-lg bg-white/10 text-white size-10 shrink-0 group-hover:bg-primary group-hover:text-white transition-colors">
              <span className="material-symbols-outlined">person</span>
            </div>
            <div className="flex-1 text-left">
              <p className="text-base font-medium text-white">Personal Information</p>
              <p className="text-xs text-gray-400">Edit name, email, avatar</p>
            </div>
            <span className="material-symbols-outlined text-gray-400">chevron_right</span>
          </button>

          {/* Payment & Billing */}
          <button className="flex items-center gap-4 px-4 py-4 hover:bg-white/5 transition-colors group">
            <div className="flex items-center justify-center rounded-lg bg-white/10 text-white size-10 shrink-0 group-hover:bg-primary group-hover:text-white transition-colors">
              <span className="material-symbols-outlined">payments</span>
            </div>
            <div className="flex-1 text-left">
              <p className="text-base font-medium text-white">Payment & Billing</p>
              <p className="text-xs text-gray-400">Manage cards and history</p>
            </div>
            <span className="material-symbols-outlined text-gray-400">chevron_right</span>
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
              <span className="material-symbols-outlined">notifications</span>
            </div>
            <div className="flex-1 text-left">
              <p className="text-base font-medium text-white">Notifications</p>
            </div>
            <span className="material-symbols-outlined text-gray-400">chevron_right</span>
          </button>

          {/* App Settings */}
          <button className="flex items-center gap-4 px-4 py-4 hover:bg-white/5 transition-colors group">
            <div className="flex items-center justify-center rounded-lg bg-white/10 text-white size-10 shrink-0 group-hover:bg-primary group-hover:text-white transition-colors">
              <span className="material-symbols-outlined">tune</span>
            </div>
            <div className="flex-1 text-left">
              <p className="text-base font-medium text-white">App Settings</p>
              <p className="text-xs text-gray-400">Units, Theme</p>
            </div>
            <span className="material-symbols-outlined text-gray-400">chevron_right</span>
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
              <span className="material-symbols-outlined">help</span>
            </div>
            <div className="flex-1 text-left">
              <p className="text-base font-medium text-white">Help & Support</p>
            </div>
            <span className="material-symbols-outlined text-gray-400">chevron_right</span>
          </button>

          {/* Logout Button */}
          <div className="px-4 mt-6">
            <button
              onClick={handleSignOut}
              disabled={signingOut}
              className="w-full flex items-center justify-center gap-2 bg-[#A50000] hover:bg-[#800000] disabled:opacity-50 disabled:cursor-not-allowed text-white py-4 rounded-lg font-bold tracking-wider uppercase transition-all active:scale-[0.98]"
            >
              <span className="material-symbols-outlined">logout</span>
              {signingOut ? 'Signing Out...' : 'Log Out'}
            </button>
          </div>

          {/* Version Footer */}
          <div className="mt-6 text-center pb-4">
            <p className="text-xs text-white/20">Foundry App v2.4.0</p>
          </div>
        </div>
      </section>
    </MobileLayout>
  )
}

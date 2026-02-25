'use client'

import { useAuth } from '@/contexts/AuthContext'
import { useRouter } from 'next/navigation'
import { useEffect, useState, useCallback } from 'react'
import MobileLayout from '@/components/layout/MobileLayout'
import {
  isPushSupported,
  getNotificationPermission,
  requestNotificationPermission,
  subscribeToPush,
  unsubscribeFromPush,
  hasActivePushSubscription,
} from '@/lib/services/push-notifications'
import { Bell, MessageCircle, Calendar, AlertTriangle, Loader2 } from '@/components/ui/icons'
import { toast } from 'sonner'
import { logger } from '@/lib/utils/logger'

type PushState = 'loading' | 'unsupported' | 'denied' | 'enabled' | 'disabled'

export default function NotificationSettingsPage() {
  const { user, loading } = useAuth()
  const router = useRouter()
  const [pushState, setPushState] = useState<PushState>('loading')
  const [toggling, setToggling] = useState(false)

  useEffect(() => {
    if (!loading && !user) {
      router.push('/member/login')
    }
  }, [user, loading, router])

  // Determine initial push state
  useEffect(() => {
    async function checkPushState() {
      if (!isPushSupported()) {
        setPushState('unsupported')
        return
      }

      const permission = getNotificationPermission()
      if (permission === 'denied') {
        setPushState('denied')
        return
      }

      const active = await hasActivePushSubscription()
      setPushState(active ? 'enabled' : 'disabled')
    }

    checkPushState()
  }, [])

  const handleToggle = useCallback(async () => {
    if (!user || toggling) return
    setToggling(true)

    try {
      if (pushState === 'enabled') {
        const success = await unsubscribeFromPush(user.id)
        if (success) {
          setPushState('disabled')
          toast.success('Push notifications disabled')
        } else {
          toast.error('Failed to disable notifications')
        }
      } else {
        // disabled → enabled
        const permission = await requestNotificationPermission()

        if (permission === 'denied') {
          setPushState('denied')
          toast.error('Notification permission denied')
          return
        }

        if (permission === 'granted') {
          const success = await subscribeToPush(user.id)
          if (success) {
            setPushState('enabled')
            toast.success('Push notifications enabled')
          } else {
            toast.error('Failed to enable notifications')
          }
        }
      }
    } catch (error) {
      logger.error('Failed to toggle push notifications:', error)
      toast.error('Something went wrong')
    } finally {
      setToggling(false)
    }
  }, [user, pushState, toggling])

  const isEnabled = pushState === 'enabled'
  const canToggle = pushState === 'enabled' || pushState === 'disabled'

  const statusText = {
    loading: 'Checking...',
    unsupported: 'Not Supported',
    denied: 'Blocked by Browser',
    enabled: 'Enabled',
    disabled: 'Disabled',
  }[pushState]

  if (loading || !user) {
    return (
      <MobileLayout title="Notification Settings" showBack>
        <div className="flex items-center justify-center py-20">
          <Loader2 size={24} className="text-text-muted animate-spin" />
        </div>
      </MobileLayout>
    )
  }

  return (
    <MobileLayout title="Notification Settings" showBack>
      {/* Push Notification Toggle */}
      <section className="mt-2">
        <h3 className="py-2 text-xs font-semibold text-text-muted uppercase tracking-wider">
          Push Notifications
        </h3>
        <div className="bg-bg-card rounded-xl border border-border overflow-hidden">
          <button
            onClick={canToggle ? handleToggle : undefined}
            disabled={!canToggle || toggling}
            className="flex items-center gap-4 px-4 py-4 w-full text-left disabled:opacity-60"
          >
            <div className="flex items-center justify-center rounded-lg bg-bg-secondary size-10 shrink-0">
              <Bell size={22} className="text-text-primary" />
            </div>
            <div className="flex-1 min-w-0">
              <span className="text-text-primary font-medium block">Push Notifications</span>
              <span className={`text-xs ${isEnabled ? 'text-success' : 'text-text-muted'}`}>
                {statusText}
              </span>
            </div>
            {canToggle && (
              <div className={`w-12 h-7 rounded-full p-1 transition-colors ${isEnabled ? 'bg-primary' : 'bg-bg-secondary border border-border'}`}>
                {toggling ? (
                  <div className="size-5 flex items-center justify-center">
                    <Loader2 size={14} className="text-text-muted animate-spin" />
                  </div>
                ) : (
                  <div className={`size-5 rounded-full bg-white shadow transition-transform ${isEnabled ? 'translate-x-5' : 'translate-x-0'}`} />
                )}
              </div>
            )}
          </button>
        </div>
      </section>

      {/* Denied Warning */}
      {pushState === 'denied' && (
        <section className="mt-4">
          <div className="bg-amber-500/10 border border-amber-500/20 rounded-xl p-4 flex gap-3">
            <AlertTriangle size={20} className="text-amber-500 shrink-0 mt-0.5" />
            <div>
              <p className="text-text-primary text-sm font-medium">Notifications Blocked</p>
              <p className="text-text-secondary text-xs mt-1">
                You&apos;ve blocked notifications for this site. To re-enable, go to your browser or device settings and allow notifications for this app.
              </p>
            </div>
          </div>
        </section>
      )}

      {/* Unsupported Warning */}
      {pushState === 'unsupported' && (
        <section className="mt-4">
          <div className="bg-bg-card border border-border rounded-xl p-4 flex gap-3">
            <AlertTriangle size={20} className="text-text-muted shrink-0 mt-0.5" />
            <div>
              <p className="text-text-primary text-sm font-medium">Not Supported</p>
              <p className="text-text-secondary text-xs mt-1">
                Push notifications are not supported in this browser. For the best experience, install the app to your home screen on iOS 16.4+ or use a supported browser.
              </p>
            </div>
          </div>
        </section>
      )}

      {/* Notification Categories */}
      <section className="mt-6">
        <h3 className="py-2 text-xs font-semibold text-text-muted uppercase tracking-wider">
          Notification Types
        </h3>
        <div className="bg-bg-card rounded-xl border border-border overflow-hidden">
          <div className="flex items-center gap-4 px-4 py-4">
            <div className="flex items-center justify-center rounded-lg bg-primary/10 size-10 shrink-0">
              <MessageCircle size={22} className="text-primary" />
            </div>
            <div className="flex-1 min-w-0">
              <span className="text-text-primary font-medium block">New Messages</span>
              <span className="text-text-muted text-xs">Get notified when you receive a message</span>
            </div>
            <span className="text-[10px] font-semibold px-2 py-1 rounded-full bg-success/10 text-success">
              ACTIVE
            </span>
          </div>

          <div className="flex items-center gap-4 px-4 py-4 border-t border-border">
            <div className="flex items-center justify-center rounded-lg bg-primary/10 size-10 shrink-0">
              <Calendar size={22} className="text-primary" />
            </div>
            <div className="flex-1 min-w-0">
              <span className="text-text-primary font-medium block">Booking Updates</span>
              <span className="text-text-muted text-xs">Session confirmations and changes</span>
            </div>
            <span className="text-[10px] font-semibold px-2 py-1 rounded-full bg-success/10 text-success">
              ACTIVE
            </span>
          </div>
        </div>
      </section>
    </MobileLayout>
  )
}

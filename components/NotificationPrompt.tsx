'use client'

import { useEffect, useState } from 'react'
import { useAuth } from '@/contexts/AuthContext'
import {
  isPushSupported,
  getNotificationPermission,
  requestNotificationPermission,
  subscribeToPush,
  hasActivePushSubscription,
} from '@/lib/services/push-notifications'

export default function NotificationPrompt() {
  const { user } = useAuth()
  const [showPrompt, setShowPrompt] = useState(false)

  useEffect(() => {
    if (!user?.id || !isPushSupported()) return

    // Don't show if already granted or denied
    const permission = getNotificationPermission()
    if (permission !== 'default') return

    // Don't show if user dismissed previously
    const dismissed = document.cookie.includes('forge-notif-dismissed')
    if (dismissed) return

    // Delay showing prompt until user has engaged (45 seconds)
    const timer = setTimeout(async () => {
      const hasSub = await hasActivePushSubscription()
      if (!hasSub) {
        setShowPrompt(true)
      }
    }, 45_000)

    return () => clearTimeout(timer)
  }, [user?.id])

  const handleEnable = async () => {
    if (!user?.id) return

    const permission = await requestNotificationPermission()
    if (permission === 'granted') {
      await subscribeToPush(user.id)
    }
    setShowPrompt(false)
  }

  const handleDismiss = () => {
    setShowPrompt(false)
    // Don't ask again for 7 days
    document.cookie = 'forge-notif-dismissed=true; max-age=604800; path=/'
  }

  if (!showPrompt) return null

  return (
    <div className="fixed top-0 mt-16 left-0 right-0 bg-[#2a2a2a] border-t border-stone-700 shadow-lg p-4 z-50 animate-slide-up">
      <div className="max-w-md mx-auto flex items-center gap-4">
        <div className="size-10 rounded-full bg-primary/20 flex items-center justify-center shrink-0">
          <span className="text-xl">🔔</span>
        </div>
        <div className="flex-1">
          <h3 className="font-semibold text-white text-sm">Enable Notifications</h3>
          <p className="text-xs text-stone-400">
            Get notified about new messages and booking updates
          </p>
        </div>
        <div className="flex gap-2 shrink-0">
          <button
            onClick={handleEnable}
            className="bg-[#ff6714] hover:bg-orange-600 text-white font-medium px-3 py-1.5 rounded-lg transition-colors text-sm"
          >
            Enable
          </button>
          <button
            onClick={handleDismiss}
            className="bg-stone-700 hover:bg-stone-600 text-stone-300 font-medium px-3 py-1.5 rounded-lg transition-colors text-sm"
          >
            Later
          </button>
        </div>
      </div>
    </div>
  )
}

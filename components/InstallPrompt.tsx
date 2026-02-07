'use client'

import { useEffect, useState } from 'react'

interface BeforeInstallPromptEvent extends Event {
  prompt: () => Promise<void>
  userChoice: Promise<{ outcome: 'accepted' | 'dismissed' }>
}

export default function InstallPrompt() {
  const [deferredPrompt, setDeferredPrompt] = useState<BeforeInstallPromptEvent | null>(null)
  // null = hidden, 'ios' = show iOS instructions, 'android' = show Chrome/Edge install button
  const [promptType, setPromptType] = useState<'ios' | 'android' | null>(null)

  useEffect(() => {
    const iOS = /iPad|iPhone|iPod/.test(navigator.userAgent)

    // Check if already installed (standalone mode)
    const standalone = window.matchMedia('(display-mode: standalone)').matches ||
                      window.navigator.standalone === true

    if (standalone) {
      return
    }

    // Check if user previously dismissed
    const dismissed = document.cookie.includes('forge-pwa-dismissed')
    if (dismissed) {
      return
    }

    // Delay showing the prompt until the user has engaged with the app
    const ENGAGEMENT_DELAY_MS = 30_000 // 30 seconds

    if (iOS) {
      const timer = setTimeout(() => setPromptType('ios'), ENGAGEMENT_DELAY_MS)
      return () => clearTimeout(timer)
    }

    // For Chrome/Edge Android: Capture beforeinstallprompt but delay showing
    let engagementTimer: ReturnType<typeof setTimeout> | null = null

    const handler = (e: Event) => {
      e.preventDefault()
      const event = e as BeforeInstallPromptEvent
      setDeferredPrompt(event)
      engagementTimer = setTimeout(() => setPromptType('android'), ENGAGEMENT_DELAY_MS)
    }

    window.addEventListener('beforeinstallprompt', handler)

    return () => {
      window.removeEventListener('beforeinstallprompt', handler)
      if (engagementTimer) clearTimeout(engagementTimer)
    }
  }, [])

  const handleInstall = async () => {
    if (!deferredPrompt) {
      return
    }

    await deferredPrompt.prompt()
    const { outcome } = await deferredPrompt.userChoice

    if (outcome === 'accepted') {
      console.log('User accepted the install prompt')
    } else {
      console.log('User dismissed the install prompt')
    }

    setDeferredPrompt(null)
    setPromptType(null)
  }

  const handleDismiss = () => {
    setPromptType(null)
    document.cookie = 'forge-pwa-dismissed=true; max-age=31536000; path=/'
  }

  if (!promptType) {
    return null
  }

  // iOS Install Instructions
  if (promptType === 'ios') {
    return (
      <div className="fixed top-0 mt-16 left-0 right-0 bg-[#2a2a2a] border-t border-stone-700 shadow-lg p-4 z-50 animate-slide-up">
        <div className="max-w-md mx-auto">
          <div className="flex items-start gap-3 mb-3">
            <div className="text-3xl">📱</div>
            <div className="flex-1">
              <h3 className="font-semibold text-white mb-1">Install Forge Trainer</h3>
              <p className="text-sm text-stone-400 mb-2">
                Install this app on your iPhone for a better experience:
              </p>
              <ol className="text-xs text-stone-300 space-y-1 list-decimal list-inside">
                <li>Tap the Share button <span className="inline-block">⬆️</span> in Safari</li>
                <li>Scroll down and tap &ldquo;Add to Home Screen&rdquo;</li>
                <li>Tap &ldquo;Add&rdquo; in the top right corner</li>
              </ol>
            </div>
          </div>
          <button
            onClick={handleDismiss}
            className="w-full bg-stone-700 hover:bg-stone-600 text-stone-300 font-medium px-4 py-2 rounded-lg transition-colors"
          >
            Dismiss
          </button>
        </div>
      </div>
    )
  }

  // Chrome/Edge Android Install Prompt
  return (
    <div className="fixed top-0 mt-16 left-0 right-0 bg-[#2a2a2a] border-t border-stone-700 shadow-lg p-4 z-50 animate-slide-up">
      <div className="max-w-md mx-auto flex items-center gap-4">
        <div className="text-3xl">📱</div>
        <div className="flex-1">
          <h3 className="font-semibold text-white">Install Forge Trainer</h3>
          <p className="text-sm text-stone-400">
            Install this app on your device for a better experience
          </p>
        </div>
        <div className="flex flex-col sm:flex-row gap-2">
          <button
            onClick={handleInstall}
            className="bg-[#ff6714] hover:bg-orange-600 text-white font-medium px-4 py-2 rounded-lg transition-colors whitespace-nowrap"
          >
            Install
          </button>
          <button
            onClick={handleDismiss}
            className="bg-stone-700 hover:bg-stone-600 text-stone-300 font-medium px-4 py-2 rounded-lg transition-colors whitespace-nowrap"
          >
            Dismiss
          </button>
        </div>
      </div>
    </div>
  )
}

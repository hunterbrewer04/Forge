'use client'

import { useEffect, useState } from 'react'

interface BeforeInstallPromptEvent extends Event {
  prompt: () => Promise<void>
  userChoice: Promise<{ outcome: 'accepted' | 'dismissed' }>
}

export default function InstallPrompt() {
  const [deferredPrompt, setDeferredPrompt] = useState<BeforeInstallPromptEvent | null>(null)
  const [showPrompt, setShowPrompt] = useState(false)
  const [isIOS, setIsIOS] = useState(false)
  const [isInStandaloneMode, setIsInStandaloneMode] = useState(false)

  useEffect(() => {
    // Detect iOS
    const iOS = /iPad|iPhone|iPod/.test(navigator.userAgent)
    setIsIOS(iOS)

    // Check if already installed (standalone mode)
    // navigator.standalone is an iOS Safari-specific property
    const standalone = window.matchMedia('(display-mode: standalone)').matches ||
                      window.navigator.standalone === true
    setIsInStandaloneMode(standalone)

    if (standalone) {
      return
    }

    // Check if user previously dismissed
    const dismissed = document.cookie.includes('forge-pwa-dismissed')
    if (dismissed) {
      return
    }

    // For iOS, show prompt immediately since there's no beforeinstallprompt event
    if (iOS) {
      setShowPrompt(true)
      return
    }

    // For Chrome/Edge Android: Listen for beforeinstallprompt event
    const handler = (e: Event) => {
      e.preventDefault()
      const event = e as BeforeInstallPromptEvent
      setDeferredPrompt(event)
      setShowPrompt(true)
    }

    window.addEventListener('beforeinstallprompt', handler)

    return () => {
      window.removeEventListener('beforeinstallprompt', handler)
    }
  }, [])

  const handleInstall = async () => {
    if (!deferredPrompt) {
      return
    }

    // Show the install prompt
    await deferredPrompt.prompt()

    // Wait for the user's response
    const { outcome } = await deferredPrompt.userChoice

    if (outcome === 'accepted') {
      console.log('User accepted the install prompt')
    } else {
      console.log('User dismissed the install prompt')
    }

    // Clear the deferredPrompt
    setDeferredPrompt(null)
    setShowPrompt(false)
  }

  const handleDismiss = () => {
    setShowPrompt(false)
    document.cookie = 'forge-pwa-dismissed=true; max-age=31536000; path=/'
  }

  if (!showPrompt) {
    return null
  }

  // iOS Install Instructions
  if (isIOS) {
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
                <li>Scroll down and tap "Add to Home Screen"</li>
                <li>Tap "Add" in the top right corner</li>
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

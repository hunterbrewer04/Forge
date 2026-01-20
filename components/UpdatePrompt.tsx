'use client'

import { useEffect, useState } from 'react'

export function UpdatePrompt() {
  const [showUpdate, setShowUpdate] = useState(false)
  const [registration, setRegistration] = useState<ServiceWorkerRegistration | null>(null)

  useEffect(() => {
    const handleUpdate = (event: Event) => {
      const customEvent = event as CustomEvent<ServiceWorkerRegistration>
      setRegistration(customEvent.detail)
      setShowUpdate(true)
    }

    window.addEventListener('swUpdate', handleUpdate)
    return () => window.removeEventListener('swUpdate', handleUpdate)
  }, [])

  const handleUpdateClick = () => {
    if (registration?.waiting) {
      // Tell the waiting service worker to skip waiting and become active
      registration.waiting.postMessage({ type: 'SKIP_WAITING' })
      // Reload the page to get the new version
      window.location.reload()
    }
  }

  const handleDismiss = () => {
    setShowUpdate(false)
  }

  if (!showUpdate) return null

  return (
    <div className="fixed bottom-4 left-4 right-4 md:left-auto md:right-4 md:w-96 bg-blue-600 text-white p-4 rounded-lg shadow-lg z-[60] animate-slide-up">
      <div className="flex items-start gap-3">
        <div className="flex-shrink-0">
          <svg
            className="w-6 h-6"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
            xmlns="http://www.w3.org/2000/svg"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15"
            />
          </svg>
        </div>
        <div className="flex-1">
          <p className="font-medium">Update Available</p>
          <p className="text-sm text-blue-100 mt-1">
            A new version of Forge is ready to install.
          </p>
        </div>
      </div>
      <div className="flex gap-2 mt-3">
        <button
          onClick={handleUpdateClick}
          className="flex-1 px-4 py-2 bg-white text-blue-600 rounded-md font-medium hover:bg-blue-50 transition-colors"
        >
          Update Now
        </button>
        <button
          onClick={handleDismiss}
          className="px-4 py-2 bg-blue-700 hover:bg-blue-800 rounded-md transition-colors"
        >
          Later
        </button>
      </div>
    </div>
  )
}

export default UpdatePrompt

export function registerServiceWorker() {
  if (typeof window === 'undefined' || !('serviceWorker' in navigator)) {
    return
  }

  window.addEventListener('load', async () => {
    try {
      const registration = await navigator.serviceWorker.register('/sw.js')

      // Check for updates periodically (every 20 minutes)
      setInterval(() => {
        registration.update()
      }, 20 * 60 * 1000)

      // Listen for new service worker installation
      registration.addEventListener('updatefound', () => {
        const newWorker = registration.installing
        if (!newWorker) return

        newWorker.addEventListener('statechange', () => {
          // New version installed and ready, but waiting to activate
          if (newWorker.state === 'installed' && navigator.serviceWorker.controller) {
            // Dispatch custom event to notify the app of available update
            window.dispatchEvent(
              new CustomEvent('swUpdate', { detail: registration })
            )
          }
        })
      })

      // Handle controller change (when new SW takes over)
      navigator.serviceWorker.addEventListener('controllerchange', () => {
        // Optionally auto-reload when new SW activates
        // window.location.reload()
      })
    } catch (error) {
      console.error('Service Worker registration failed:', error)
    }
  })
}

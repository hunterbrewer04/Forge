export function registerServiceWorker() {
  if (typeof window !== 'undefined' && 'serviceWorker' in navigator) {
    window.addEventListener('load', () => {
      navigator.serviceWorker
        .register('/sw.js')
        .then((registration) => {
          console.log('✅ Service Worker registered:', registration);

          // Auto-update check every 60 seconds
          setInterval(() => {
            registration.update();
          }, 60000);
        })
        .catch((error) => {
          console.error('❌ SW registration failed:', error);
        });
    });
  }
}

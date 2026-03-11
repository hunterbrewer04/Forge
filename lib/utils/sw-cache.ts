/**
 * Clears the service worker's dynamic cache.
 * Used before sign-out and after sign-in to prevent stale page serving.
 * Times out after 1 second if no service worker is active.
 */
export async function clearDynamicCache(): Promise<void> {
  if (typeof navigator === 'undefined' || !('serviceWorker' in navigator)) return

  try {
    const timeout = new Promise<null>(resolve => setTimeout(() => resolve(null), 1000))
    const reg = await Promise.race([navigator.serviceWorker.ready, timeout])
    if (reg) {
      reg.active?.postMessage({ type: 'CLEAR_DYNAMIC_CACHE' })
      await new Promise(resolve => setTimeout(resolve, 50))
    }
  } catch (err) {
    console.warn('Failed to clear SW cache:', err)
  }
}

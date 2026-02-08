import { createClient } from '@/lib/supabase-browser'
import { logger } from '@/lib/utils/logger'

/**
 * Check if push notifications are supported in this browser
 */
export function isPushSupported(): boolean {
  return (
    typeof window !== 'undefined' &&
    'serviceWorker' in navigator &&
    'PushManager' in window &&
    'Notification' in window
  )
}

/**
 * Get the current notification permission state
 */
export function getNotificationPermission(): NotificationPermission | 'unsupported' {
  if (!isPushSupported()) return 'unsupported'
  return Notification.permission
}

/**
 * Request notification permission from the user
 */
export async function requestNotificationPermission(): Promise<NotificationPermission> {
  if (!isPushSupported()) return 'denied'
  return Notification.requestPermission()
}

/**
 * Subscribe the current device to push notifications and save to Supabase
 */
export async function subscribeToPush(userId: string): Promise<boolean> {
  if (!isPushSupported()) return false

  const vapidPublicKey = process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY
  if (!vapidPublicKey) {
    logger.error('VAPID public key not configured')
    return false
  }

  try {
    const registration = await navigator.serviceWorker.ready

    // Check for existing subscription
    let subscription = await registration.pushManager.getSubscription()

    if (!subscription) {
      // Create new subscription
      const applicationServerKey = urlBase64ToUint8Array(vapidPublicKey)
      subscription = await registration.pushManager.subscribe({
        userVisibleOnly: true,
        applicationServerKey,
      })
    }

    // Extract keys from subscription
    const subscriptionJson = subscription.toJSON()
    const endpoint = subscription.endpoint
    const authKey = subscriptionJson.keys?.auth || ''
    const p256dhKey = subscriptionJson.keys?.p256dh || ''

    if (!authKey || !p256dhKey) {
      logger.error('Push subscription missing encryption keys')
      return false
    }

    // Save to Supabase
    const supabase = createClient()
    const { error } = await supabase
      .from('push_subscriptions')
      .upsert(
        {
          user_id: userId,
          endpoint,
          auth_key: authKey,
          p256dh_key: p256dhKey,
        },
        { onConflict: 'user_id,endpoint' }
      )

    if (error) {
      logger.error('Failed to save push subscription:', error)
      return false
    }

    return true
  } catch (err) {
    logger.error('Push subscription failed:', err)
    return false
  }
}

/**
 * Unsubscribe the current device from push notifications
 */
export async function unsubscribeFromPush(userId: string): Promise<boolean> {
  if (!isPushSupported()) return false

  try {
    const registration = await navigator.serviceWorker.ready
    const subscription = await registration.pushManager.getSubscription()

    if (subscription) {
      // Remove from Supabase
      const supabase = createClient()
      await supabase
        .from('push_subscriptions')
        .delete()
        .eq('user_id', userId)
        .eq('endpoint', subscription.endpoint)

      // Unsubscribe from browser
      await subscription.unsubscribe()
    }

    return true
  } catch (err) {
    logger.error('Push unsubscription failed:', err)
    return false
  }
}

/**
 * Check if the current device has an active push subscription
 */
export async function hasActivePushSubscription(): Promise<boolean> {
  if (!isPushSupported()) return false

  try {
    const registration = await navigator.serviceWorker.ready
    const subscription = await registration.pushManager.getSubscription()
    return !!subscription
  } catch {
    return false
  }
}

/**
 * Convert a VAPID public key from URL-safe base64 to Uint8Array
 */
function urlBase64ToUint8Array(base64String: string): Uint8Array {
  const padding = '='.repeat((4 - (base64String.length % 4)) % 4)
  const base64 = (base64String + padding).replace(/-/g, '+').replace(/_/g, '/')
  const rawData = window.atob(base64)
  const outputArray = new Uint8Array(rawData.length)
  for (let i = 0; i < rawData.length; ++i) {
    outputArray[i] = rawData.charCodeAt(i)
  }
  return outputArray
}

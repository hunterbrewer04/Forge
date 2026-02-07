/**
 * Server-side push notification sender.
 * Uses web-push to deliver notifications to subscribed devices.
 *
 * IMPORTANT: This module must only be imported in server-side code (API routes).
 */

import webpush from 'web-push'
import { createClient } from '@supabase/supabase-js'

// Initialize VAPID configuration
const vapidPublicKey = process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY
const vapidPrivateKey = process.env.VAPID_PRIVATE_KEY
const vapidSubject = process.env.VAPID_SUBJECT || 'mailto:admin@forgetrainer.com'

let vapidConfigured = false
if (vapidPublicKey && vapidPrivateKey) {
  webpush.setVapidDetails(vapidSubject, vapidPublicKey, vapidPrivateKey)
  vapidConfigured = true
}

interface PushPayload {
  title: string
  body: string
  url?: string
  tag?: string
  type?: string
}

/**
 * Send push notification to a user's subscribed devices.
 * Fire-and-forget — errors are logged but not thrown.
 */
export async function sendPushToUser(
  recipientId: string,
  payload: PushPayload
): Promise<void> {
  if (!vapidConfigured) return

  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY
  if (!supabaseUrl || !serviceRoleKey) return

  try {
    const supabase = createClient(supabaseUrl, serviceRoleKey, {
      auth: { persistSession: false },
    })

    const { data: subscriptions } = await supabase
      .from('push_subscriptions')
      .select('endpoint, auth_key, p256dh_key')
      .eq('user_id', recipientId)

    if (!subscriptions || subscriptions.length === 0) return

    const message = JSON.stringify({
      title: payload.title,
      body: payload.body,
      url: payload.url || '/home',
      tag: payload.tag || `forge-${payload.type || 'general'}-${Date.now()}`,
      type: payload.type || 'general',
    })

    const expiredEndpoints: string[] = []

    await Promise.allSettled(
      subscriptions.map(async (sub) => {
        try {
          await webpush.sendNotification(
            {
              endpoint: sub.endpoint,
              keys: { auth: sub.auth_key, p256dh: sub.p256dh_key },
            },
            message
          )
        } catch (err: unknown) {
          const error = err as { statusCode?: number }
          if (error.statusCode === 410 || error.statusCode === 404) {
            expiredEndpoints.push(sub.endpoint)
          }
        }
      })
    )

    // Clean up expired subscriptions
    if (expiredEndpoints.length > 0) {
      await supabase
        .from('push_subscriptions')
        .delete()
        .eq('user_id', recipientId)
        .in('endpoint', expiredEndpoints)
    }
  } catch {
    // Best-effort — don't let push failures break the calling code
  }
}

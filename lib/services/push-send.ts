/**
 * Server-side push notification sender.
 * Uses web-push to deliver notifications to subscribed devices.
 *
 * IMPORTANT: This module must only be imported in server-side code (API routes).
 */

import 'server-only'
import webpush from 'web-push'
import { db } from '@/lib/db'
import { pushSubscriptions } from '@/lib/db/schema'
import { eq, and, inArray } from 'drizzle-orm'

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

  try {
    const subscriptions = await db.query.pushSubscriptions.findMany({
      where: eq(pushSubscriptions.userId, recipientId),
      columns: { endpoint: true, authKey: true, p256dhKey: true },
    })

    if (subscriptions.length === 0) return

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
              keys: { auth: sub.authKey, p256dh: sub.p256dhKey },
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
      await db
        .delete(pushSubscriptions)
        .where(
          and(
            eq(pushSubscriptions.userId, recipientId),
            inArray(pushSubscriptions.endpoint, expiredEndpoints)
          )
        )
    }
  } catch {
    // Best-effort — don't let push failures break the calling code
  }
}

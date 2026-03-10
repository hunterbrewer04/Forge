import { headers } from 'next/headers'
import { Webhook } from 'svix'
import type { WebhookEvent } from '@clerk/nextjs/server'
import { db } from '@/lib/db'
import { profiles } from '@/lib/db/schema'
import { eq } from 'drizzle-orm'
import { createApiError, handleUnexpectedError } from '@/lib/api/errors'

function buildFullName(first: string | null, last: string | null): string | null {
  return [first, last].filter(Boolean).join(' ') || null
}

export async function POST(request: Request) {
  const WEBHOOK_SECRET = process.env.CLERK_WEBHOOK_SECRET
  if (!WEBHOOK_SECRET) {
    return createApiError('Missing webhook secret', 500, 'INTERNAL_ERROR')
  }

  const headerPayload = await headers()
  const svixId = headerPayload.get('svix-id')
  const svixTimestamp = headerPayload.get('svix-timestamp')
  const svixSignature = headerPayload.get('svix-signature')

  if (!svixId || !svixTimestamp || !svixSignature) {
    return createApiError('Missing svix headers', 400, 'INVALID_REQUEST')
  }

  // Read raw body once — avoids parse-then-serialize round-trip
  const body = await request.text()

  const wh = new Webhook(WEBHOOK_SECRET)
  let evt: WebhookEvent

  try {
    evt = wh.verify(body, {
      'svix-id': svixId,
      'svix-timestamp': svixTimestamp,
      'svix-signature': svixSignature,
    }) as WebhookEvent
  } catch (err) {
    console.error('Clerk webhook verification failed:', err)
    return createApiError('Invalid signature', 400, 'INVALID_REQUEST')
  }

  try {
    switch (evt.type) {
      case 'user.created': {
        const { id, email_addresses, first_name, last_name, image_url } = evt.data
        const email = email_addresses.find(
          e => e.id === evt.data.primary_email_address_id
        )?.email_address

        try {
          await db.insert(profiles).values({
            clerkUserId: id,
            fullName: buildFullName(first_name ?? null, last_name ?? null),
            avatarUrl: image_url || null,
            email: email || null,
            isTrainer: false,
            isAdmin: false,
            hasFullAccess: false,
            isMember: false,
          })
        } catch (insertErr) {
          console.error('Failed to create profile for Clerk user:', id, insertErr)
          return createApiError('Failed to create profile', 500, 'DATABASE_ERROR')
        }
        break
      }

      case 'user.updated': {
        const { id, first_name, last_name, image_url, email_addresses } = evt.data
        const email = email_addresses.find(
          e => e.id === evt.data.primary_email_address_id
        )?.email_address

        try {
          await db
            .update(profiles)
            .set({
              fullName: buildFullName(first_name ?? null, last_name ?? null),
              avatarUrl: image_url || null,
              email: email || null,
            })
            .where(eq(profiles.clerkUserId, id))
        } catch (updateErr) {
          console.error('Failed to update profile for Clerk user:', id, updateErr)
        }
        break
      }

      case 'user.deleted': {
        const { id } = evt.data
        console.warn('user.deleted received for Clerk user:', id)
        // TODO: soft-delete or deactivate the profile
        break
      }
    }

    return Response.json({ received: true })
  } catch (err) {
    return handleUnexpectedError(err, 'clerk-webhook')
  }
}

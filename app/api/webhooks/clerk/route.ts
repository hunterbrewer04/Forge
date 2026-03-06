import { headers } from 'next/headers'
import { Webhook } from 'svix'
import type { WebhookEvent } from '@clerk/nextjs/server'
import { getAdminClient } from '@/lib/supabase-admin'
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

  const supabase = getAdminClient()

  try {
    switch (evt.type) {
      case 'user.created': {
        const { id, email_addresses, first_name, last_name, image_url } = evt.data
        const email = email_addresses.find(
          e => e.id === evt.data.primary_email_address_id
        )?.email_address

        const { error } = await supabase
          .from('profiles')
          .insert({
            clerk_user_id: id,
            full_name: buildFullName(first_name, last_name),
            avatar_url: image_url || null,
            email: email || null,
            is_trainer: false,
            is_admin: false,
            has_full_access: false,
            is_member: false,
          })

        if (error) {
          console.error('Failed to create profile for Clerk user:', id, error)
          return createApiError('Failed to create profile', 500, 'DATABASE_ERROR')
        }
        break
      }

      case 'user.updated': {
        const { id, first_name, last_name, image_url, email_addresses } = evt.data
        const email = email_addresses.find(
          e => e.id === evt.data.primary_email_address_id
        )?.email_address

        const { error } = await supabase
          .from('profiles')
          .update({
            full_name: buildFullName(first_name, last_name),
            avatar_url: image_url || null,
            email: email || null,
          })
          .eq('clerk_user_id', id)

        if (error) {
          console.error('Failed to update profile for Clerk user:', id, error)
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

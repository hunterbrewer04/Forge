import { headers } from 'next/headers'
import { NextResponse } from 'next/server'
import { Webhook } from 'svix'
import type { WebhookEvent } from '@clerk/nextjs/server'
import { createAdminClient } from '@/lib/supabase-admin'

export async function POST(request: Request) {
  const WEBHOOK_SECRET = process.env.CLERK_WEBHOOK_SECRET
  if (!WEBHOOK_SECRET) {
    return NextResponse.json({ error: 'Missing webhook secret' }, { status: 500 })
  }

  const headerPayload = await headers()
  const svixId = headerPayload.get('svix-id')
  const svixTimestamp = headerPayload.get('svix-timestamp')
  const svixSignature = headerPayload.get('svix-signature')

  if (!svixId || !svixTimestamp || !svixSignature) {
    return NextResponse.json({ error: 'Missing svix headers' }, { status: 400 })
  }

  const payload = await request.json()
  const body = JSON.stringify(payload)

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
    return NextResponse.json({ error: 'Invalid signature' }, { status: 400 })
  }

  const supabase = createAdminClient()

  switch (evt.type) {
    case 'user.created': {
      const { id, email_addresses, first_name, last_name, image_url } = evt.data
      const email = email_addresses.find(
        e => e.id === evt.data.primary_email_address_id
      )?.email_address
      const fullName = [first_name, last_name].filter(Boolean).join(' ') || null

      const { error } = await supabase
        .from('profiles')
        .insert({
          clerk_user_id: id,
          full_name: fullName,
          avatar_url: image_url || null,
          email: email || null,
          is_trainer: false,
          is_admin: false,
          has_full_access: false,
          is_member: false,
        })

      if (error) {
        console.error('Failed to create profile for Clerk user:', id, error)
        return NextResponse.json({ error: 'Failed to create profile' }, { status: 500 })
      }
      break
    }

    case 'user.updated': {
      const { id, first_name, last_name, image_url } = evt.data
      const fullName = [first_name, last_name].filter(Boolean).join(' ') || null

      const { error } = await supabase
        .from('profiles')
        .update({ full_name: fullName, avatar_url: image_url || null })
        .eq('clerk_user_id', id)

      if (error) {
        console.error('Failed to update profile for Clerk user:', id, error)
      }
      break
    }

    case 'user.deleted': {
      const { id } = evt.data
      console.warn('user.deleted received for Clerk user:', id)
      break
    }
  }

  return NextResponse.json({ received: true })
}

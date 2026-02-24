import { NextRequest, NextResponse } from 'next/server'
import { stripe } from '@/lib/stripe'
import { getAdminClient } from '@/lib/supabase-admin'
import { handleUnexpectedError } from '@/lib/api/errors'
import { env } from '@/lib/env-validation'

export async function POST(request: NextRequest) {
  try {
    const body = await request.text()
    const sig = request.headers.get('stripe-signature')

    if (!sig) {
      return NextResponse.json({ error: 'Missing signature' }, { status: 400 })
    }

    let event
    try {
      event = stripe.webhooks.constructEvent(body, sig, env.stripeWebhookSecret())
    } catch {
      return NextResponse.json({ error: 'Invalid signature' }, { status: 400 })
    }

    const supabase = getAdminClient()

    switch (event.type) {
      case 'customer.subscription.created':
      case 'customer.subscription.updated': {
        const subscription = event.data.object
        const userId = subscription.metadata?.supabase_user_id
        const tierId = subscription.metadata?.membership_tier_id

        if (!userId) break

        const status =
          subscription.status === 'active' ? 'active'
          : subscription.status === 'past_due' ? 'past_due'
          : 'canceled'

        await supabase
          .from('profiles')
          .update({
            membership_status: status,
            stripe_subscription_id: subscription.id,
            ...(tierId ? { membership_tier_id: tierId } : {}),
          })
          .eq('id', userId)
        break
      }

      case 'customer.subscription.deleted': {
        const subscription = event.data.object
        const userId = subscription.metadata?.supabase_user_id
        if (!userId) break

        await supabase
          .from('profiles')
          .update({ membership_status: 'canceled' })
          .eq('id', userId)
        break
      }

      case 'invoice.payment_failed': {
        const invoice = event.data.object
        const customerId = typeof invoice.customer === 'string' ? invoice.customer : null
        if (!customerId) break

        await supabase
          .from('profiles')
          .update({ membership_status: 'past_due' })
          .eq('stripe_customer_id', customerId)
        break
      }
    }

    return NextResponse.json({ received: true })
  } catch (error) {
    return handleUnexpectedError(error, 'stripe-webhook')
  }
}

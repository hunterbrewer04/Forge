import { NextRequest, NextResponse } from 'next/server'
import { stripe } from '@/lib/stripe'
import { db } from '@/lib/db'
import { profiles, membershipTiers } from '@/lib/db/schema'
import { eq } from 'drizzle-orm'
import { handleUnexpectedError } from '@/lib/api/errors'
import { env } from '@/lib/env-validation'
import { centsToDollars } from '@/lib/utils/currency'

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

    switch (event.type) {
      case 'customer.subscription.created':
      case 'customer.subscription.updated': {
        const subscription = event.data.object
        const userId = subscription.metadata?.profile_id ?? subscription.metadata?.supabase_user_id
        const tierId = subscription.metadata?.membership_tier_id

        if (!userId) break

        const status =
          subscription.status === 'active' ? 'active'
          : subscription.status === 'past_due' ? 'past_due'
          : 'canceled'

        await db
          .update(profiles)
          .set({
            membershipStatus: status,
            stripeSubscriptionId: subscription.id,
            ...(tierId ? { membershipTierId: tierId } : {}),
            ...(status === 'active' ? { isMember: true } : {}),
          })
          .where(eq(profiles.id, userId))
        break
      }

      case 'customer.subscription.deleted': {
        const subscription = event.data.object
        const userId = subscription.metadata?.profile_id ?? subscription.metadata?.supabase_user_id
        if (!userId) break

        await db
          .update(profiles)
          .set({ membershipStatus: 'canceled' })
          .where(eq(profiles.id, userId))
        break
      }

      case 'price.updated': {
        const price = event.data.object
        if (price.unit_amount !== null) {
          await db
            .update(membershipTiers)
            .set({
              priceMonthly: String(centsToDollars(price.unit_amount)),
            })
            .where(eq(membershipTiers.stripePriceId, price.id))
        }
        break
      }

      case 'invoice.payment_failed': {
        const invoice = event.data.object
        const customerId = typeof invoice.customer === 'string' ? invoice.customer : null
        if (!customerId) break

        await db
          .update(profiles)
          .set({ membershipStatus: 'past_due' })
          .where(eq(profiles.stripeCustomerId, customerId))
        break
      }
    }

    return NextResponse.json({ received: true })
  } catch (error) {
    return handleUnexpectedError(error, 'stripe-webhook')
  }
}

// app/api/stripe/create-subscription/route.ts
// POST /api/stripe/create-subscription
// Creates a Stripe Subscription in 'incomplete' status and returns the
// PaymentIntent client_secret for the frontend Payment Element to confirm.

import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'
import type Stripe from 'stripe'
import { validateAuth } from '@/lib/api/auth'
import { db } from '@/lib/db'
import { profiles, membershipTiers } from '@/lib/db/schema'
import { eq, and } from 'drizzle-orm'
import { stripe } from '@/lib/stripe'
import { validateRequestBody } from '@/lib/api/validation'
import { createApiError, handleUnexpectedError } from '@/lib/api/errors'

const SubscriptionSchema = z.object({
  tierId: z.string().uuid(),
})

export async function POST(request: NextRequest) {
  try {
    const auth = await validateAuth()
    if (auth instanceof NextResponse) return auth
    const { profileId } = auth

    const body = await validateRequestBody(request, SubscriptionSchema)
    if (body instanceof NextResponse) return body

    // 1. Load the tier
    const tier = await db.query.membershipTiers.findFirst({
      where: and(
        eq(membershipTiers.id, body.tierId),
        eq(membershipTiers.isActive, true)
      ),
      columns: { id: true, name: true, stripePriceId: true, isActive: true },
    })

    if (!tier) {
      return createApiError('Membership tier not found', 404, 'RESOURCE_NOT_FOUND')
    }

    if (!tier.stripePriceId || tier.stripePriceId === 'price_PLACEHOLDER') {
      return createApiError('This tier is not yet configured for payments', 503, 'TIER_NOT_CONFIGURED')
    }

    // 2. Load profile — check for existing active subscription
    const profile = await db.query.profiles.findFirst({
      where: eq(profiles.id, profileId),
      columns: { email: true, fullName: true, stripeCustomerId: true, membershipStatus: true },
    })

    if (profile?.membershipStatus === 'active') {
      return createApiError('Already have an active membership', 409, 'ALREADY_SUBSCRIBED')
    }

    // 3. Load or create Stripe customer
    let customerId = profile?.stripeCustomerId

    if (!customerId) {
      const customer = await stripe.customers.create({
        email: profile?.email ?? undefined,
        name: profile?.fullName ?? undefined,
        metadata: { profile_id: profileId },
      })
      customerId = customer.id

      await db
        .update(profiles)
        .set({ stripeCustomerId: customerId })
        .where(eq(profiles.id, profileId))
    }

    // 4. Create subscription with default_incomplete so we get a PaymentIntent
    //    to confirm on the client. Metadata lives directly on the subscription
    //    so the webhook can read it from subscription.metadata.
    const subscription = await stripe.subscriptions.create({
      customer: customerId,
      items: [{ price: tier.stripePriceId }],
      payment_behavior: 'default_incomplete',
      payment_settings: {
        save_default_payment_method: 'on_subscription',
        payment_method_types: ['card'],
      },
      expand: ['latest_invoice.confirmation_secret'],
      metadata: {
        profile_id: profileId,
        membership_tier_id: tier.id,
      },
    })

    // 5. Extract client_secret from confirmation_secret (Stripe v20 — replaces payment_intent expand)
    const invoice = subscription.latest_invoice as Stripe.Invoice
    const clientSecret = invoice.confirmation_secret?.client_secret

    if (!clientSecret) {
      return createApiError('Failed to initialise payment', 500, 'PAYMENT_INTENT_FAILED')
    }

    return NextResponse.json({
      clientSecret,
      subscriptionId: subscription.id,
    })
  } catch (error) {
    return handleUnexpectedError(error, 'stripe-create-subscription')
  }
}

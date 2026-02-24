// app/api/stripe/create-subscription/route.ts
// POST /api/stripe/create-subscription
// Creates a Stripe Subscription in 'incomplete' status and returns the
// PaymentIntent client_secret for the frontend Payment Element to confirm.

import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'
import Stripe from 'stripe'
import { validateAuth } from '@/lib/api/auth'
import { getAdminClient } from '@/lib/supabase-admin'
import { stripe } from '@/lib/stripe'
import { validateRequestBody } from '@/lib/api/validation'
import { createApiError, handleUnexpectedError } from '@/lib/api/errors'

const SubscriptionSchema = z.object({
  tierId: z.string().uuid(),
})

export async function POST(request: NextRequest) {
  try {
    const auth = await validateAuth(request)
    if (auth instanceof NextResponse) return auth

    const body = await validateRequestBody(request, SubscriptionSchema)
    if (body instanceof NextResponse) return body

    const supabase = getAdminClient()

    // 1. Load the tier
    const { data: tier, error: tierError } = await supabase
      .from('membership_tiers')
      .select('id, name, stripe_price_id, is_active')
      .eq('id', body.tierId)
      .eq('is_active', true)
      .single()

    if (tierError || !tier) {
      return createApiError('Membership tier not found', 404, 'RESOURCE_NOT_FOUND')
    }

    // 2. Load profile — check for existing active subscription
    const { data: profile } = await supabase
      .from('profiles')
      .select('email, full_name, stripe_customer_id, membership_status')
      .eq('id', auth.id)
      .single()

    if (profile?.membership_status === 'active') {
      return createApiError('Already have an active membership', 409, 'ALREADY_SUBSCRIBED')
    }

    // 3. Load or create Stripe customer
    let customerId = profile?.stripe_customer_id

    if (!customerId) {
      const customer = await stripe.customers.create({
        email: profile?.email ?? undefined,
        name: profile?.full_name ?? undefined,
        metadata: { supabase_user_id: auth.id },
      })
      customerId = customer.id

      await supabase
        .from('profiles')
        .update({ stripe_customer_id: customerId })
        .eq('id', auth.id)
    }

    // 4. Create subscription with default_incomplete so we get a PaymentIntent
    //    to confirm on the client. Metadata lives directly on the subscription
    //    so the webhook can read it from subscription.metadata.
    const subscription = await stripe.subscriptions.create({
      customer: customerId,
      items: [{ price: tier.stripe_price_id }],
      payment_behavior: 'default_incomplete',
      payment_settings: { save_default_payment_method: 'on_subscription' },
      expand: ['latest_invoice.payment_intent'],
      metadata: {
        supabase_user_id: auth.id,
        membership_tier_id: tier.id,
      },
    })

    // 5. Extract client_secret from the expanded PaymentIntent
    const invoice = subscription.latest_invoice as Stripe.Invoice
    const paymentIntent = invoice.payment_intent as Stripe.PaymentIntent

    if (!paymentIntent?.client_secret) {
      return createApiError('Failed to initialise payment', 500, 'PAYMENT_INTENT_FAILED')
    }

    return NextResponse.json({
      clientSecret: paymentIntent.client_secret,
      subscriptionId: subscription.id,
    })
  } catch (error) {
    return handleUnexpectedError(error, 'stripe-create-subscription')
  }
}

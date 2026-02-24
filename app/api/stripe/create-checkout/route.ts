import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'
import { validateAuth } from '@/lib/api/auth'
import { getAdminClient } from '@/lib/supabase-admin'
import { stripe } from '@/lib/stripe'
import { validateRequestBody } from '@/lib/api/validation'
import { createApiError, handleUnexpectedError } from '@/lib/api/errors'

const CheckoutSchema = z.object({
  tierId: z.string().uuid(),
})

export async function POST(request: NextRequest) {
  try {
    const auth = await validateAuth(request)
    if (auth instanceof NextResponse) return auth

    const body = await validateRequestBody(request, CheckoutSchema)
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

    // 2. Load or create Stripe customer
    const { data: profile } = await supabase
      .from('profiles')
      .select('email, full_name, stripe_customer_id')
      .eq('id', auth.id)
      .single()

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

    // 3. Create Checkout Session
    const origin = request.nextUrl.origin
    const session = await stripe.checkout.sessions.create({
      customer: customerId,
      mode: 'subscription',
      line_items: [{ price: tier.stripe_price_id, quantity: 1 }],
      success_url: `${origin}/member/success?session_id={CHECKOUT_SESSION_ID}`,
      cancel_url: `${origin}/member/plans`,
      metadata: {
        supabase_user_id: auth.id,
        membership_tier_id: tier.id,
      },
      subscription_data: {
        metadata: {
          supabase_user_id: auth.id,
          membership_tier_id: tier.id,
        },
      },
    })

    return NextResponse.json({ url: session.url })
  } catch (error) {
    return handleUnexpectedError(error, 'stripe-create-checkout')
  }
}

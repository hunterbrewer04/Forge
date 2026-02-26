import { NextRequest, NextResponse } from 'next/server'
import { validateAuth } from '@/lib/api/auth'
import { getAdminClient } from '@/lib/supabase-admin'
import { stripe } from '@/lib/stripe'
import { handleUnexpectedError } from '@/lib/api/errors'

export async function GET(request: NextRequest) {
  try {
    const auth = await validateAuth(request)
    if (auth instanceof NextResponse) return auth

    const supabase = getAdminClient()
    const { data: profile } = await supabase
      .from('profiles')
      .select('stripe_customer_id, stripe_subscription_id')
      .eq('id', auth.id)
      .single()

    if (!profile?.stripe_customer_id) {
      return NextResponse.json({
        paymentMethods: [],
        hasActiveSubscription: false,
        currentPeriodEnd: null,
      })
    }

    // Fetch payment methods
    const methods = await stripe.paymentMethods.list({
      customer: profile.stripe_customer_id,
      type: 'card',
    })

    // Get default payment method from customer
    const customer = await stripe.customers.retrieve(profile.stripe_customer_id)
    const defaultPmId =
      typeof customer !== 'string' && !customer.deleted
        ? (customer.invoice_settings?.default_payment_method as string | null)
        : null

    const formatted = methods.data.map((pm) => ({
      id: pm.id,
      type: pm.type,
      card: pm.card
        ? {
            brand: pm.card.brand,
            last4: pm.card.last4,
            exp_month: pm.card.exp_month,
            exp_year: pm.card.exp_year,
          }
        : undefined,
      is_default: pm.id === defaultPmId,
    }))

    // Check subscription status
    let hasActiveSubscription = false
    let currentPeriodEnd: number | null = null

    if (profile.stripe_subscription_id) {
      try {
        const sub = await stripe.subscriptions.retrieve(profile.stripe_subscription_id)
        hasActiveSubscription = sub.status === 'active'
        currentPeriodEnd = sub.current_period_end
      } catch {
        // Subscription may have been deleted
      }
    }

    return NextResponse.json({
      paymentMethods: formatted,
      hasActiveSubscription,
      currentPeriodEnd,
    })
  } catch (error) {
    return handleUnexpectedError(error, 'stripe-payment-methods')
  }
}

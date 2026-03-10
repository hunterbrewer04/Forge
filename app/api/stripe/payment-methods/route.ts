import { NextResponse } from 'next/server'
import { validateAuth } from '@/lib/api/auth'
import { db } from '@/lib/db'
import { profiles } from '@/lib/db/schema'
import { eq } from 'drizzle-orm'
import { stripe } from '@/lib/stripe'
import { handleUnexpectedError } from '@/lib/api/errors'

export async function GET() {
  try {
    const auth = await validateAuth()
    if (auth instanceof NextResponse) return auth
    const { profileId } = auth

    const profile = await db.query.profiles.findFirst({
      where: eq(profiles.id, profileId),
      columns: { stripeCustomerId: true, stripeSubscriptionId: true },
    })

    if (!profile?.stripeCustomerId) {
      return NextResponse.json({
        paymentMethods: [],
        hasActiveSubscription: false,
        currentPeriodEnd: null,
      })
    }

    // Fetch payment methods
    const methods = await stripe.paymentMethods.list({
      customer: profile.stripeCustomerId,
      type: 'card',
    })

    // Get default payment method from customer
    const customer = await stripe.customers.retrieve(profile.stripeCustomerId)
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

    if (profile.stripeSubscriptionId) {
      try {
        const sub = await stripe.subscriptions.retrieve(profile.stripeSubscriptionId, {
          expand: ['items'],
        })
        hasActiveSubscription = sub.status === 'active'
        currentPeriodEnd = sub.items.data[0]?.current_period_end ?? null
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

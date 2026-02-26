import { NextResponse } from 'next/server'
import { getAdminClient } from '@/lib/supabase-admin'
import { stripe } from '@/lib/stripe'
import { handleUnexpectedError } from '@/lib/api/errors'

export async function GET() {
  try {
    const supabase = getAdminClient()
    const { data: tiers, error } = await supabase
      .from('membership_tiers')
      .select('id, name, slug, monthly_booking_quota, price_monthly, stripe_price_id')
      .eq('is_active', true)
      .order('price_monthly', { ascending: true })

    if (error) {
      return NextResponse.json({ error: 'Failed to load tiers' }, { status: 500 })
    }

    // Enrich each tier with live Stripe price, falling back to DB price_monthly
    const enriched = await Promise.all(
      (tiers || []).map(async (tier) => {
        const { stripe_price_id, ...rest } = tier
        if (!stripe_price_id || stripe_price_id === 'price_PLACEHOLDER') {
          return rest
        }
        try {
          const price = await stripe.prices.retrieve(stripe_price_id)
          if (price.unit_amount != null) {
            return { ...rest, price_monthly: price.unit_amount / 100 }
          }
        } catch (err) {
          console.error(`Failed to fetch Stripe price ${stripe_price_id}:`, err)
        }
        return rest
      })
    )

    // Re-sort by actual price after enrichment
    enriched.sort((a, b) => Number(a.price_monthly) - Number(b.price_monthly))

    return NextResponse.json(
      { tiers: enriched },
      { headers: { 'Cache-Control': 'public, max-age=300, stale-while-revalidate=3600' } }
    )
  } catch (error) {
    return handleUnexpectedError(error, 'membership-tiers')
  }
}

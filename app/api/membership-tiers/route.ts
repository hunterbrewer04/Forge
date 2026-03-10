import { NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { membershipTiers } from '@/lib/db/schema'
import { eq, asc } from 'drizzle-orm'
import { stripe } from '@/lib/stripe'
import { handleUnexpectedError } from '@/lib/api/errors'

export async function GET() {
  try {
    const tiers = await db.query.membershipTiers.findMany({
      where: eq(membershipTiers.isActive, true),
      columns: {
        id: true,
        name: true,
        slug: true,
        monthlyBookingQuota: true,
        priceMonthly: true,
        stripePriceId: true,
      },
      orderBy: asc(membershipTiers.priceMonthly),
    })

    // Enrich each tier with live Stripe price, falling back to DB priceMonthly
    const enriched = await Promise.all(
      tiers.map(async (tier) => {
        const { stripePriceId, ...rest } = tier
        if (!stripePriceId || stripePriceId === 'price_PLACEHOLDER') {
          return rest
        }
        try {
          const price = await stripe.prices.retrieve(stripePriceId)
          if (price.unit_amount != null) {
            return { ...rest, priceMonthly: String(price.unit_amount / 100) }
          }
        } catch (err) {
          console.error(`Failed to fetch Stripe price ${stripePriceId}:`, err)
        }
        return rest
      })
    )

    // Re-sort by actual price after enrichment
    enriched.sort((a, b) => Number(a.priceMonthly) - Number(b.priceMonthly))

    return NextResponse.json(
      { tiers: enriched },
      { headers: { 'Cache-Control': 'public, max-age=300, stale-while-revalidate=3600' } }
    )
  } catch (error) {
    return handleUnexpectedError(error, 'membership-tiers')
  }
}

import { NextRequest, NextResponse } from 'next/server'
import { validateAuth } from '@/lib/api/auth'
import { db } from '@/lib/db'
import { profiles } from '@/lib/db/schema'
import { eq } from 'drizzle-orm'
import { stripe } from '@/lib/stripe'
import { createApiError, handleUnexpectedError } from '@/lib/api/errors'

export async function GET(request: NextRequest) {
  try {
    const auth = await validateAuth()
    if (auth instanceof NextResponse) return auth
    const { profileId } = auth

    const profile = await db.query.profiles.findFirst({
      where: eq(profiles.id, profileId),
      columns: { stripeCustomerId: true },
    })

    if (!profile?.stripeCustomerId) {
      return createApiError('No billing account found', 404, 'RESOURCE_NOT_FOUND')
    }

    const origin = request.nextUrl.origin
    const session = await stripe.billingPortal.sessions.create({
      customer: profile.stripeCustomerId,
      return_url: `${origin}/member/portal`,
    })

    return NextResponse.json({ url: session.url })
  } catch (error) {
    return handleUnexpectedError(error, 'stripe-portal')
  }
}

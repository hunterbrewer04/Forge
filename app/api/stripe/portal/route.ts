import { NextRequest, NextResponse } from 'next/server'
import { validateAuth } from '@/lib/api/auth'
import { getAdminClient } from '@/lib/supabase-admin'
import { stripe } from '@/lib/stripe'
import { createApiError, handleUnexpectedError } from '@/lib/api/errors'

export async function GET(request: NextRequest) {
  try {
    const auth = await validateAuth(request)
    if (auth instanceof NextResponse) return auth

    const supabase = getAdminClient()

    const { data: profile } = await supabase
      .from('profiles')
      .select('stripe_customer_id')
      .eq('id', auth.id)
      .single()

    if (!profile?.stripe_customer_id) {
      return createApiError('No billing account found', 404, 'RESOURCE_NOT_FOUND')
    }

    const origin = request.nextUrl.origin
    const session = await stripe.billingPortal.sessions.create({
      customer: profile.stripe_customer_id,
      return_url: `${origin}/member/portal`,
    })

    return NextResponse.json({ url: session.url })
  } catch (error) {
    return handleUnexpectedError(error, 'stripe-portal')
  }
}

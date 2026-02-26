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
      .select('stripe_customer_id')
      .eq('id', auth.id)
      .single()

    if (!profile?.stripe_customer_id) {
      return NextResponse.json({ invoices: [] })
    }

    const limitParam = request.nextUrl.searchParams.get('limit')
    const limit = Math.min(parseInt(limitParam || '10', 10), 100)

    const invoices = await stripe.invoices.list({
      customer: profile.stripe_customer_id,
      limit,
    })

    const formatted = invoices.data.map((inv) => ({
      id: inv.id,
      amount_due: inv.amount_due,
      amount_paid: inv.amount_paid,
      currency: inv.currency,
      status: inv.status,
      created: inv.created,
      period_start: inv.period_start,
      period_end: inv.period_end,
      hosted_invoice_url: inv.hosted_invoice_url,
      description: inv.lines?.data?.[0]?.description ?? null,
    }))

    return NextResponse.json({ invoices: formatted })
  } catch (error) {
    return handleUnexpectedError(error, 'stripe-invoices')
  }
}

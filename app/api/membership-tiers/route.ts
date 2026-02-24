import { NextRequest, NextResponse } from 'next/server'
import { getAdminClient } from '@/lib/supabase-admin'
import { handleUnexpectedError } from '@/lib/api/errors'

export async function GET(_request: NextRequest) {
  try {
    const supabase = getAdminClient()
    const { data: tiers, error } = await supabase
      .from('membership_tiers')
      .select('id, name, slug, monthly_booking_quota, price_monthly')
      .eq('is_active', true)
      .order('price_monthly', { ascending: true })

    if (error) {
      return NextResponse.json({ error: 'Failed to load tiers' }, { status: 500 })
    }

    return NextResponse.json({ tiers: tiers || [] })
  } catch (error) {
    return handleUnexpectedError(error, 'membership-tiers')
  }
}

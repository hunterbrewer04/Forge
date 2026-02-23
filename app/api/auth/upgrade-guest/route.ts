/**
 * Guest Profile Upgrade API Route
 *
 * POST /api/auth/upgrade-guest
 *
 * Called after a successful signup when the new user previously made
 * a guest booking. Finds the guest profile matching the authenticated
 * user's email, transfers all bookings to the auth profile, then
 * deletes the guest profile.
 */

import { NextRequest, NextResponse } from 'next/server'
import { validateAuth } from '@/lib/api/auth'
import { getAdminClient } from '@/lib/supabase-admin'
import { createApiError, handleUnexpectedError } from '@/lib/api/errors'

export async function POST(request: NextRequest) {
  try {
    // 1. Must be authenticated (called right after signup)
    const auth = await validateAuth(request)
    if (auth instanceof NextResponse) return auth

    const supabase = getAdminClient()

    // 2. Find guest profile with same email (exclude the new auth profile)
    const { data: guestProfile, error: lookupError } = await supabase
      .from('profiles')
      .select('id')
      .eq('email', auth.email!)
      .eq('is_guest', true)
      .not('id', 'eq', auth.id)
      .maybeSingle()

    if (lookupError) {
      return createApiError('Failed to look up guest profile', 500, 'DATABASE_ERROR')
    }

    if (!guestProfile) {
      // No guest profile to merge — that's fine
      return NextResponse.json({ success: true, merged: false })
    }

    // 3. Transfer bookings from guest profile to the auth profile
    const { error: updateError, count } = await supabase
      .from('bookings')
      .update({ client_id: auth.id })
      .eq('client_id', guestProfile.id)

    if (updateError) {
      return createApiError('Failed to transfer bookings', 500, 'DATABASE_ERROR')
    }

    // 4. Delete the now-empty guest profile
    const { error: deleteError } = await supabase
      .from('profiles')
      .delete()
      .eq('id', guestProfile.id)

    if (deleteError) {
      // Non-fatal — bookings were transferred; profile cleanup can be done later
      console.error('Failed to delete guest profile after merge:', deleteError)
    }

    return NextResponse.json({
      success: true,
      merged: true,
      bookingsMigrated: count ?? 0,
    })
  } catch (error) {
    return handleUnexpectedError(error, 'upgrade-guest')
  }
}

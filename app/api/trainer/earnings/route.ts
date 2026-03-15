/**
 * Trainer Earnings API
 *
 * GET /api/trainer/earnings — per-trainer revenue from assigned clients
 */

import { NextRequest, NextResponse } from 'next/server'
import { validateRole } from '@/lib/api/auth'
import { checkRateLimit, RateLimitPresets } from '@/lib/api/rate-limit'
import { handleUnexpectedError } from '@/lib/api/errors'
import { db } from '@/lib/db'
import { getTrainerEarnings } from '@/modules/trainer'

export async function GET(request: NextRequest) {
  try {
    const authResult = await validateRole('trainer')
    if (authResult instanceof NextResponse) return authResult

    const rateLimitResult = await checkRateLimit(request, RateLimitPresets.GENERAL, authResult.profileId)
    if (rateLimitResult) return rateLimitResult

    const earnings = await getTrainerEarnings(db, authResult.profileId)
    return NextResponse.json({ success: true, data: earnings })
  } catch (error) {
    return handleUnexpectedError(error, 'trainer-earnings')
  }
}

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
import { stripe } from '@/lib/stripe'
import { getTrainerEarnings, getMonthlyRevenueHistory } from '@/modules/trainer'

export async function GET(request: NextRequest) {
  try {
    const authResult = await validateRole('trainer')
    if (authResult instanceof NextResponse) return authResult

    const rateLimitResult = await checkRateLimit(request, RateLimitPresets.GENERAL, authResult.profileId)
    if (rateLimitResult) return rateLimitResult

    const [earnings, revenue_history] = await Promise.all([
      getTrainerEarnings(db, authResult.profileId),
      getMonthlyRevenueHistory(stripe),
    ])

    return NextResponse.json({ success: true, data: { ...earnings, revenue_history } })
  } catch (error) {
    return handleUnexpectedError(error, 'trainer-earnings')
  }
}

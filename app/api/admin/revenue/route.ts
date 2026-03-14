/**
 * Admin Revenue Stats API
 *
 * GET /api/admin/revenue — MRR, active subscriptions, member/trainer counts
 */

import { NextRequest, NextResponse } from 'next/server'
import { validateRole } from '@/lib/api/auth'
import { checkRateLimit, RateLimitPresets } from '@/lib/api/rate-limit'
import { handleUnexpectedError } from '@/lib/api/errors'
import { db } from '@/lib/db'
import { getRevenueStats } from '@/modules/admin/services/revenue'

export async function GET(request: NextRequest) {
  try {
    const authResult = await validateRole('admin')
    if (authResult instanceof NextResponse) return authResult

    const rateLimitResult = await checkRateLimit(request, RateLimitPresets.GENERAL, authResult.profileId)
    if (rateLimitResult) return rateLimitResult

    const stats = await getRevenueStats(db)
    return NextResponse.json({ success: true, data: stats })
  } catch (error) {
    return handleUnexpectedError(error, 'admin-revenue-stats')
  }
}

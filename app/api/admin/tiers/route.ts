/**
 * Admin Tier Management API
 *
 * GET  /api/admin/tiers — list all membership tiers
 * POST /api/admin/tiers — create a new membership tier
 */

import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'
import { validateRole } from '@/lib/api/auth'
import { checkRateLimit, RateLimitPresets } from '@/lib/api/rate-limit'
import { handleUnexpectedError } from '@/lib/api/errors'
import { validateRequestBody } from '@/lib/api/validation'
import { db } from '@/lib/db'
import { listTiers, createTier } from '@/modules/admin/services/tiers'
import { logAuditEvent } from '@/lib/services/audit'

const createTierSchema = z.object({
  name: z.string().min(1).max(100),
  priceMonthly: z.number().positive(),
  monthlyBookingQuota: z.number().int().positive(),
})

export async function GET(request: NextRequest) {
  try {
    const authResult = await validateRole('admin')
    if (authResult instanceof NextResponse) return authResult

    const rateLimitResult = await checkRateLimit(request, RateLimitPresets.GENERAL, authResult.profileId)
    if (rateLimitResult) return rateLimitResult

    const tiers = await listTiers(db)
    return NextResponse.json({ success: true, data: tiers })
  } catch (error) {
    return handleUnexpectedError(error, 'admin-tiers-list')
  }
}

export async function POST(request: NextRequest) {
  try {
    const authResult = await validateRole('admin')
    if (authResult instanceof NextResponse) return authResult

    const rateLimitResult = await checkRateLimit(request, RateLimitPresets.GENERAL, authResult.profileId)
    if (rateLimitResult) return rateLimitResult

    const body = await validateRequestBody(request, createTierSchema)
    if (body instanceof NextResponse) return body

    const tier = await createTier(db, body)

    logAuditEvent({
      userId: authResult.profileId,
      action: 'admin.tier.create',
      resource: 'tier',
      resourceId: tier.id,
      metadata: body,
    }).catch(console.error)

    return NextResponse.json({ success: true, data: tier }, { status: 201 })
  } catch (error) {
    return handleUnexpectedError(error, 'admin-tier-create')
  }
}

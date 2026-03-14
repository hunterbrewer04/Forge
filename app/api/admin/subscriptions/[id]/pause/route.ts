/**
 * Admin Subscription Pause API
 *
 * POST /api/admin/subscriptions/[id]/pause — pause a member's Stripe subscription
 *
 * Sets pause_collection: { behavior: 'void' } on the Stripe subscription.
 * No request body required.
 */

import { NextRequest, NextResponse } from 'next/server'
import { validateRole } from '@/lib/api/auth'
import { checkRateLimit, RateLimitPresets } from '@/lib/api/rate-limit'
import { createApiError, handleUnexpectedError } from '@/lib/api/errors'
import { isValidUUID } from '@/lib/api/validation'
import { db } from '@/lib/db'
import { pauseSubscription } from '@/modules/admin/services/subscriptions'

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const authResult = await validateRole('admin')
    if (authResult instanceof NextResponse) return authResult

    const rateLimitResult = await checkRateLimit(request, RateLimitPresets.GENERAL, authResult.profileId)
    if (rateLimitResult) return rateLimitResult

    const { id } = await params
    if (!isValidUUID(id)) {
      return createApiError('Invalid profile ID', 400, 'VALIDATION_ERROR')
    }

    const result = await pauseSubscription(db, id)
    return NextResponse.json({ success: true, data: result })
  } catch (error) {
    if (error instanceof Error && error.message.includes('No active subscription')) {
      return createApiError(error.message, 404, 'RESOURCE_NOT_FOUND')
    }
    return handleUnexpectedError(error, 'admin-subscription-pause')
  }
}

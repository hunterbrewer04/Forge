/**
 * Admin Subscription Resume API
 *
 * POST /api/admin/subscriptions/[id]/resume — resume a paused Stripe subscription
 *
 * Clears pause_collection on the Stripe subscription.
 * No request body required.
 */

import { NextRequest, NextResponse } from 'next/server'
import { validateRole } from '@/lib/api/auth'
import { checkRateLimit, RateLimitPresets } from '@/lib/api/rate-limit'
import { createApiError, handleUnexpectedError } from '@/lib/api/errors'
import { isValidUUID } from '@/lib/api/validation'
import { db } from '@/lib/db'
import { resumeSubscription, SubscriptionNotFoundError } from '@/modules/admin/services/subscriptions'
import { logAuditEvent } from '@/lib/services/audit'

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

    const result = await resumeSubscription(db, id)

    logAuditEvent({
      userId: authResult.profileId,
      action: 'admin.subscription.resume',
      resource: 'subscription',
      resourceId: id,
    }).catch(console.error)

    return NextResponse.json({ success: true, data: result })
  } catch (error) {
    if (error instanceof SubscriptionNotFoundError) {
      return createApiError(error.message, 404, 'RESOURCE_NOT_FOUND')
    }
    return handleUnexpectedError(error, 'admin-subscription-resume')
  }
}

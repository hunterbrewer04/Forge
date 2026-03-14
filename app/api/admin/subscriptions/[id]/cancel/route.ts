/**
 * Admin Subscription Cancel API
 *
 * POST /api/admin/subscriptions/[id]/cancel — cancel a member's Stripe subscription
 *
 * Body: { immediate?: boolean }
 * - immediate: true  → cancel immediately via stripe.subscriptions.cancel()
 * - immediate: false → set cancel_at_period_end (default)
 */

import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'
import { validateRole } from '@/lib/api/auth'
import { checkRateLimit, RateLimitPresets } from '@/lib/api/rate-limit'
import { createApiError, handleUnexpectedError } from '@/lib/api/errors'
import { validateRequestBody, isValidUUID } from '@/lib/api/validation'
import { db } from '@/lib/db'
import { cancelSubscription, SubscriptionNotFoundError } from '@/modules/admin/services/subscriptions'
import { logAuditEvent } from '@/lib/services/audit'

const cancelSchema = z.object({
  immediate: z.boolean().optional(),
})

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

    const body = await validateRequestBody(request, cancelSchema)
    if (body instanceof NextResponse) return body

    const result = await cancelSubscription(db, id, body)

    logAuditEvent({
      userId: authResult.profileId,
      action: 'admin.subscription.cancel',
      resource: 'subscription',
      resourceId: id,
      metadata: { immediate: body.immediate ?? false },
    }).catch(console.error)

    return NextResponse.json({ success: true, data: result })
  } catch (error) {
    if (error instanceof SubscriptionNotFoundError) {
      return createApiError(error.message, 404, 'RESOURCE_NOT_FOUND')
    }
    return handleUnexpectedError(error, 'admin-subscription-cancel')
  }
}

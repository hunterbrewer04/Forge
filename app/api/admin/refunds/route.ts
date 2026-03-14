/**
 * Admin Refunds API
 *
 * POST /api/admin/refunds — issue a full or partial refund against a Stripe charge
 *
 * Body: { chargeId: string, amount?: number }
 * - chargeId: Stripe charge ID (e.g. "ch_...")
 * - amount:   optional partial refund in smallest currency unit (cents).
 *             Omit for a full refund.
 */

import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'
import { validateRole } from '@/lib/api/auth'
import { checkRateLimit, RateLimitPresets } from '@/lib/api/rate-limit'
import { handleUnexpectedError } from '@/lib/api/errors'
import { validateRequestBody } from '@/lib/api/validation'
import { issueRefund } from '@/modules/admin/services/subscriptions'
import { logAuditEvent } from '@/lib/services/audit'

const refundSchema = z.object({
  chargeId: z.string().startsWith('ch_', { message: 'Invalid charge ID format — must start with ch_' }),
  amount: z.number().int().positive().optional(),
})

export async function POST(request: NextRequest) {
  try {
    const authResult = await validateRole('admin')
    if (authResult instanceof NextResponse) return authResult

    const rateLimitResult = await checkRateLimit(request, RateLimitPresets.GENERAL, authResult.profileId)
    if (rateLimitResult) return rateLimitResult

    const body = await validateRequestBody(request, refundSchema)
    if (body instanceof NextResponse) return body

    const refund = await issueRefund(body.chargeId, body.amount)

    logAuditEvent({
      userId: authResult.profileId,
      action: 'admin.refund.create',
      resource: 'refund',
      resourceId: refund.id,
      metadata: { chargeId: body.chargeId, amount: body.amount ?? null },
    }).catch(console.error)

    return NextResponse.json({ success: true, data: refund })
  } catch (error) {
    return handleUnexpectedError(error, 'admin-refund-create')
  }
}

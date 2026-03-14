/**
 * Admin Tier Detail API
 *
 * PATCH  /api/admin/tiers/[id] — update a membership tier's fields
 * DELETE /api/admin/tiers/[id] — hard-delete a membership tier
 */

import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'
import { validateRole } from '@/lib/api/auth'
import { checkRateLimit, RateLimitPresets } from '@/lib/api/rate-limit'
import { createApiError, handleUnexpectedError } from '@/lib/api/errors'
import { validateRequestBody, isValidUUID } from '@/lib/api/validation'
import { db } from '@/lib/db'
import { updateTier, deleteTier } from '@/modules/admin/services/tiers'
import { logAuditEvent } from '@/lib/services/audit'

const updateTierSchema = z.object({
  name: z.string().min(1).max(100).optional(),
  priceMonthly: z.number().positive().optional(),
  monthlyBookingQuota: z.number().int().positive().optional(),
  isActive: z.boolean().optional(),
})

export async function PATCH(
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
      return createApiError('Invalid tier ID', 400, 'VALIDATION_ERROR')
    }

    const body = await validateRequestBody(request, updateTierSchema)
    if (body instanceof NextResponse) return body

    const updated = await updateTier(db, id, body)
    if (!updated) {
      return createApiError('Tier not found', 404, 'RESOURCE_NOT_FOUND')
    }

    logAuditEvent({
      userId: authResult.profileId,
      action: 'admin.tier.update',
      resource: 'tier',
      resourceId: id,
      metadata: body,
    }).catch(console.error)

    return NextResponse.json({ success: true, data: updated })
  } catch (error) {
    return handleUnexpectedError(error, 'admin-tier-update')
  }
}

export async function DELETE(
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
      return createApiError('Invalid tier ID', 400, 'VALIDATION_ERROR')
    }

    const deleted = await deleteTier(db, id)
    if (!deleted) {
      return createApiError('Tier not found', 404, 'RESOURCE_NOT_FOUND')
    }

    logAuditEvent({
      userId: authResult.profileId,
      action: 'admin.tier.delete',
      resource: 'tier',
      resourceId: id,
    }).catch(console.error)

    return NextResponse.json({ success: true, data: deleted })
  } catch (error) {
    if (error instanceof Error && error.message.includes('active subscriber')) {
      return createApiError(error.message, 409, 'CONFLICT')
    }
    return handleUnexpectedError(error, 'admin-tier-delete')
  }
}

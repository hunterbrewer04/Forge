/**
 * Admin User Detail API
 *
 * GET    /api/admin/users/[id] — fetch a single user's full profile
 * PATCH  /api/admin/users/[id] — update role flags
 * DELETE /api/admin/users/[id] — soft-deactivate (strips all access flags)
 */

import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'
import { validateRole } from '@/lib/api/auth'
import { checkRateLimit, RateLimitPresets } from '@/lib/api/rate-limit'
import { createApiError, handleUnexpectedError } from '@/lib/api/errors'
import { validateRequestBody, isValidUUID } from '@/lib/api/validation'
import { db } from '@/lib/db'
import { getUser, updateUserRoles, deactivateUser } from '@/modules/admin/services/users'
import { logAuditEvent } from '@/lib/services/audit'

const roleUpdateSchema = z.object({
  isTrainer: z.boolean().optional(),
  isAdmin: z.boolean().optional(),
  isMember: z.boolean().optional(),
  hasFullAccess: z.boolean().optional(),
})

export async function GET(
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
      return createApiError('Invalid user ID', 400, 'VALIDATION_ERROR')
    }

    const user = await getUser(db, id)
    if (!user) {
      return createApiError('User not found', 404, 'RESOURCE_NOT_FOUND')
    }

    return NextResponse.json({ success: true, data: user })
  } catch (error) {
    return handleUnexpectedError(error, 'admin-user-get')
  }
}

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
      return createApiError('Invalid user ID', 400, 'VALIDATION_ERROR')
    }

    const body = await validateRequestBody(request, roleUpdateSchema)
    if (body instanceof NextResponse) return body

    const updated = await updateUserRoles(db, id, body)
    if (!updated) {
      return createApiError('User not found', 404, 'RESOURCE_NOT_FOUND')
    }

    logAuditEvent({
      userId: authResult.profileId,
      action: 'admin.user.role_update',
      resource: 'profile',
      resourceId: id,
      metadata: body,
      ipAddress: request.headers.get('x-forwarded-for')?.split(',')[0].trim() || request.headers.get('x-real-ip') || undefined,
      userAgent: request.headers.get('user-agent') || undefined,
    }).catch(console.error)

    return NextResponse.json({ success: true, data: updated })
  } catch (error) {
    return handleUnexpectedError(error, 'admin-user-update')
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
      return createApiError('Invalid user ID', 400, 'VALIDATION_ERROR')
    }

    const deactivated = await deactivateUser(db, id)
    if (!deactivated) {
      return createApiError('User not found', 404, 'RESOURCE_NOT_FOUND')
    }

    logAuditEvent({
      userId: authResult.profileId,
      action: 'admin.user.deactivate',
      resource: 'profile',
      resourceId: id,
      ipAddress: request.headers.get('x-forwarded-for')?.split(',')[0].trim() || request.headers.get('x-real-ip') || undefined,
      userAgent: request.headers.get('user-agent') || undefined,
    }).catch(console.error)

    return NextResponse.json({ success: true, data: deactivated })
  } catch (error) {
    return handleUnexpectedError(error, 'admin-user-deactivate')
  }
}

/**
 * Admin Invitation Revoke API
 *
 * DELETE /api/admin/invitations/[id] — revoke a pending Clerk invitation
 */

import { NextRequest, NextResponse } from 'next/server'
import { validateRole } from '@/lib/api/auth'
import { checkRateLimit, RateLimitPresets } from '@/lib/api/rate-limit'
import { createApiError, handleUnexpectedError } from '@/lib/api/errors'
import { revokeInvitation } from '@/modules/admin/services/invitations'
import { logAuditEvent } from '@/lib/services/audit'

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
    if (!id || id.length > 255) {
      return createApiError('Invalid invitation ID', 400, 'VALIDATION_ERROR')
    }

    await revokeInvitation(id)

    logAuditEvent({
      userId: authResult.profileId,
      action: 'admin.invitation.revoke',
      resource: 'invitation',
      resourceId: id,
      ipAddress: request.headers.get('x-forwarded-for')?.split(',')[0].trim() || request.headers.get('x-real-ip') || undefined,
      userAgent: request.headers.get('user-agent') || undefined,
    }).catch(console.error)

    return NextResponse.json({ success: true })
  } catch (error) {
    return handleUnexpectedError(error, 'admin-invitation-revoke')
  }
}

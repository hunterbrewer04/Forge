/**
 * Admin Invitations API
 *
 * GET  /api/admin/invitations — list all Clerk invitations
 * POST /api/admin/invitations — send a new invitation
 */

import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'
import { validateRole } from '@/lib/api/auth'
import { checkRateLimit, RateLimitPresets } from '@/lib/api/rate-limit'
import { handleUnexpectedError } from '@/lib/api/errors'
import { validateRequestBody } from '@/lib/api/validation'
import { sendInvitation, listInvitations } from '@/modules/admin/services/invitations'
import { INVITE_ROLES } from '@/modules/admin/types'

const inviteSchema = z.object({
  emailAddress: z.string().email(),
  role: z.enum(INVITE_ROLES).optional(),
})

export async function GET(request: NextRequest) {
  try {
    const authResult = await validateRole('admin')
    if (authResult instanceof NextResponse) return authResult

    const rateLimitResult = await checkRateLimit(request, RateLimitPresets.GENERAL, authResult.profileId)
    if (rateLimitResult) return rateLimitResult

    const invitations = await listInvitations()
    return NextResponse.json({ success: true, data: invitations })
  } catch (error) {
    return handleUnexpectedError(error, 'admin-invitations-list')
  }
}

export async function POST(request: NextRequest) {
  try {
    const authResult = await validateRole('admin')
    if (authResult instanceof NextResponse) return authResult

    const rateLimitResult = await checkRateLimit(request, RateLimitPresets.GENERAL, authResult.profileId)
    if (rateLimitResult) return rateLimitResult

    const body = await validateRequestBody(request, inviteSchema)
    if (body instanceof NextResponse) return body

    const invitation = await sendInvitation(body)
    return NextResponse.json({ success: true, data: invitation }, { status: 201 })
  } catch (error) {
    return handleUnexpectedError(error, 'admin-invitation-create')
  }
}

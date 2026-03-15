/**
 * Admin Trainer-Client Assignment API
 *
 * POST   /api/admin/trainer-clients — assign a client to a trainer
 * DELETE /api/admin/trainer-clients — unassign a client from a trainer
 */

import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'
import { eq, and } from 'drizzle-orm'
import { validateRole } from '@/lib/api/auth'
import { checkRateLimit, RateLimitPresets } from '@/lib/api/rate-limit'
import { handleUnexpectedError } from '@/lib/api/errors'
import { validateRequestBody } from '@/lib/api/validation'
import { db } from '@/lib/db'
import { trainerClients } from '@/lib/db/schema'
import { logAuditEvent } from '@/lib/services/audit'

const assignSchema = z.object({
  trainerId: z.string().uuid(),
  clientId: z.string().uuid(),
})

export async function GET(request: NextRequest) {
  try {
    const authResult = await validateRole('admin')
    if (authResult instanceof NextResponse) return authResult

    const rateLimitResult = await checkRateLimit(request, RateLimitPresets.GENERAL, authResult.profileId)
    if (rateLimitResult) return rateLimitResult

    const clientId = request.nextUrl.searchParams.get('clientId')
    if (!clientId) {
      return NextResponse.json({ success: true, data: null })
    }

    const row = await db.query.trainerClients.findFirst({
      where: eq(trainerClients.clientId, clientId),
      columns: { trainerId: true },
    })

    return NextResponse.json({
      success: true,
      data: row ? { trainer_id: row.trainerId } : null,
    })
  } catch (error) {
    return handleUnexpectedError(error, 'admin-trainer-client-get')
  }
}

export async function POST(request: NextRequest) {
  try {
    const authResult = await validateRole('admin')
    if (authResult instanceof NextResponse) return authResult

    const rateLimitResult = await checkRateLimit(request, RateLimitPresets.GENERAL, authResult.profileId)
    if (rateLimitResult) return rateLimitResult

    const body = await validateRequestBody(request, assignSchema)
    if (body instanceof NextResponse) return body

    const [row] = await db
      .insert(trainerClients)
      .values({ trainerId: body.trainerId, clientId: body.clientId })
      .onConflictDoNothing()
      .returning({ id: trainerClients.id })

    logAuditEvent({
      userId: authResult.profileId,
      action: 'admin.trainer_client.assign',
      resource: 'trainer_clients',
      resourceId: row?.id ?? null,
      metadata: { trainerId: body.trainerId, clientId: body.clientId },
    }).catch(console.error)

    return NextResponse.json({ success: true })
  } catch (error) {
    return handleUnexpectedError(error, 'admin-trainer-client-assign')
  }
}

export async function DELETE(request: NextRequest) {
  try {
    const authResult = await validateRole('admin')
    if (authResult instanceof NextResponse) return authResult

    const rateLimitResult = await checkRateLimit(request, RateLimitPresets.GENERAL, authResult.profileId)
    if (rateLimitResult) return rateLimitResult

    const body = await validateRequestBody(request, assignSchema)
    if (body instanceof NextResponse) return body

    await db
      .delete(trainerClients)
      .where(
        and(
          eq(trainerClients.trainerId, body.trainerId),
          eq(trainerClients.clientId, body.clientId)
        )
      )

    logAuditEvent({
      userId: authResult.profileId,
      action: 'admin.trainer_client.unassign',
      resource: 'trainer_clients',
      resourceId: null,
      metadata: { trainerId: body.trainerId, clientId: body.clientId },
    }).catch(console.error)

    return NextResponse.json({ success: true })
  } catch (error) {
    return handleUnexpectedError(error, 'admin-trainer-client-unassign')
  }
}

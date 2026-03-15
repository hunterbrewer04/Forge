/**
 * Admin Invoices API
 *
 * GET /api/admin/invoices — paginated list of Stripe invoices
 *
 * Query params:
 *   limit          — number of invoices to return (1–100, default 20)
 *   starting_after — Stripe invoice ID cursor for forward pagination
 */

import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'
import { validateRole } from '@/lib/api/auth'
import { checkRateLimit, RateLimitPresets } from '@/lib/api/rate-limit'
import { handleUnexpectedError } from '@/lib/api/errors'
import { validateQueryParams } from '@/lib/api/validation'
import { listInvoices } from '@/modules/admin/services/subscriptions'

const querySchema = z.object({
  limit: z.coerce.number().int().min(1).max(100).default(20),
  starting_after: z.string().optional(),
})

export async function GET(request: NextRequest) {
  try {
    const authResult = await validateRole('admin')
    if (authResult instanceof NextResponse) return authResult

    const rateLimitResult = await checkRateLimit(request, RateLimitPresets.GENERAL, authResult.profileId)
    if (rateLimitResult) return rateLimitResult

    const params = await validateQueryParams(request, querySchema)
    if (params instanceof NextResponse) return params

    const result = await listInvoices({ limit: params.limit, startingAfter: params.starting_after })
    return NextResponse.json({ success: true, ...result })
  } catch (error) {
    return handleUnexpectedError(error, 'admin-invoices-list')
  }
}

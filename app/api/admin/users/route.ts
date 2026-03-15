/**
 * Admin Users List API
 *
 * GET /api/admin/users — paginated, filterable list of all user profiles
 */

import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'
import { validateRole } from '@/lib/api/auth'
import { checkRateLimit, RateLimitPresets } from '@/lib/api/rate-limit'
import { handleUnexpectedError } from '@/lib/api/errors'
import { validateQueryParams, CommonSchemas } from '@/lib/api/validation'
import { db } from '@/lib/db'
import { listUsers } from '@/modules/admin/services/users'
import { FILTER_ROLES } from '@/modules/admin/types'

const querySchema = CommonSchemas.paginationQuery.extend({
  search: z.string().optional(),
  role: z.enum(FILTER_ROLES).optional(),
})

export async function GET(request: NextRequest) {
  try {
    const authResult = await validateRole('admin')
    if (authResult instanceof NextResponse) return authResult

    const rateLimitResult = await checkRateLimit(request, RateLimitPresets.GENERAL, authResult.profileId)
    if (rateLimitResult) return rateLimitResult

    const params = await validateQueryParams(request, querySchema)
    if (params instanceof NextResponse) return params

    const result = await listUsers(db, params)
    return NextResponse.json({ success: true, ...result })
  } catch (error) {
    return handleUnexpectedError(error, 'admin-users-list')
  }
}

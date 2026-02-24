// app/api/member/claim/route.ts
import { NextRequest, NextResponse } from 'next/server'
import { validateAuth } from '@/lib/api/auth'
import { getAdminClient } from '@/lib/supabase-admin'
import { createApiError, handleUnexpectedError } from '@/lib/api/errors'

export async function POST(request: NextRequest) {
  try {
    const auth = await validateAuth(request)
    if (auth instanceof NextResponse) return auth

    const supabase = getAdminClient()

    const { error } = await supabase
      .from('profiles')
      .update({ is_member: true })
      .eq('id', auth.id)

    if (error) {
      console.error('Error setting is_member:', { code: error.code, message: error.message })
      return createApiError('Failed to activate member profile', 500, 'DATABASE_ERROR')
    }

    return NextResponse.json({ success: true })
  } catch (error) {
    return handleUnexpectedError(error, 'member-claim')
  }
}

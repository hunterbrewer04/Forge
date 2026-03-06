import { auth } from '@clerk/nextjs/server'
import { NextResponse } from 'next/server'
import { getAdminClient } from '@/lib/supabase-admin'
import { createApiError, handleUnexpectedError } from '@/lib/api/errors'

export async function GET() {
  try {
    const { userId } = await auth()
    if (!userId) {
      return createApiError('Unauthorized', 401, 'NO_SESSION')
    }

    const supabase = getAdminClient()
    const { data: profile, error } = await supabase
      .from('profiles')
      .select('id, full_name, avatar_url, username, is_trainer, is_admin, has_full_access, is_member, membership_status, created_at')
      .eq('clerk_user_id', userId)
      .single()

    if (error || !profile) {
      return NextResponse.json({ error: 'Profile not found' }, { status: 404 })
    }

    return NextResponse.json({ profile })
  } catch (err) {
    return handleUnexpectedError(err, 'profile-get')
  }
}

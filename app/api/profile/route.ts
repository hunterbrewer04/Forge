import { NextResponse } from 'next/server'
import { validateAuth } from '@/lib/api/auth'
import { createAdminClient } from '@/lib/supabase-admin'
import { handleUnexpectedError } from '@/lib/api/errors'

export async function GET() {
  try {
    const authResult = await validateAuth()
    if (authResult instanceof NextResponse) return authResult
    const { profileId } = authResult

    const supabase = createAdminClient()
    const { data: profile, error } = await supabase
      .from('profiles')
      .select('id, full_name, avatar_url, username, is_trainer, is_admin, has_full_access, is_member, membership_status, created_at')
      .eq('id', profileId)
      .single()

    if (error || !profile) {
      return NextResponse.json({ error: 'Profile not found' }, { status: 404 })
    }

    return NextResponse.json({ profile })
  } catch (err) {
    return handleUnexpectedError(err, 'profile-get')
  }
}

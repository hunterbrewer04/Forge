import { NextRequest, NextResponse } from 'next/server'
import { createServerClient } from '@/lib/supabase-server'
import { getAdminClient } from '@/lib/supabase-admin'
import { logger } from '@/lib/utils/logger'

export async function GET(request: NextRequest) {
  const { searchParams, origin } = request.nextUrl
  const code = searchParams.get('code')
  const next = searchParams.get('next') ?? '/chat'

  if (code) {
    const supabase = await createServerClient()
    const { data, error } = await supabase.auth.exchangeCodeForSession(code)

    if (!error && data.user) {
      // Attempt guest booking migration (non-fatal)
      try {
        const admin = getAdminClient()
        const { data: guestProfile } = await admin
          .from('profiles')
          .select('id')
          .eq('email', data.user.email!)
          .eq('is_guest', true)
          .not('id', 'eq', data.user.id)
          .maybeSingle()

        if (guestProfile) {
          await admin
            .from('bookings')
            .update({ client_id: data.user.id })
            .eq('client_id', guestProfile.id)

          const { error: deleteError } = await admin
            .from('profiles')
            .delete()
            .eq('id', guestProfile.id)

          if (deleteError) {
            logger.error('auth-callback: guest profile delete failed', {
              code: deleteError.code,
              message: deleteError.message,
            })
          }
        }
      } catch (err) {
        logger.warn('auth-callback: guest upgrade failed (non-fatal)', err)
      }

      return NextResponse.redirect(`${origin}${next}`)
    }
  }

  // Code missing or exchange failed — redirect to login
  return NextResponse.redirect(`${origin}/login?error=auth_callback_failed`)
}

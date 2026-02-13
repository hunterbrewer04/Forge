import { createServerClient } from '@supabase/ssr'
import { cookies } from 'next/headers'
import { env } from './env-validation'

/**
 * Creates a Supabase client for use in server-side components and API routes.
 *
 * This client uses the anonymous key and respects Row Level Security (RLS).
 * It automatically manages auth sessions via cookies.
 *
 * IMPORTANT: This client is scoped to the authenticated user via RLS.
 * For admin operations that need to bypass RLS, use lib/supabase-admin.ts instead.
 *
 * @returns Supabase client for server-side use with user auth context
 */
export async function createClient() {
  const cookieStore = await cookies()

  return createServerClient(
    env.supabaseUrl(),
    env.supabaseAnonKey(),
    {
      cookies: {
        getAll() {
          return cookieStore.getAll()
        },
        setAll(cookiesToSet) {
          try {
            cookiesToSet.forEach(({ name, value, options }) =>
              cookieStore.set(name, value, options)
            )
          } catch {
            // Called from a Server Component — safe to ignore
            // if proxy middleware is refreshing user sessions.
          }
        },
      },
      cookieOptions: {
        secure: true,
        sameSite: 'lax' as const,
        path: '/',
      },
    }
  )
}

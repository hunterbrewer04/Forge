import { createServerClient, type CookieOptions } from '@supabase/ssr'
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
        get(name: string) {
          return cookieStore.get(name)?.value
        },
        set(name: string, value: string, options: CookieOptions) {
          try {
            cookieStore.set({ name, value, ...options })
          } catch (error) {
            // The `set` method was called from a Server Component.
            // This can be ignored if you have middleware refreshing
            // user sessions.
          }
        },
        remove(name: string, options: CookieOptions) {
          try {
            cookieStore.set({ name, value: '', ...options })
          } catch (error) {
            // The `delete` method was called from a Server Component.
            // This can be ignored if you have middleware refreshing
            // user sessions.
          }
        },
      },
    }
  )
}

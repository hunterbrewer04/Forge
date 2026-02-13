import { createBrowserClient } from '@supabase/ssr'

/**
 * Creates a Supabase client for use in client-side components.
 *
 * This client uses the anonymous key which is protected by Row Level Security (RLS).
 * All queries are scoped to the authenticated user via RLS policies.
 *
 * SECURITY: The anon key is safe to expose to the browser because:
 * 1. It's protected by RLS policies that enforce user-level access control
 * 2. It can only perform operations allowed by your database policies
 * 3. It cannot bypass RLS or access data it's not authorized to see
 *
 * @returns Supabase client for browser use
 */
export function createClient() {
  // Access env vars directly in browser - they're replaced at build time
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
  const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY

  if (!supabaseUrl || !supabaseAnonKey) {
    throw new Error(
      'Missing Supabase configuration. Please ensure NEXT_PUBLIC_SUPABASE_URL and NEXT_PUBLIC_SUPABASE_ANON_KEY are set in your deployment environment variables.'
    )
  }

  return createBrowserClient(supabaseUrl, supabaseAnonKey, {
    cookieOptions: {
      secure: true,
      sameSite: 'lax' as const,
      path: '/',
    },
  })
}

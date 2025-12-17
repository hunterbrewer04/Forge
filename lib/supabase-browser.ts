import { createBrowserClient } from '@supabase/ssr'
import { env } from './env-validation'

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
  return createBrowserClient(
    env.supabaseUrl(),
    env.supabaseAnonKey()
  )
}

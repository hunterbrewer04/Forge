import { createBrowserClient } from '@supabase/ssr'

/**
 * Supabase browser client — Realtime + Storage only.
 *
 * All database operations now go through API routes (Drizzle ORM).
 * This client is used only for:
 * - Realtime subscriptions (chat messages, unread counts)
 * - Storage operations (avatar uploads, chat media signed URLs)
 *
 * Migrates to Ably (Realtime) + Cloudflare R2 (Storage) in Phase 4.
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

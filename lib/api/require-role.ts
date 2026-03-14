import { auth } from '@clerk/nextjs/server'
import { redirect } from 'next/navigation'
import { db } from '@/lib/db'
import { profiles } from '@/lib/db/schema'
import { eq } from 'drizzle-orm'

/**
 * Server-component role gate for layouts.
 * Redirects to /member/login if unauthenticated, or /home if unauthorized.
 */
export async function requireRole(role: 'isAdmin' | 'isTrainer') {
  const { userId } = await auth()

  if (!userId) {
    redirect('/member/login')
  }

  const profile = await db.query.profiles.findFirst({
    where: eq(profiles.clerkUserId, userId),
    columns: { [role]: true },
  })

  if (!profile?.[role]) {
    redirect('/home')
  }
}

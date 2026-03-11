import { auth } from '@clerk/nextjs/server'
import { redirect } from 'next/navigation'
import { db } from '@/lib/db'
import { profiles } from '@/lib/db/schema'
import { eq } from 'drizzle-orm'

export default async function TrainerLayout({
  children,
}: {
  children: React.ReactNode
}) {
  const { userId } = await auth()

  if (!userId) {
    redirect('/member/login')
  }

  const profile = await db.query.profiles.findFirst({
    where: eq(profiles.clerkUserId, userId),
    columns: { isTrainer: true },
  })

  if (!profile?.isTrainer) {
    redirect('/home')
  }

  return <>{children}</>
}

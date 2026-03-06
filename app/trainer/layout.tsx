import { auth } from '@clerk/nextjs/server'
import { redirect } from 'next/navigation'
import { createAdminClient } from '@/lib/supabase-admin'

export default async function TrainerLayout({
  children,
}: {
  children: React.ReactNode
}) {
  const { userId } = await auth()

  if (!userId) {
    redirect('/member/login')
  }

  const supabase = createAdminClient()
  const { data: profile } = await supabase
    .from('profiles')
    .select('is_trainer')
    .eq('clerk_user_id', userId)
    .single()

  if (!profile?.is_trainer) {
    redirect('/home')
  }

  return <>{children}</>
}

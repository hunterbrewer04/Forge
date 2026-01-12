import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase-server'

export default async function AdminLayout({
  children,
}: {
  children: React.ReactNode
}) {
  const supabase = await createClient()

  // Get current user
  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) {
    redirect('/auth/login')
  }

  // Check if user is a trainer or admin
  const { data: profile } = await supabase
    .from('profiles')
    .select('is_trainer, is_admin')
    .eq('id', user.id)
    .single()

  if (!profile || (!profile.is_trainer && !profile.is_admin)) {
    // Redirect non-trainers to home
    redirect('/home')
  }

  return <>{children}</>
}

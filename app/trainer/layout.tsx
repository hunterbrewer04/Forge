import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase-server'

export default async function TrainerLayout({
  children,
}: {
  children: React.ReactNode
}) {
  const supabase = await createClient()

  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) {
    redirect('/login')
  }

  const { data: profile } = await supabase
    .from('profiles')
    .select('is_trainer')
    .eq('id', user.id)
    .single()

  if (!profile?.is_trainer) {
    redirect('/home')
  }

  return <>{children}</>
}

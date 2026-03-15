import { requireRole } from '@/lib/api/require-role'

export default async function TrainerLayout({
  children,
}: {
  children: React.ReactNode
}) {
  await requireRole('isTrainer')

  return <>{children}</>
}

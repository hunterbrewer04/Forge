// app/member/layout.tsx
import MemberLayoutShell from '@/components/layout/MemberLayoutShell'

export default function MemberLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return <MemberLayoutShell>{children}</MemberLayoutShell>
}

// app/member/signup/page.tsx
// Redirect to the unified membership wizard.
import { redirect } from 'next/navigation'

export default function MemberSignupPage() {
  redirect('/member/plans')
}

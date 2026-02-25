import { Suspense } from 'react'
import AuthLayout from '@/components/layout/AuthLayout'
import SignupForm from './SignupForm'

export default function SignupPage() {
  return (
    <AuthLayout title="Create your account">
      <Suspense>
        <SignupForm />
      </Suspense>
    </AuthLayout>
  )
}

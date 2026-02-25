import { Suspense } from 'react'
import AuthLayout from '@/components/layout/AuthLayout'
import LoginForm from './components/LoginForm'

function LoginFallback() {
  return (
    <div className="flex justify-center py-12">
      <div className="inline-block h-8 w-8 animate-spin rounded-full border-4 border-solid border-primary border-r-transparent" />
    </div>
  )
}

export default function LoginPage() {
  return (
    <AuthLayout title="Sign in to your account">
      <Suspense fallback={<LoginFallback />}>
        <LoginForm />
      </Suspense>
    </AuthLayout>
  )
}

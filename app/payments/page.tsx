'use client'

import { useAuth } from '@/contexts/AuthContext'
import { useRouter } from 'next/navigation'
import { useEffect } from 'react'
import GlassAppLayout from '@/components/layout/GlassAppLayout'
import TrainerEarningsView from './components/TrainerEarningsView'
import MemberPaymentsView from './components/MemberPaymentsView'
import { ArrowLeft } from '@/components/ui/icons'

export default function PaymentsPage() {
  const { user, profile, loading } = useAuth()
  const router = useRouter()

  useEffect(() => {
    if (!loading && !user) {
      router.push('/member/login')
    }
  }, [user, loading, router])

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-bg-primary">
        <div className="w-10 h-10 border-2 border-primary/30 border-t-primary rounded-full animate-spin" />
      </div>
    )
  }

  if (!user || !profile) {
    return null
  }

  const isTrainerView = profile.is_trainer || profile.is_admin

  const customHeader = (
    <header className="sticky top-0 z-30 w-full bg-bg-primary pt-safe-top transition-colors duration-200">
      <div className="flex items-center justify-between px-4 py-3">
        <button
          onClick={() => router.back()}
          className="size-10 flex items-center justify-center text-text-secondary hover:text-text-primary transition-colors"
          aria-label="Go back"
        >
          <ArrowLeft size={24} />
        </button>
        <h1 className="text-lg font-semibold text-text-primary">
          {isTrainerView ? 'Earnings' : 'Payments'}
        </h1>
        <div className="size-10" />
      </div>
    </header>
  )

  return (
    <GlassAppLayout customHeader={customHeader} desktopTitle={isTrainerView ? 'Earnings' : 'Payments'}>
      {isTrainerView ? <TrainerEarningsView /> : <MemberPaymentsView />}
    </GlassAppLayout>
  )
}

'use client'

import { useAuth } from '@/contexts/AuthContext'
import { useRouter } from 'next/navigation'
import { useEffect, useState } from 'react'
import MobileLayout from '@/components/layout/MobileLayout'
import { ArrowLeft, CreditCard, Plus, Clipboard, Lock, Dumbbell } from '@/components/ui/icons'
import Link from 'next/link'

interface PaymentMethod {
  id: string
  type: 'card' | 'apple_pay' | 'google_pay'
  last4?: string
  brand?: string
  expiry?: string
  isDefault: boolean
}

interface Transaction {
  id: string
  title: string
  date: string
  amount: number
  status: 'PAID' | 'PENDING' | 'FAILED'
}

export default function PaymentsPage() {
  const { user, profile, loading } = useAuth()
  const router = useRouter()

  // Payment data - will be connected to Stripe in future implementation
  const [balance] = useState(0)
  const [paymentMethods] = useState<PaymentMethod[]>([])
  const [transactions] = useState<Transaction[]>([])

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

  // Custom header
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

        <h1 className="text-lg font-semibold text-text-primary">Payments</h1>

        <div className="size-10" />
      </div>
    </header>
  )

  return (
    <MobileLayout customHeader={customHeader}>
      {/* Balance Card */}
      <section className="bg-text-primary rounded-2xl p-5 text-bg-primary">
        <div className="flex items-center justify-between mb-4">
          <span className="text-bg-primary/70 text-sm font-medium">Current Balance</span>
          <CreditCard size={24} className="text-bg-primary/50" />
        </div>
        <h2 className="text-4xl font-bold mb-4">${balance.toFixed(2)}</h2>
        <button className="w-full bg-bg-primary text-text-primary py-3 rounded-xl font-semibold hover:bg-bg-primary/90 transition-colors">
          PAY NOW
        </button>
      </section>

      {/* Saved Payment Methods */}
      <section className="mt-6">
        <h3 className="text-text-primary font-semibold mb-3">Saved Payment Methods</h3>

        <div className="space-y-2">
          {paymentMethods.length === 0 ? (
            <div className="text-center py-8 text-text-muted bg-bg-card border border-border rounded-xl">
              <CreditCard size={48} className="mb-2 opacity-50" />
              <p className="text-sm">No payment methods added</p>
            </div>
          ) : (
            paymentMethods.map((method) => (
              <div
                key={method.id}
                className="flex items-center gap-3 bg-bg-card border border-border rounded-xl p-4"
              >
                {method.type === 'card' ? (
                  <>
                    <div className="w-10 h-7 bg-bg-secondary rounded flex items-center justify-center">
                      <CreditCard size={18} className="text-text-muted" />
                    </div>
                    <div className="flex-1">
                      <p className="text-text-primary font-medium">
                        {method.brand} ending in {method.last4}
                      </p>
                      <p className="text-text-muted text-xs">Expires {method.expiry}</p>
                    </div>
                  </>
                ) : method.type === 'apple_pay' ? (
                  <>
                    <div className="w-10 h-7 bg-black rounded flex items-center justify-center">
                      <span className="text-white text-xs font-bold">Pay</span>
                    </div>
                    <div className="flex-1">
                      <p className="text-text-primary font-medium">Apple Pay</p>
                    </div>
                  </>
                ) : (
                  <>
                    <div className="w-10 h-7 bg-bg-secondary rounded flex items-center justify-center">
                      <span className="text-text-muted text-xs font-bold">GPay</span>
                    </div>
                    <div className="flex-1">
                      <p className="text-text-primary font-medium">Google Pay</p>
                    </div>
                  </>
                )}

                {/* Radio indicator */}
                <div className={`size-5 rounded-full border-2 flex items-center justify-center ${
                  method.isDefault ? 'border-primary bg-primary' : 'border-border'
                }`}>
                  {method.isDefault && (
                    <div className="size-2 rounded-full bg-white" />
                  )}
                </div>
              </div>
            ))
          )}

          {/* Add Payment Method */}
          <button className="flex items-center gap-3 w-full bg-bg-card border border-border border-dashed rounded-xl p-4 text-left hover:bg-bg-secondary transition-colors">
            <div className="size-10 rounded-full bg-bg-secondary flex items-center justify-center">
              <Plus size={22} className="text-text-secondary" />
            </div>
            <span className="text-text-primary font-medium">Add Payment Method</span>
          </button>
        </div>
      </section>

      {/* Recent Activity */}
      <section className="mt-6">
        <div className="flex items-center justify-between mb-3">
          <h3 className="text-text-primary font-semibold">Recent Activity</h3>
          <Link href="/payments/history" className="text-primary text-sm font-medium">
            VIEW ALL
          </Link>
        </div>

        <div className="space-y-2">
          {transactions.length === 0 ? (
            <div className="text-center py-8 text-text-muted bg-bg-card border border-border rounded-xl">
              <Clipboard size={48} className="mb-2 opacity-50" />
              <p className="text-sm">No transactions yet</p>
            </div>
          ) : (
            transactions.map((tx) => (
              <div
                key={tx.id}
                className="flex items-center gap-3 bg-bg-card border border-border rounded-xl p-4"
              >
                <div className="bg-bg-secondary p-2.5 rounded-full">
                  <Dumbbell size={22} className="text-primary" />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-text-primary font-medium text-sm truncate">{tx.title}</p>
                  <p className="text-text-muted text-xs">{tx.date}</p>
                </div>
                <div className="text-right">
                  <p className="text-text-primary font-semibold">${Math.abs(tx.amount).toFixed(2)}</p>
                  <p className={`text-[10px] font-semibold ${
                    tx.status === 'PAID' ? 'text-success' : tx.status === 'PENDING' ? 'text-warning' : 'text-error'
                  }`}>
                    {tx.status}
                  </p>
                </div>
              </div>
            ))
          )}
        </div>
      </section>

      {/* Security Footer */}
      <section className="mt-8 mb-8 text-center">
        <div className="flex items-center justify-center gap-2 text-text-muted">
          <Lock size={16} />
          <span className="text-xs">SECURE SSL ENCRYPTION</span>
        </div>
        <p className="text-[10px] text-text-muted mt-2 uppercase tracking-wider">
          Baseball Facility Management Systems
        </p>
      </section>
    </MobileLayout>
  )
}

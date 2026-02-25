// app/member/components/PaymentForm.tsx
// Renders the Stripe PaymentElement inside an already-provided Elements context.
// Parent must wrap this in <Elements stripe={stripePromise} options={{ clientSecret }}>.
'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { useStripe, useElements, PaymentElement } from '@stripe/react-stripe-js'
import { Button } from '@/components/ui/shadcn/button'
import { Card } from '@/components/ui/shadcn/card'

interface PaymentFormProps {
  tierName: string
  priceMonthly: number
  onBack: () => void
  onSuccess?: () => void
}

function OrderSummaryCard({ tierName, priceMonthly }: { tierName: string; priceMonthly: number }) {
  return (
    <Card className="p-0 gap-0 overflow-hidden">
      {/* Header */}
      <div className="bg-bg-secondary/60 px-6 py-4 border-b border-border">
        <h3 className="text-base font-semibold text-text-primary font-[--font-lexend]">
          Order Summary
        </h3>
      </div>

      {/* Body */}
      <div className="px-6 py-5 space-y-4">
        <div className="flex items-center justify-between">
          <span className="text-text-secondary text-sm">Plan</span>
          <span className="text-text-primary text-sm font-medium">{tierName}</span>
        </div>

        <div className="flex items-center justify-between">
          <span className="text-text-secondary text-sm">Billing cycle</span>
          <span className="text-text-primary text-sm font-medium">Monthly</span>
        </div>

        <div className="flex items-center justify-between">
          <span className="text-text-secondary text-sm">Price</span>
          <span className="text-text-primary text-sm font-medium">${priceMonthly}/month</span>
        </div>
      </div>

      {/* Footer / Total */}
      <div className="bg-bg-secondary/40 px-6 py-4 border-t border-border flex items-center justify-between">
        <span className="text-text-primary font-semibold">Total due today</span>
        <span className="text-lg font-bold text-primary">${priceMonthly}</span>
      </div>
    </Card>
  )
}

export default function PaymentForm({ tierName, priceMonthly, onBack, onSuccess }: PaymentFormProps) {
  const stripe = useStripe()
  const elements = useElements()
  const router = useRouter()
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!stripe || !elements) return

    setError('')
    setLoading(true)

    const { error: confirmError } = await stripe.confirmPayment({
      elements,
      confirmParams: {
        // Required for redirect-based methods (3DS, some bank payments).
        // For card and Apple/Google Pay this URL is never visited.
        return_url: `${window.location.origin}/member/success`,
      },
      // Only redirect when the payment method requires it.
      // Card + Apple Pay + Google Pay resolve the promise directly.
      redirect: 'if_required',
    })

    if (confirmError) {
      setError(confirmError.message ?? 'Payment failed. Please try again.')
      setLoading(false)
      return
    }

    // Payment confirmed without redirect — advance wizard or navigate
    if (onSuccess) {
      onSuccess()
    } else {
      router.push('/member/success')
    }
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      {/* Mobile: order summary above payment element */}
      <div className="md:hidden">
        <OrderSummaryCard tierName={tierName} priceMonthly={priceMonthly} />
      </div>

      <div className="grid md:grid-cols-5 gap-8">
        {/* Left col (desktop: 3/5): Stripe PaymentElement + submit */}
        <div className="md:col-span-3 space-y-6">
          {/* Stripe Payment Element — renders card fields, Apple Pay, Google Pay */}
          <PaymentElement
            onLoadError={(e) => {
              console.error('PaymentElement load error:', e.error)
              setError(e.error.message ?? 'Failed to load payment form')
            }}
          />

          {error && (
            <div className="rounded-md bg-destructive/10 border border-destructive/20 p-3">
              <p className="text-sm text-destructive">{error}</p>
            </div>
          )}

          <Button
            type="submit"
            size="lg"
            className="w-full"
            disabled={!stripe || !elements || loading}
          >
            {loading ? 'Processing...' : `Subscribe — $${priceMonthly}/mo`}
          </Button>

          <Button
            type="button"
            variant="ghost"
            size="sm"
            className="w-full"
            onClick={onBack}
          >
            ← Back to plans
          </Button>
        </div>

        {/* Right col (desktop: 2/5): order summary */}
        <div className="hidden md:block md:col-span-2">
          <OrderSummaryCard tierName={tierName} priceMonthly={priceMonthly} />
        </div>
      </div>
    </form>
  )
}

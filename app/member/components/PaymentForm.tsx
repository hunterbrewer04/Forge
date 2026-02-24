// app/member/components/PaymentForm.tsx
// Renders the Stripe PaymentElement inside an already-provided Elements context.
// Parent must wrap this in <Elements stripe={stripePromise} options={{ clientSecret }}>.
'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { useStripe, useElements, PaymentElement } from '@stripe/react-stripe-js'

interface PaymentFormProps {
  tierName: string
  priceMonthly: number
  onBack: () => void
}

export default function PaymentForm({ tierName, priceMonthly, onBack }: PaymentFormProps) {
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

    // Payment confirmed without redirect — navigate to success
    router.push('/member/success')
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      {/* Order summary */}
      <div className="space-y-2">
        <div className="flex items-center justify-between">
          <span className="text-stone-400 text-sm">Plan</span>
          <span className="text-white text-sm font-medium">{tierName}</span>
        </div>
        <div className="flex items-center justify-between">
          <span className="text-stone-400 text-sm">Billed</span>
          <span className="text-white text-sm font-medium">
            ${priceMonthly}/month
          </span>
        </div>
      </div>

      <div className="border-t border-stone-700" />

      {/* Stripe Payment Element — renders card fields, Apple Pay, Google Pay */}
      <PaymentElement />

      {error && (
        <div className="rounded-md bg-red-500/10 border border-red-500/20 p-3">
          <p className="text-sm text-red-400">{error}</p>
        </div>
      )}

      <button
        type="submit"
        disabled={!stripe || !elements || loading}
        className="flex w-full justify-center rounded-xl py-3 px-4 text-sm font-semibold text-white disabled:opacity-50 disabled:cursor-not-allowed"
        style={{ backgroundColor: 'var(--facility-primary)' }}
      >
        {loading ? 'Processing…' : `Subscribe — $${priceMonthly}/mo`}
      </button>

      <button
        type="button"
        onClick={onBack}
        className="w-full text-center text-sm text-stone-500 hover:text-stone-300 transition-colors"
      >
        ← Back to plans
      </button>
    </form>
  )
}

// lib/services/payments.ts
// Client-side service for fetching payment data via API routes

export interface StripeInvoice {
  id: string
  amount_due: number
  amount_paid: number
  currency: string
  status: string | null
  created: number
  period_start: number
  period_end: number
  hosted_invoice_url: string | null
  description: string | null
}

export interface StripePaymentMethod {
  id: string
  type: string
  card?: {
    brand: string
    last4: string
    exp_month: number
    exp_year: number
  }
  is_default: boolean
}

export interface PaymentsSummary {
  invoices: StripeInvoice[]
  paymentMethods: StripePaymentMethod[]
  hasActiveSubscription: boolean
  currentPeriodEnd: number | null
}

export async function fetchPaymentsSummary(): Promise<PaymentsSummary> {
  const [invoicesRes, methodsRes] = await Promise.all([
    fetch('/api/stripe/invoices'),
    fetch('/api/stripe/payment-methods'),
  ])

  const invoicesData = invoicesRes.ok ? await invoicesRes.json() : { invoices: [] }
  const methodsData = methodsRes.ok
    ? await methodsRes.json()
    : { paymentMethods: [], hasActiveSubscription: false, currentPeriodEnd: null }

  return {
    invoices: invoicesData.invoices ?? [],
    paymentMethods: methodsData.paymentMethods ?? [],
    hasActiveSubscription: methodsData.hasActiveSubscription ?? false,
    currentPeriodEnd: methodsData.currentPeriodEnd ?? null,
  }
}

export async function fetchRecentInvoices(limit = 3): Promise<StripeInvoice[]> {
  const res = await fetch(`/api/stripe/invoices?limit=${limit}`)
  if (!res.ok) return []
  const data = await res.json()
  return data.invoices ?? []
}

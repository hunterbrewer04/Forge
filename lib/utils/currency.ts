/** Full precision display: "$1,250.00" */
export function formatCurrency(amount: number): string {
  return amount.toLocaleString('en-US', { style: 'currency', currency: 'USD' })
}

/** Compact chart labels: "$1.2k", "$500" */
export function formatCurrencyCompact(amount: number): string {
  const rounded = Math.round(amount)
  if (rounded >= 1000) return `$${(amount / 1000).toFixed(1)}k`
  return `$${rounded}`
}

/**
 * Converts Stripe cents to dollars.
 * @param cents - Amount in the smallest currency unit (e.g. Stripe's `amount_paid`, `unit_amount`).
 *   Do NOT pass values already in dollars — there is no runtime guard against double-conversion.
 */
export function centsToDollars(cents: number): number {
  return cents / 100
}

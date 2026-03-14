import { eq } from 'drizzle-orm'
import { profiles } from '@/lib/db/schema'
import { stripe } from '@/lib/stripe'
import type { DrizzleInstance } from '../config'

async function getSubscriptionId(db: DrizzleInstance, profileId: string): Promise<string> {
  const profile = await db.query.profiles.findFirst({
    where: eq(profiles.id, profileId),
    columns: { stripeSubscriptionId: true },
  })
  if (!profile?.stripeSubscriptionId) {
    throw new Error('No active subscription found')
  }
  return profile.stripeSubscriptionId
}

export async function cancelSubscription(
  db: DrizzleInstance,
  profileId: string,
  options: { immediate?: boolean } = {}
) {
  const subscriptionId = await getSubscriptionId(db, profileId)

  if (options.immediate) {
    await stripe.subscriptions.cancel(subscriptionId)
  } else {
    await stripe.subscriptions.update(subscriptionId, {
      cancel_at_period_end: true,
    })
  }

  return { success: true }
}

export async function pauseSubscription(db: DrizzleInstance, profileId: string) {
  const subscriptionId = await getSubscriptionId(db, profileId)

  await stripe.subscriptions.update(subscriptionId, {
    pause_collection: { behavior: 'void' },
  })

  return { success: true }
}

export async function resumeSubscription(db: DrizzleInstance, profileId: string) {
  const subscriptionId = await getSubscriptionId(db, profileId)

  await stripe.subscriptions.update(subscriptionId, {
    pause_collection: null,
  })

  return { success: true }
}

export async function issueRefund(chargeId: string, amount?: number) {
  const refund = await stripe.refunds.create({
    charge: chargeId,
    ...(amount ? { amount } : {}),
  })

  return {
    id: refund.id,
    amount: refund.amount,
    status: refund.status,
    created: refund.created,
  }
}

export async function listInvoices(filters: { limit?: number; startingAfter?: string } = {}) {
  const response = await stripe.invoices.list({
    limit: filters.limit || 20,
    ...(filters.startingAfter ? { starting_after: filters.startingAfter } : {}),
  })

  return {
    data: response.data.map(inv => ({
      id: inv.id,
      customer_email: inv.customer_email,
      amount_due: inv.amount_due,
      amount_paid: inv.amount_paid,
      status: inv.status,
      created: inv.created,
      invoice_pdf: inv.invoice_pdf,
      hosted_invoice_url: inv.hosted_invoice_url,
    })),
    has_more: response.has_more,
  }
}

import { eq } from 'drizzle-orm'
import { trainerClients, profiles, membershipTiers } from '@/lib/db/schema'
import type { DrizzleInstance } from '../config'
import type { TrainerEarnings, TrainerClientItem } from '../types'

export async function getTrainerEarnings(
  db: DrizzleInstance,
  trainerId: string
): Promise<TrainerEarnings> {
  const rows = await db
    .select({
      id: profiles.id,
      fullName: profiles.fullName,
      avatarUrl: profiles.avatarUrl,
      membershipStatus: profiles.membershipStatus,
      tierName: membershipTiers.name,
      priceMonthly: membershipTiers.priceMonthly,
      assignedAt: trainerClients.assignedAt,
    })
    .from(trainerClients)
    .innerJoin(profiles, eq(trainerClients.clientId, profiles.id))
    .leftJoin(membershipTiers, eq(profiles.membershipTierId, membershipTiers.id))
    .where(eq(trainerClients.trainerId, trainerId))

  const activeClients = rows.filter((r) => r.membershipStatus === 'active')

  const monthlyEarnings = activeClients.reduce(
    (sum, r) => sum + (r.priceMonthly ? Number(r.priceMonthly) : 0),
    0
  )

  const clients: TrainerClientItem[] = rows.map((r) => ({
    id: r.id,
    full_name: r.fullName,
    avatar_url: r.avatarUrl,
    tier_name: r.tierName,
    price_monthly: r.priceMonthly ? Number(r.priceMonthly) : 0,
    membership_status: r.membershipStatus,
    assigned_at: r.assignedAt.toISOString(),
  }))

  clients.sort((a, b) => b.price_monthly - a.price_monthly)

  return {
    monthly_earnings: monthlyEarnings,
    active_clients: activeClients.length,
    avg_per_client: activeClients.length > 0 ? monthlyEarnings / activeClients.length : 0,
    clients,
  }
}

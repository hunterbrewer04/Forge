export interface TrainerEarnings {
  monthly_earnings: number
  active_clients: number
  avg_per_client: number
  clients: TrainerClientItem[]
}

export interface TrainerClientItem {
  id: string
  full_name: string | null
  avatar_url: string | null
  tier_name: string | null
  price_monthly: number
  membership_status: string | null
  assigned_at: string
}

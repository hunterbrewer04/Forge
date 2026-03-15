export interface MonthlyRevenue {
  month: string      // e.g. '2026-01'
  label: string      // e.g. 'Jan'
  amount: number     // dollars
}

export interface TrainerEarningsBase {
  monthly_earnings: number
  active_clients: number
  avg_per_client: number
  clients: TrainerClientItem[]
}

export interface TrainerEarnings extends TrainerEarningsBase {
  revenue_history: MonthlyRevenue[]
}

export interface TrainerClientItem {
  id: string
  full_name: string | null
  avatar_url: string | null
  tier_name: string | null
  price_monthly: number
  membership_status: string | null
  assigned_at: string
  is_complimentary: boolean
}

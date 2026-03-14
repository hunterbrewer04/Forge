// Admin module domain types — canonical definitions for user management and invitations

export const INVITE_ROLES = ['trainer', 'member', 'admin'] as const
export type InviteRole = typeof INVITE_ROLES[number]

export const FILTER_ROLES = ['trainer', 'admin', 'member', 'full_access'] as const
export type FilterRole = typeof FILTER_ROLES[number]

export interface UserListItem {
  id: string
  clerk_user_id: string
  full_name: string | null
  email: string | null
  avatar_url: string | null
  is_trainer: boolean
  is_admin: boolean
  is_member: boolean
  has_full_access: boolean
  membership_status: string | null
  membership_tier: { id: string; name: string } | null
  created_at: string
}

export interface UserDetail extends UserListItem {
  stripe_customer_id: string | null
  stripe_subscription_id: string | null
  updated_at: string
}

export interface RoleUpdate {
  isTrainer?: boolean
  isAdmin?: boolean
  isMember?: boolean
  hasFullAccess?: boolean
}

export interface InviteInput {
  emailAddress: string
  role?: InviteRole
}

export interface InvitationListItem {
  id: string
  email_address: string
  status: string
  created_at: number
  revoked?: boolean
  public_metadata?: Record<string, unknown>
}

export interface UserFilters {
  search?: string
  role?: FilterRole
  limit?: number
  offset?: number
}

export interface PaginatedResponse<T> {
  data: T[]
  total: number
  limit: number
  offset: number
}

// Phase 2: Tier management types

export interface TierListItem {
  id: string
  name: string
  slug: string
  stripe_price_id: string
  stripe_product_id: string | null
  monthly_booking_quota: number
  price_monthly: string
  is_active: boolean
  subscriber_count: number
  created_at: string
  updated_at: string
}

export interface TierInput {
  name: string
  priceMonthly: number
  monthlyBookingQuota: number
}

export interface TierUpdate {
  name?: string
  priceMonthly?: number
  monthlyBookingQuota?: number
  isActive?: boolean
}

// Phase 3: Financial management types

export interface RevenueStats {
  mrr: number
  active_subscriptions: number
  total_members: number
  total_trainers: number
  new_this_month: number
}

export interface CancelOptions {
  immediate?: boolean
}

export interface InvoiceListItem {
  id: string
  customer_email: string | null
  amount_due: number
  amount_paid: number
  status: string | null
  created: number
  invoice_pdf: string | null
  hosted_invoice_url: string | null
}

export interface RefundInput {
  chargeId: string
  amount?: number
}

// Phase 4: Facility settings types

export interface FacilitySettings {
  id: string
  name: string
  logo_url: string | null
  primary_color: string
  business_hours: Record<string, { open: string; close: string }> | null
  booking_advance_notice: number | null
  cancellation_window: number | null
  notification_preferences: Record<string, boolean> | null
  created_at: string
  updated_at: string
}

export interface SettingsUpdate {
  name?: string
  primary_color?: string
  business_hours?: Record<string, { open: string; close: string }>
  booking_advance_notice?: number
  cancellation_window?: number
  notification_preferences?: Record<string, boolean>
}

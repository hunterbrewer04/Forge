'use client'

import GlassCard from '@/components/ui/GlassCard'
import { motion } from 'framer-motion'
import { staggerContainer, fadeUpItem } from '@/lib/motion'
import { TrendingUp, Users, BarChart2 } from '@/components/ui/icons'
import { useTrainerEarnings } from '@/lib/hooks/useTrainerEarnings'
import type { TrainerClientItem } from '@/modules/trainer/types'

function GradientStatCard({
  label,
  value,
  sub,
  icon: Icon,
  gradient,
}: {
  label: string
  value: string
  sub: string
  icon: React.ComponentType<{ size: number; className?: string }>
  gradient: string
}) {
  return (
    <motion.div
      variants={fadeUpItem}
      className="relative overflow-hidden rounded-2xl p-5 text-white"
      style={{ background: gradient }}
    >
      <div className="absolute inset-0 rounded-2xl opacity-[0.08]" style={{ background: 'radial-gradient(circle at top right, white, transparent 70%)' }} />
      <div className="relative z-10">
        <div className="flex items-center justify-between mb-3">
          <span className="text-xs font-medium opacity-80">{label}</span>
          <div className="size-9 rounded-full bg-white/15 flex items-center justify-center">
            <Icon size={16} className="text-white" />
          </div>
        </div>
        <div className="text-[28px] font-extrabold leading-none" style={{ fontFamily: 'var(--font-display, Lexend, sans-serif)' }}>
          {value}
        </div>
        <div className="text-xs opacity-70 mt-1">{sub}</div>
      </div>
    </motion.div>
  )
}

function EarningsChart({ monthlyEarnings }: { monthlyEarnings: number }) {
  // Placeholder: all bars show current MRR with progressive opacity
  const months = ['Oct', 'Nov', 'Dec', 'Jan', 'Feb', 'Mar']
  const opacities = [0.2, 0.3, 0.4, 0.3, 0.5, 1]

  return (
    <GlassCard variant="subtle" className="p-5 mb-4">
      <h3 className="text-sm font-bold text-text-primary mb-4">Earnings Over Time</h3>
      <div className="flex items-end justify-center gap-1.5 h-[120px] pb-6">
        {months.map((month, i) => {
          const isCurrentMonth = i === months.length - 1
          const height = `${40 + opacities[i] * 60}%`
          return (
            <div key={month} className="relative flex flex-col items-center" style={{ height: '100%' }}>
              <div
                className="w-8 rounded-t-md relative"
                style={{
                  height,
                  background: isCurrentMonth
                    ? 'linear-gradient(180deg, var(--facility-primary, #E8923A), #c06b1a)'
                    : `rgba(232, 146, 58, ${opacities[i]})`,
                  marginTop: 'auto',
                }}
              >
                <span
                  className="absolute -top-5 left-1/2 -translate-x-1/2 text-[10px] font-bold whitespace-nowrap"
                  style={{ color: isCurrentMonth ? 'var(--facility-primary, #E8923A)' : 'var(--text-muted)' }}
                >
                  ${monthlyEarnings >= 1000 ? `${(monthlyEarnings / 1000).toFixed(1)}k` : monthlyEarnings.toFixed(0)}
                </span>
              </div>
              <span className="absolute -bottom-5 text-[10px] text-text-muted" style={{ fontWeight: isCurrentMonth ? 700 : 400 }}>
                {month}
              </span>
            </div>
          )
        })}
      </div>
    </GlassCard>
  )
}

function ClientRow({ client }: { client: TrainerClientItem }) {
  const initials = (client.full_name || '?')
    .split(' ')
    .map((w) => w[0])
    .join('')
    .toUpperCase()
    .slice(0, 2)

  const gradients = [
    'linear-gradient(135deg, #E8923A, #c06b1a)',
    'linear-gradient(135deg, #3b82f6, #1d4ed8)',
    'linear-gradient(135deg, #8b5cf6, #6d28d9)',
    'linear-gradient(135deg, #059669, #047857)',
    'linear-gradient(135deg, #ef4444, #dc2626)',
  ]
  const gradient = gradients[client.id.charCodeAt(0) % gradients.length]
  const isActive = client.membership_status === 'active'

  return (
    <div className="flex items-center gap-3.5 py-3.5 border-b border-border-light last:border-b-0">
      <div
        className="size-10 rounded-full flex items-center justify-center text-white text-xs font-bold shrink-0"
        style={{ background: gradient }}
      >
        {initials}
      </div>
      <div className="flex-1 min-w-0">
        <p className="text-sm font-semibold text-text-primary truncate">{client.full_name || 'Unnamed'}</p>
        <p className="text-xs text-text-secondary truncate">
          {client.tier_name || 'No plan'} · Since {new Date(client.assigned_at).toLocaleDateString('en-US', { month: 'short', year: 'numeric' })}
        </p>
      </div>
      <div className="text-right shrink-0">
        <p className="text-sm font-bold text-text-primary" style={{ fontFamily: 'var(--font-display, Lexend, sans-serif)' }}>
          ${client.price_monthly}/mo
        </p>
        <p className={`text-[10px] font-bold uppercase tracking-wide ${isActive ? 'text-success' : 'text-text-muted'}`}>
          {isActive ? 'Active' : client.membership_status || 'Inactive'}
        </p>
      </div>
    </div>
  )
}

export default function TrainerEarningsView() {
  const { earnings, isLoading } = useTrainerEarnings()

  if (isLoading) {
    return (
      <div className="space-y-4">
        <div className="grid grid-cols-2 lg:grid-cols-3 gap-4">
          {[1, 2, 3].map((i) => (
            <div key={i} className="h-[120px] rounded-2xl bg-bg-secondary animate-pulse" />
          ))}
        </div>
        <div className="h-[200px] rounded-2xl bg-bg-secondary animate-pulse" />
      </div>
    )
  }

  return (
    <div>
      {/* Stat Cards */}
      <motion.div
        variants={staggerContainer}
        initial="hidden"
        animate="show"
        className="grid grid-cols-2 lg:grid-cols-3 gap-4 mb-6"
      >
        <GradientStatCard
          label="Monthly Earnings"
          value={`$${earnings.monthly_earnings.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`}
          sub={earnings.active_clients > 0 ? `From ${earnings.active_clients} active clients` : 'No active clients'}
          icon={TrendingUp}
          gradient="linear-gradient(135deg, #E8923A, #c06b1a)"
        />
        <GradientStatCard
          label="Active Clients"
          value={String(earnings.active_clients)}
          sub={`${earnings.clients.length} total assigned`}
          icon={Users}
          gradient="linear-gradient(135deg, #111418, #2a3040)"
        />
        <GradientStatCard
          label="Avg. Per Client"
          value={`$${earnings.avg_per_client.toFixed(2)}`}
          sub="Per active client"
          icon={BarChart2}
          gradient="linear-gradient(135deg, #059669, #047857)"
        />
      </motion.div>

      {/* Earnings Chart */}
      <EarningsChart monthlyEarnings={earnings.monthly_earnings} />

      {/* Client Revenue Breakdown */}
      <GlassCard variant="subtle" className="p-5">
        <div className="flex items-center justify-between mb-3">
          <h3 className="text-sm font-bold text-text-primary">Client Revenue Breakdown</h3>
          <span className="text-[10px] font-bold uppercase tracking-wider px-2.5 py-1 rounded-full bg-[var(--facility-primary,#E8923A)]/10 text-[var(--facility-primary,#E8923A)]">
            {earnings.active_clients} active
          </span>
        </div>
        {earnings.clients.length === 0 ? (
          <div className="text-center py-8 text-text-muted">
            <Users size={40} className="mx-auto mb-2 opacity-50" />
            <p className="text-sm">No clients assigned yet</p>
          </div>
        ) : (
          earnings.clients.map((client) => (
            <ClientRow key={client.id} client={client} />
          ))
        )}
      </GlassCard>
    </div>
  )
}

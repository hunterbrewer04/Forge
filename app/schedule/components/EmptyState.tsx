'use client'

import { Calendar, Clock, Filter } from '@/components/ui/icons'

type EmptyVariant = 'no-sessions-date' | 'no-sessions' | 'history-empty' | 'filter-empty'

interface EmptyStateProps {
  variant: EmptyVariant
  dateLabel?: string // For 'no-sessions-date' variant
  filterLabel?: string // For 'filter-empty' variant
}

export default function EmptyState({ variant, dateLabel, filterLabel }: EmptyStateProps) {
  const getContent = () => {
    switch (variant) {
      case 'no-sessions-date':
        return {
          icon: Calendar,
          title: `No sessions on ${dateLabel || 'this date'}`,
          subtitle: 'Check other dates or contact your trainer',
        }
      case 'no-sessions':
        return {
          icon: Calendar,
          title: 'No sessions available',
          subtitle: 'Check back soon — new sessions are added regularly',
        }
      case 'history-empty':
        return {
          icon: Clock,
          title: 'No training history yet',
          subtitle: 'Your training history appears after your first session',
        }
      case 'filter-empty':
        return {
          icon: Filter,
          title: `No ${filterLabel || ''} sessions found`,
          subtitle: 'Try selecting a different filter',
        }
    }
  }

  const content = getContent()
  const Icon = content.icon

  return (
    <div className="flex flex-col items-center justify-center py-12">
      <div className="w-16 h-16 rounded-2xl bg-white/5 border border-white/5 flex items-center justify-center mb-4">
        <Icon className="w-7 h-7 text-stone-500" />
      </div>
      <p className="text-base font-medium text-stone-300 mb-2">{content.title}</p>
      <p className="text-sm text-stone-500 max-w-[250px] text-center">{content.subtitle}</p>

      {/* Decorative dots */}
      <div className="flex gap-1.5 mt-4">
        <div className="w-1.5 h-1.5 rounded-full bg-white/10" />
        <div className="w-1.5 h-1.5 rounded-full bg-white/10" />
        <div className="w-1.5 h-1.5 rounded-full bg-white/10" />
      </div>
    </div>
  )
}

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
      <div className="w-12 h-12 rounded-full bg-gray-800 flex items-center justify-center mb-3">
        <Icon className="w-6 h-6 text-gray-500" />
      </div>
      <p className="text-gray-400 font-medium">{content.title}</p>
      <p className="text-gray-500 text-sm mt-1">{content.subtitle}</p>
    </div>
  )
}

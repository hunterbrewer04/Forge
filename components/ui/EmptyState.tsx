import { Calendar } from '@/components/ui/icons'
import type { LucideIcon } from '@/components/ui/icons'

interface EmptyStateProps {
  icon?: LucideIcon
  title: string
  description?: string
  actionLabel?: string
  actionHref?: string
}

export default function EmptyState({
  icon: Icon = Calendar,
  title,
  description,
  actionLabel,
  actionHref,
}: EmptyStateProps) {
  return (
    <div className="flex flex-col items-center justify-center py-12 text-center">
      <div className="w-14 h-14 bg-stone-800 rounded-full flex items-center justify-center mb-4">
        <Icon size={28} strokeWidth={1.5} className="text-stone-400" />
      </div>
      <h3 className="text-white font-semibold mb-1">{title}</h3>
      {description && (
        <p className="text-stone-400 text-sm max-w-[240px]">{description}</p>
      )}
      {actionLabel && actionHref && (
        <a
          href={actionHref}
          className="mt-4 px-5 py-2.5 bg-[#ff6714] text-white text-sm font-semibold rounded-lg hover:bg-orange-600 transition-colors"
        >
          {actionLabel}
        </a>
      )}
    </div>
  )
}

'use client'

interface SessionFiltersProps {
  filters: { key: string; label: string }[]
  activeFilter: string
  onFilterChange: (key: string) => void
}

export default function SessionFilters({
  filters,
  activeFilter,
  onFilterChange,
}: SessionFiltersProps) {
  return (
    <div className="overflow-x-auto no-scrollbar flex gap-3 -mx-4 px-4">
      {filters.map((filter) => {
        const isActive = activeFilter === filter.key

        return (
          <button
            key={filter.key}
            onClick={() => onFilterChange(filter.key)}
            className={`
              flex-shrink-0 px-4 py-2 rounded-full text-sm font-medium
              whitespace-nowrap active:scale-95 transition-all
              ${
                isActive
                  ? 'bg-primary text-white shadow-md shadow-primary/25 font-bold'
                  : 'bg-surface-mid border border-white/10 text-stone-400 hover:text-white hover:border-white/20'
              }
            `}
          >
            {filter.label}
          </button>
        )
      })}
    </div>
  )
}

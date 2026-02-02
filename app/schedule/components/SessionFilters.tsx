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
              whitespace-nowrap transition-colors
              ${
                isActive
                  ? 'bg-primary text-white shadow-md shadow-primary/20 font-bold'
                  : 'bg-surface-dark border border-gray-700 text-gray-300'
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

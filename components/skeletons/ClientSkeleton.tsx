export function ClientItemSkeleton() {
  return (
    <div className="flex items-center gap-3 p-3 rounded-xl animate-pulse">
      <div className="size-12 rounded-full bg-bg-secondary shrink-0" />
      <div className="flex-1 min-w-0 space-y-2">
        <div className="h-4 bg-bg-secondary rounded w-32" />
        <div className="h-3 bg-bg-secondary rounded w-24" />
      </div>
      <div className="h-5 w-5 bg-bg-secondary rounded" />
    </div>
  )
}

export function ClientListSkeleton() {
  return (
    <div className="space-y-1">
      {Array.from({ length: 6 }).map((_, i) => (
        <ClientItemSkeleton key={i} />
      ))}
    </div>
  )
}

export function ClientDetailSkeleton() {
  return (
    <div className="space-y-6 animate-pulse">
      {/* Avatar + name */}
      <div className="flex flex-col items-center gap-3">
        <div className="size-24 rounded-full bg-bg-secondary" />
        <div className="h-6 bg-bg-secondary rounded w-40" />
        <div className="h-4 bg-bg-secondary rounded w-28" />
      </div>

      {/* Info cards */}
      <div className="space-y-3">
        {Array.from({ length: 3 }).map((_, i) => (
          <div key={i} className="bg-bg-card border border-border rounded-xl p-4">
            <div className="h-3 bg-bg-secondary rounded w-20 mb-2" />
            <div className="h-5 bg-bg-secondary rounded w-48" />
          </div>
        ))}
      </div>
    </div>
  )
}

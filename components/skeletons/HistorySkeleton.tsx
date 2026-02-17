export function HistorySkeleton() {
  return (
    <div className="space-y-3 animate-pulse">
      {/* Month picker skeleton */}
      <div className="flex items-center justify-between py-2">
        <div className="size-8 bg-bg-secondary rounded-lg" />
        <div className="h-5 bg-bg-secondary rounded w-36" />
        <div className="size-8 bg-bg-secondary rounded-lg" />
      </div>

      {/* History items */}
      {[1, 2, 3, 4, 5].map((i) => (
        <div
          key={i}
          className="flex items-center gap-3 bg-bg-card border border-border rounded-xl p-4"
        >
          <div className="size-10 rounded-full bg-bg-secondary shrink-0" />
          <div className="flex-1 min-w-0 space-y-2">
            <div className="h-4 bg-bg-secondary rounded w-3/4" />
            <div className="h-3 bg-bg-secondary rounded w-1/2" />
          </div>
          <div className="h-6 w-20 bg-bg-secondary rounded-full" />
        </div>
      ))}
    </div>
  )
}

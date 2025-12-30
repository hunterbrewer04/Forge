export function ScheduleSkeleton() {
  return (
    <div className="space-y-6 animate-pulse">
      {/* Navigation Tabs */}
      <div className="flex gap-6 -mt-2">
        <div className="h-8 bg-stone-700 rounded w-20" />
        <div className="h-8 bg-stone-800 rounded w-16" />
      </div>

      {/* Next Up Card */}
      <div className="bg-surface-dark rounded-lg p-4 border-l-4 border-primary/30 flex justify-between items-center">
        <div className="space-y-2">
          <div className="h-3 bg-primary/30 rounded w-16" />
          <div className="h-5 bg-stone-700 rounded w-32" />
          <div className="h-3 bg-stone-800 rounded w-40" />
        </div>
        <div className="h-8 bg-stone-700 rounded w-24" />
      </div>

      {/* Calendar Strip */}
      <div>
        <div className="flex items-center justify-between mb-3">
          <div className="h-5 bg-stone-700 rounded w-32" />
          <div className="flex gap-2">
            <div className="size-6 bg-stone-800 rounded" />
            <div className="size-6 bg-stone-800 rounded" />
          </div>
        </div>
        <div className="flex gap-3 overflow-x-auto pb-2 -mx-4 px-4">
          {[...Array(7)].map((_, i) => (
            <div
              key={i}
              className={`flex-shrink-0 flex flex-col items-center justify-center w-14 h-20 rounded-lg ${
                i === 0 ? 'bg-primary/30' : 'bg-surface-dark border border-gray-700'
              }`}
            >
              <div className="h-3 bg-stone-700 rounded w-8 mb-2" />
              <div className="h-5 bg-stone-700 rounded w-6" />
            </div>
          ))}
        </div>
      </div>

      {/* Session Type Filters */}
      <div className="flex gap-3 overflow-x-auto -mx-4 px-4">
        <div className="h-9 bg-primary/30 rounded-full w-24" />
        <div className="h-9 bg-surface-dark border border-gray-700 rounded-full w-16" />
        <div className="h-9 bg-surface-dark border border-gray-700 rounded-full w-20" />
        <div className="h-9 bg-surface-dark border border-gray-700 rounded-full w-24" />
      </div>

      {/* Session List */}
      <div className="space-y-4 pb-6">
        <SessionCardSkeleton />
        <SessionCardSkeleton isPremium />
        <SessionCardSkeleton />
        <SessionCardSkeleton />
      </div>
    </div>
  )
}

function SessionCardSkeleton({ isPremium = false }: { isPremium?: boolean }) {
  return (
    <div
      className={`rounded-xl p-4 border ${
        isPremium
          ? 'bg-gradient-to-r from-surface-dark to-[#3a3a1a] border-gold/30'
          : 'bg-surface-dark border-gray-800'
      }`}
    >
      <div className="flex items-start gap-4">
        <div className="flex flex-col items-center gap-1 min-w-[3.5rem]">
          <div className={`h-5 rounded w-12 ${isPremium ? 'bg-gold/30' : 'bg-stone-700'}`} />
          <div className="h-3 bg-stone-800 rounded w-8" />
        </div>
        <div className="flex-1 space-y-3">
          <div className={`h-5 rounded w-32 ${isPremium ? 'bg-gold/30' : 'bg-stone-700'}`} />
          <div className="flex items-center gap-2">
            <div className="h-5 bg-stone-800 rounded w-16" />
            <div className={`h-3 rounded w-20 ${isPremium ? 'bg-gold/30' : 'bg-primary/30'}`} />
          </div>
          <div className="flex items-center gap-2">
            <div className="size-6 rounded-full bg-stone-700" />
            <div className="h-3 bg-stone-700 rounded w-24" />
          </div>
        </div>
        <div className={`size-10 rounded-lg ${isPremium ? 'bg-gold/30' : 'bg-stone-700'}`} />
      </div>
    </div>
  )
}

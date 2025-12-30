export function StatsCardSkeleton() {
  return (
    <div className="bg-gradient-to-br from-[#2a2a2a] to-[#202020] border border-steel/30 rounded-xl p-4 animate-pulse">
      <div className="h-3 bg-stone-700 rounded w-20 mb-3" />
      <div className="flex items-baseline gap-1">
        <div className="h-8 bg-stone-700 rounded w-12" />
        <div className="h-4 bg-stone-800 rounded w-8" />
      </div>
    </div>
  )
}

export function QuickActionSkeleton({ isPrimary = false }: { isPrimary?: boolean }) {
  return (
    <div
      className={`rounded-xl p-5 min-h-[140px] animate-pulse ${
        isPrimary
          ? 'bg-primary/30'
          : 'bg-[#2a2a2a] border border-steel/30'
      }`}
    >
      <div className="size-12 rounded-lg bg-stone-700 mb-4" />
      <div className="h-5 bg-stone-700 rounded w-24 mb-2" />
      <div className="h-3 bg-stone-800 rounded w-16" />
    </div>
  )
}

export function ActivityItemSkeleton() {
  return (
    <div className="flex items-center gap-4 bg-[#23160f] border border-steel/20 p-4 rounded-xl animate-pulse">
      <div className="size-12 rounded-full bg-stone-700 shrink-0" />
      <div className="flex-1 space-y-2">
        <div className="h-4 bg-stone-700 rounded w-40" />
        <div className="h-3 bg-stone-800 rounded w-32" />
      </div>
      <div className="h-4 bg-primary/30 rounded w-16" />
    </div>
  )
}

export function HomePageSkeleton() {
  return (
    <div className="space-y-6">
      {/* Hero Section */}
      <section className="flex flex-col gap-1 animate-pulse">
        <div className="h-12 bg-stone-800 rounded w-64 mb-1" />
        <div className="h-12 bg-stone-800 rounded w-56 mb-1" />
        <div className="h-12 bg-stone-800 rounded w-48" />
        <div className="h-4 bg-stone-800 rounded w-48 mt-2" />
      </section>

      {/* Stats Cards */}
      <section className="grid grid-cols-2 gap-3">
        <StatsCardSkeleton />
        <StatsCardSkeleton />
      </section>

      {/* Quick Actions Grid */}
      <section className="grid grid-cols-2 gap-3">
        <QuickActionSkeleton isPrimary />
        <QuickActionSkeleton />
        <QuickActionSkeleton />
        <QuickActionSkeleton />
      </section>

      {/* Recent Activity */}
      <section className="flex flex-col gap-3 pb-6">
        <div className="flex items-center justify-between px-1">
          <div className="h-5 bg-stone-800 rounded w-32" />
          <div className="h-4 bg-stone-800 rounded w-16" />
        </div>
        <div className="flex flex-col gap-3">
          <ActivityItemSkeleton />
          <ActivityItemSkeleton />
        </div>
      </section>
    </div>
  )
}

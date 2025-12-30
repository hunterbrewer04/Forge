export function ProfileSkeleton() {
  return (
    <div className="space-y-6 animate-pulse">
      {/* Profile Header */}
      <section className="flex flex-col items-center pt-2 pb-2">
        {/* Avatar */}
        <div className="relative mb-4">
          <div className="size-32 rounded-full bg-stone-700" />
        </div>
        {/* Name and badge */}
        <div className="text-center space-y-2">
          <div className="h-7 bg-stone-700 rounded w-40 mx-auto" />
          <div className="h-4 bg-stone-800 rounded w-28 mx-auto" />
          <div className="h-3 bg-stone-800 rounded w-32 mx-auto" />
        </div>
      </section>

      {/* Stats Dashboard */}
      <section>
        <div className="grid grid-cols-3 gap-3">
          <div className="flex flex-col items-center justify-center p-3 rounded-xl bg-surface-dark border border-white/5">
            <div className="size-6 bg-stone-700 rounded mb-2" />
            <div className="h-6 bg-stone-700 rounded w-8 mb-1" />
            <div className="h-2 bg-stone-800 rounded w-12" />
          </div>
          <div className="flex flex-col items-center justify-center p-3 rounded-xl bg-gradient-to-br from-primary/20 to-surface-dark border border-primary/30">
            <div className="size-6 bg-primary/30 rounded mb-2" />
            <div className="h-6 bg-primary/30 rounded w-8 mb-1" />
            <div className="h-2 bg-primary/20 rounded w-12" />
          </div>
          <div className="flex flex-col items-center justify-center p-3 rounded-xl bg-surface-dark border border-white/5">
            <div className="size-6 bg-stone-700 rounded mb-2" />
            <div className="h-6 bg-stone-700 rounded w-8 mb-1" />
            <div className="h-2 bg-stone-800 rounded w-12" />
          </div>
        </div>
      </section>

      {/* Settings Groups */}
      <section className="mt-2">
        <div className="h-3 bg-stone-800 rounded w-16 mb-3" />
        <div className="flex flex-col -mx-4">
          <SettingsItemSkeleton />
          <SettingsItemSkeleton />
        </div>
      </section>

      <section className="mt-4">
        <div className="h-3 bg-stone-800 rounded w-20 mb-3" />
        <div className="flex flex-col -mx-4">
          <SettingsItemSkeleton />
          <SettingsItemSkeleton />
        </div>
      </section>

      <section className="mt-4 mb-8">
        <div className="h-3 bg-stone-800 rounded w-16 mb-3" />
        <div className="flex flex-col -mx-4">
          <SettingsItemSkeleton />
          {/* Logout button skeleton */}
          <div className="px-4 mt-6">
            <div className="h-14 bg-stone-800 rounded-lg w-full" />
          </div>
        </div>
      </section>
    </div>
  )
}

function SettingsItemSkeleton() {
  return (
    <div className="flex items-center gap-4 px-4 py-4">
      <div className="size-10 rounded-lg bg-stone-700 shrink-0" />
      <div className="flex-1 space-y-1">
        <div className="h-4 bg-stone-700 rounded w-36" />
        <div className="h-3 bg-stone-800 rounded w-28" />
      </div>
      <div className="size-6 bg-stone-800 rounded" />
    </div>
  )
}

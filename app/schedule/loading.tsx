import { ScheduleSkeleton } from '@/components/skeletons'

export default function ScheduleLoading() {
  return (
    <div className="min-h-screen bg-background-dark">
      {/* Top bar skeleton */}
      <header className="sticky top-0 z-50 bg-background-dark/95 backdrop-blur-md border-b border-white/5">
        <div className="flex items-center justify-between px-4 py-3 pt-safe-top animate-pulse">
          <div className="h-6 bg-stone-700 rounded w-36" />
          <div className="flex gap-2 items-center">
            <div className="size-10 rounded-full bg-stone-800" />
            <div className="size-8 rounded-full bg-stone-700" />
          </div>
        </div>
      </header>

      {/* Main content */}
      <main className="px-4 py-6 pb-24">
        <ScheduleSkeleton />
      </main>

      {/* Bottom nav skeleton */}
      <nav className="fixed bottom-0 left-0 right-0 bg-background-dark/95 backdrop-blur-md border-t border-white/10 pb-safe-bottom">
        <div className="flex items-center justify-around py-3 animate-pulse">
          <div className="size-6 bg-stone-800 rounded" />
          <div className="size-6 bg-stone-700 rounded" />
          <div className="size-6 bg-stone-800 rounded" />
          <div className="size-6 bg-stone-800 rounded" />
        </div>
      </nav>

      {/* FAB skeleton */}
      <div className="fixed bottom-24 right-4 w-12 h-12 bg-primary/30 rounded-full animate-pulse" />
    </div>
  )
}

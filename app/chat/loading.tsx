import { ConversationListSkeleton, MessageListSkeleton } from '@/components/skeletons'

export default function ChatLoading() {
  return (
    <div className="min-h-screen bg-background-dark">
      {/* Mobile view */}
      <div className="lg:hidden flex flex-col h-screen">
        {/* Header skeleton */}
        <header className="flex-none bg-background-dark sticky top-0 z-50 border-b border-white/10 px-4 pt-safe-top pb-4">
          <div className="flex items-center justify-between animate-pulse">
            <div className="flex items-center gap-3">
              <div className="size-11 rounded-full bg-stone-800" />
              <div className="h-7 bg-stone-700 rounded w-24" />
            </div>
            <div className="flex items-center gap-2">
              <div className="size-11 rounded-full bg-stone-800" />
              <div className="size-11 rounded-full bg-primary/30" />
            </div>
          </div>

          {/* Search bar skeleton */}
          <div className="mt-4">
            <div className="h-12 bg-surface-elevated rounded-lg" />
          </div>
        </header>

        {/* Conversation list skeleton */}
        <ConversationListSkeleton />
      </div>

      {/* Desktop view */}
      <div className="hidden lg:flex h-screen">
        {/* Sidebar */}
        <div className="w-80 border-r border-stone-800 flex flex-col">
          <div className="p-4 border-b border-stone-800 animate-pulse">
            <div className="h-10 bg-stone-700 rounded" />
          </div>
          <ConversationListSkeleton />
        </div>

        {/* Chat window skeleton */}
        <div className="flex-1 flex flex-col">
          {/* Chat header */}
          <div className="flex-none px-4 py-3 border-b border-white/10 animate-pulse">
            <div className="flex items-center gap-3">
              <div className="size-10 rounded-full bg-stone-700" />
              <div className="space-y-1">
                <div className="h-4 bg-stone-700 rounded w-32" />
                <div className="h-3 bg-stone-800 rounded w-16" />
              </div>
            </div>
          </div>

          {/* Messages area */}
          <MessageListSkeleton />

          {/* Input skeleton */}
          <div className="flex-none p-4 border-t border-white/10 animate-pulse">
            <div className="flex items-center gap-3">
              <div className="size-10 rounded-full bg-stone-800" />
              <div className="flex-1 h-12 bg-stone-800 rounded-full" />
              <div className="size-10 rounded-full bg-primary/30" />
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}

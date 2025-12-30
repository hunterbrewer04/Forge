export function ConversationSkeleton({ isPinned = false }: { isPinned?: boolean }) {
  return (
    <div
      className={`flex items-center p-3 animate-pulse ${
        isPinned
          ? 'rounded-xl bg-[#262626] border border-white/5 mb-3'
          : 'rounded-xl border-b border-white/5'
      }`}
    >
      {/* Avatar */}
      <div
        className={`rounded-full bg-stone-700 shrink-0 ${
          isPinned ? 'size-14' : 'size-12'
        }`}
      />

      {/* Content */}
      <div className="ml-4 flex-1 space-y-2">
        <div className="flex items-center justify-between">
          <div className="h-4 bg-stone-700 rounded w-32" />
          <div className="h-3 bg-stone-800 rounded w-16" />
        </div>
        <div className="h-3 bg-stone-800 rounded w-48" />
      </div>
    </div>
  )
}

export function ConversationListSkeleton() {
  return (
    <div className="h-full bg-background-dark overflow-y-auto">
      {/* Pinned Section */}
      <div className="px-4 py-4">
        <div className="h-3 w-16 bg-stone-800 rounded mb-3" />
        <ConversationSkeleton isPinned />
      </div>

      {/* Recent Section */}
      <div className="px-4 pb-20">
        <div className="h-3 w-16 bg-stone-800 rounded mb-3" />
        <div className="space-y-1">
          <ConversationSkeleton />
          <ConversationSkeleton />
          <ConversationSkeleton />
          <ConversationSkeleton />
          <ConversationSkeleton />
        </div>
      </div>
    </div>
  )
}

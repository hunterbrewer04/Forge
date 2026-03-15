export function ConversationSkeleton({ isPinned = false }: { isPinned?: boolean }) {
  return (
    <div
      className={`flex items-center p-3 animate-pulse ${
        isPinned
          ? 'rounded-xl bg-bg-card border border-border mb-3'
          : 'rounded-xl border-b border-border-light'
      }`}
    >
      {/* Avatar */}
      <div
        className={`rounded-full bg-bg-secondary shrink-0 ${
          isPinned ? 'size-14' : 'size-12'
        }`}
      />

      {/* Content */}
      <div className="ml-4 flex-1 space-y-2">
        <div className="flex items-center justify-between">
          <div className="h-4 bg-bg-secondary rounded w-32" />
          <div className="h-3 bg-bg-secondary rounded w-16" />
        </div>
        <div className="h-3 bg-bg-secondary rounded w-48" />
      </div>
    </div>
  )
}

export function ConversationListSkeleton() {
  return (
    <div className="h-full bg-bg-primary overflow-y-auto">
      {/* Pinned Section */}
      <div className="px-4 py-4">
        <div className="h-3 w-16 bg-bg-secondary rounded mb-3" />
        <ConversationSkeleton isPinned />
      </div>

      {/* Recent Section */}
      <div className="px-4 pb-20">
        <div className="h-3 w-16 bg-bg-secondary rounded mb-3" />
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

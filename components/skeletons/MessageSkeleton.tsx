export function MessageSkeleton({ isCurrentUser = false }: { isCurrentUser?: boolean }) {
  if (isCurrentUser) {
    return (
      <div className="flex flex-col items-end max-w-[85%] ml-auto animate-pulse">
        <div className="bg-primary/30 p-3 rounded-2xl rounded-br-none w-48 h-16" />
        <div className="flex items-center gap-1 mt-1 mr-1">
          <div className="h-2 w-12 bg-stone-700 rounded" />
        </div>
      </div>
    )
  }

  return (
    <div className="flex gap-3 max-w-[85%] animate-pulse">
      <div className="size-8 rounded-full bg-stone-700 shrink-0 mt-auto mb-1" />
      <div className="flex flex-col gap-1">
        <div className="bg-stone-700 p-3 rounded-2xl rounded-bl-none w-56 h-16" />
        <div className="h-2 w-12 bg-stone-800 rounded ml-1" />
      </div>
    </div>
  )
}

export function MessageListSkeleton() {
  return (
    <div className="flex-1 overflow-y-auto px-4 py-6 space-y-4 bg-background-dark">
      {/* Date separator skeleton */}
      <div className="flex justify-center my-6">
        <div className="h-5 w-32 bg-stone-800 rounded-full" />
      </div>

      {/* Mix of sent and received messages */}
      <MessageSkeleton isCurrentUser={false} />
      <MessageSkeleton isCurrentUser={false} />
      <MessageSkeleton isCurrentUser={true} />
      <MessageSkeleton isCurrentUser={false} />
      <MessageSkeleton isCurrentUser={true} />
      <MessageSkeleton isCurrentUser={true} />
      <MessageSkeleton isCurrentUser={false} />
    </div>
  )
}

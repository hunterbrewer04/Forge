'use client'

const REACTIONS = ['👍', '❤️', '😂', '😮', '😢', '🔥']

interface ReactionBarProps {
  onReact: (emoji: string) => void
  onClose: () => void
}

export default function ReactionBar({ onReact, onClose }: ReactionBarProps) {
  return (
    <div className="flex items-center gap-1 px-2 py-1.5 bg-bg-card/90 backdrop-blur-sm border border-border rounded-2xl shadow-lg">
      {REACTIONS.map((emoji) => (
        <button
          key={emoji}
          type="button"
          onClick={() => {
            onReact(emoji)
            onClose()
          }}
          className="text-xl leading-none p-1.5 rounded-xl hover:bg-bg-secondary active:scale-95 transition-all"
          aria-label={`React with ${emoji}`}
        >
          {emoji}
        </button>
      ))}
    </div>
  )
}

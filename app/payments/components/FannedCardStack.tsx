'use client'

import { useState, useCallback } from 'react'
import { motion } from 'framer-motion'
import DebitCard, { type DebitCardData } from './DebitCard'
import { CreditCard } from '@/components/ui/icons'
import EmptyState from '@/components/ui/EmptyState'

// Position styles for fanned stack
const POSITIONS = [
  { zIndex: 3, rotate: 0, scale: 1, x: 10, y: 0, brightness: 1 },        // front
  { zIndex: 2, rotate: -3, scale: 0.97, x: 0, y: 6, brightness: 0.88 },   // middle
  { zIndex: 1, rotate: -6, scale: 0.94, x: -6, y: 12, brightness: 0.76 }, // back
]

const springTransition = {
  type: 'spring' as const,
  stiffness: 300,
  damping: 25,
}

interface FannedCardStackProps {
  cards: DebitCardData[]
}

export default function FannedCardStack({ cards }: FannedCardStackProps) {
  const [currentFront, setCurrentFront] = useState(0)

  const cycleCards = useCallback(() => {
    if (cards.length <= 1) return
    setCurrentFront((prev) => (prev + 1) % cards.length)
  }, [cards.length])

  // Empty state
  if (cards.length === 0) {
    return <EmptyState icon={CreditCard} title="No payment methods on file" />
  }

  return (
    <div>
      {/* Header */}
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-sm font-bold text-text-primary">Your Cards</h3>
        {cards.length > 1 && (
          <span className="text-xs text-text-muted font-semibold">
            {currentFront + 1} of {cards.length}
          </span>
        )}
      </div>

      {/* Stack */}
      <div
        className="relative h-[220px] w-full max-w-[340px] mx-auto cursor-pointer"
        onClick={cycleCards}
        role="button"
        tabIndex={0}
        onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') cycleCards() }}
        aria-label="Cycle through payment cards"
      >
        {cards.map((card, i) => {
          const position = (i - currentFront + cards.length) % cards.length
          const pos = POSITIONS[Math.min(position, POSITIONS.length - 1)]

          return (
            <motion.div
              key={card.id}
              layout
              animate={{
                zIndex: pos.zIndex,
                rotate: pos.rotate,
                scale: pos.scale,
                x: pos.x,
                y: pos.y,
                filter: `brightness(${pos.brightness})`,
              }}
              transition={springTransition}
              className="absolute top-0 left-0"
              style={{ zIndex: pos.zIndex }}
            >
              <DebitCard card={card} showDefault={position === 0} />
            </motion.div>
          )
        })}
      </div>

      {/* Dot indicators */}
      {cards.length > 1 && (
        <div className="flex justify-center gap-2 mt-4">
          {cards.map((_, i) => (
            <button
              key={i}
              onClick={(e) => { e.stopPropagation(); setCurrentFront(i) }}
              className="transition-all duration-300"
              style={{
                width: i === currentFront ? 20 : 8,
                height: 8,
                borderRadius: i === currentFront ? 4 : '50%',
                background: i === currentFront ? 'var(--facility-primary, #E8923A)' : 'var(--border-color, #e5e7eb)',
              }}
              aria-label={`Go to card ${i + 1}`}
            />
          ))}
        </div>
      )}
    </div>
  )
}

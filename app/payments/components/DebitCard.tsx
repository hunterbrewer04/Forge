'use client'

import { motion, type HTMLMotionProps } from 'framer-motion'
import { Wifi } from '@/components/ui/icons'
import { cn } from '@/lib/utils'

// Card brand → gradient mapping
const BRAND_GRADIENTS: Record<string, string> = {
  visa: 'linear-gradient(135deg, #1a1f6e, #2d3a8c)',
  mastercard: 'linear-gradient(135deg, #1c1c1c, #333333)',
  amex: 'linear-gradient(135deg, #006fcf, #0090d9)',
  discover: 'linear-gradient(135deg, #E8923A, #c06b1a)',
}

function CardChip() {
  return (
    <div className="w-10 h-[30px] rounded-md bg-gradient-to-br from-[#d4af37] to-[#c9a227] relative overflow-hidden">
      <div className="absolute top-1/2 left-1 right-1 h-px bg-black/20" />
      <div className="absolute left-1/2 top-1 bottom-1 w-px bg-black/20" />
    </div>
  )
}

function ContactlessIcon() {
  return (
    <Wifi size={20} className="text-white/60 rotate-90" />
  )
}

function BrandLogo({ brand }: { brand: string }) {
  if (brand === 'mastercard') {
    return (
      <div className="flex items-center">
        <div className="size-7 rounded-full bg-[#eb001b]" />
        <div className="size-7 rounded-full bg-[#f79e1b] -ml-2.5 opacity-85" />
      </div>
    )
  }

  const labels: Record<string, string> = {
    visa: 'VISA',
    amex: 'AMEX',
    discover: 'DISCOVER',
  }

  return (
    <span
      className="font-display text-white font-extrabold tracking-wide"
      style={{ fontSize: brand === 'discover' ? '14px' : '18px' }}
    >
      {labels[brand] || brand.toUpperCase()}
    </span>
  )
}

export interface DebitCardData {
  id: string
  brand: string
  last4: string
  exp_month: number
  exp_year: number
  cardholder: string
  is_default: boolean
}

interface DebitCardProps extends Omit<HTMLMotionProps<'div'>, 'children'> {
  card: DebitCardData
  showDefault?: boolean
}

export default function DebitCard({ card, showDefault = true, className, style, ...motionProps }: DebitCardProps) {
  const gradient = BRAND_GRADIENTS[card.brand] || BRAND_GRADIENTS.visa

  return (
    <motion.div
      className={cn(
        'w-[320px] h-[195px] rounded-2xl p-6 text-white relative overflow-hidden shadow-lg',
        className
      )}
      style={{ background: gradient, ...style }}
      {...motionProps}
    >
      {/* Radial highlight */}
      <div className="absolute inset-0 rounded-2xl" style={{ background: 'radial-gradient(circle at 80% 20%, rgba(255,255,255,0.12), transparent 60%)' }} />
      {/* Bottom circle accent */}
      <div className="absolute -bottom-5 -right-5 size-[120px] rounded-full bg-white/[0.04]" />

      {/* Default badge */}
      {showDefault && card.is_default && (
        <div className="absolute top-3 right-4 z-10">
          <span className="text-[9px] font-bold uppercase tracking-wider bg-white/20 backdrop-blur-sm px-2 py-1 rounded-md">
            Default
          </span>
        </div>
      )}

      <div className="relative z-10 h-full flex flex-col justify-between">
        {/* Top: chip + contactless */}
        <div className="flex items-start justify-between">
          <CardChip />
          <ContactlessIcon />
        </div>

        {/* Number */}
        <div className="font-mono text-lg tracking-[3px] font-medium" style={{ textShadow: '0 1px 2px rgba(0,0,0,0.3)' }}>
          •••• •••• •••• {card.last4}
        </div>

        {/* Bottom: holder, expiry, brand */}
        <div className="flex items-end justify-between">
          <div>
            <div className="text-[8px] uppercase tracking-[1.5px] opacity-60 mb-0.5">Card Holder</div>
            <div className="text-[13px] font-semibold tracking-wide">{card.cardholder}</div>
          </div>
          <div>
            <div className="text-[8px] uppercase tracking-[1.5px] opacity-60 mb-0.5">Expires</div>
            <div className="text-[13px] font-semibold">
              {String(card.exp_month).padStart(2, '0')}/{String(card.exp_year).slice(-2)}
            </div>
          </div>
          <BrandLogo brand={card.brand} />
        </div>
      </div>
    </motion.div>
  )
}

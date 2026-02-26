import type { Variants, TargetAndTransition } from 'framer-motion'

/** Parent container – staggers children entrance */
export const staggerContainer: Variants = {
  hidden: {},
  show: {
    transition: {
      staggerChildren: 0.06,
    },
  },
}

/** Child item – fades up into position */
export const fadeUpItem: Variants = {
  hidden: { opacity: 0, y: 12 },
  show: {
    opacity: 1,
    y: 0,
    transition: { duration: 0.35, ease: [0.25, 0.4, 0.25, 1] },
  },
}

/** Hover lift for interactive cards */
export const cardHover: TargetAndTransition = {
  y: -2,
  transition: { duration: 0.2, ease: 'easeOut' },
}

/** Tap press for interactive cards */
export const cardTap: TargetAndTransition = {
  scale: 0.98,
  transition: { duration: 0.1 },
}

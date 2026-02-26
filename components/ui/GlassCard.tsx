'use client';

import { motion, type HTMLMotionProps } from 'framer-motion';
import { cn } from '@/lib/utils';
import { cardHover, cardTap } from '@/lib/motion';

interface GlassCardProps extends Omit<HTMLMotionProps<'div'>, 'children'> {
  variant?: 'default' | 'subtle';
  /** Adds hover-lift + tap-press interaction. Explicit whileHover/whileTap props override. */
  interactive?: boolean;
  children: React.ReactNode;
}

export default function GlassCard({
  variant,
  interactive = false,
  children,
  className,
  whileHover,
  whileTap,
  ...motionProps
}: GlassCardProps) {
  const glassClass = variant === 'subtle' ? 'glass-subtle' : 'glass';

  return (
    <motion.div
      className={cn('rounded-2xl', glassClass, className)}
      whileHover={whileHover ?? (interactive ? cardHover : undefined)}
      whileTap={whileTap ?? (interactive ? cardTap : undefined)}
      {...motionProps}
    >
      {children}
    </motion.div>
  );
}

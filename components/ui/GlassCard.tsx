'use client';

import { motion, type HTMLMotionProps } from 'framer-motion';
import { cn } from '@/lib/utils';

interface GlassCardProps extends Omit<HTMLMotionProps<'div'>, 'children'> {
  variant?: 'default' | 'subtle';
  children: React.ReactNode;
}

export default function GlassCard({
  variant,
  children,
  className,
  ...motionProps
}: GlassCardProps) {
  const glassClass = variant === 'subtle' ? 'glass-subtle' : 'glass';

  return (
    <motion.div
      className={cn('rounded-2xl', glassClass, className)}
      {...motionProps}
    >
      {children}
    </motion.div>
  );
}

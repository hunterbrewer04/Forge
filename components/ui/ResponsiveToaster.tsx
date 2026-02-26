'use client'

import { Toaster } from 'sonner'
import { useIsDesktop } from '@/lib/hooks/useIsDesktop'

export default function ResponsiveToaster() {
  const isDesktop = useIsDesktop()

  if (isDesktop) {
    return (
      <Toaster
        position="bottom-right"
        toastOptions={{
          style: {
            background: 'rgba(255, 255, 255, 0.60)',
            backdropFilter: 'blur(24px) saturate(180%)',
            WebkitBackdropFilter: 'blur(24px) saturate(180%)',
            border: '1px solid rgba(255, 255, 255, 0.20)',
            boxShadow: '0 8px 32px rgba(0, 0, 0, 0.08), inset 0 1px 0 rgba(255, 255, 255, 0.40)',
            color: 'var(--text-primary)',
            borderRadius: '0.75rem',
            width: '356px',
          },
        }}
      />
    )
  }

  return (
    <Toaster
      position="top-center"
      toastOptions={{
        style: {
          background: 'var(--bg-card)',
          border: '1px solid var(--border-color)',
          color: 'var(--text-primary)',
        },
      }}
    />
  )
}

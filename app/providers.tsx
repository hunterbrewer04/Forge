'use client'

import { useEffect } from 'react'
import { AuthProvider } from '@/contexts/AuthContext'
import { registerServiceWorker } from '@/lib/register-sw'

export function Providers({ children }: { children: React.ReactNode }) {
  useEffect(() => {
    registerServiceWorker()
  }, [])

  return <AuthProvider>{children}</AuthProvider>
}

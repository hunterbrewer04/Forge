'use client'

import { useEffect } from 'react'
import { isServer, QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { AuthProvider } from '@/contexts/AuthContext'
import { FacilityThemeProvider } from '@/contexts/FacilityThemeContext'
import { registerServiceWorker } from '@/lib/register-sw'
import MembershipGuard from '@/components/MembershipGuard'

function makeQueryClient() {
  return new QueryClient({
    defaultOptions: {
      queries: {
        // With SSR, set staleTime above 0 to avoid refetching immediately on the client
        staleTime: 60 * 1000, // 1 minute
        gcTime: 5 * 60 * 1000, // 5 minutes
        retry: 2,
        refetchOnWindowFocus: false,
      },
    },
  })
}

let browserQueryClient: QueryClient | undefined = undefined

function getQueryClient() {
  if (isServer) {
    // Server: always make a new query client
    return makeQueryClient()
  } else {
    // Browser: make a new query client if we don't already have one
    // This prevents re-making a client if React suspends during initial render
    if (!browserQueryClient) browserQueryClient = makeQueryClient()
    return browserQueryClient
  }
}

export function Providers({ children }: { children: React.ReactNode }) {
  const queryClient = getQueryClient()

  useEffect(() => {
    registerServiceWorker()
  }, [])

  return (
    <QueryClientProvider client={queryClient}>
      <FacilityThemeProvider>
        <AuthProvider>
          <MembershipGuard>{children}</MembershipGuard>
        </AuthProvider>
      </FacilityThemeProvider>
    </QueryClientProvider>
  )
}

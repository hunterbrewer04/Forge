'use client'

import Ably from 'ably'

let ablyClient: Ably.Realtime | null = null

export function getAblyClient(): Ably.Realtime {
  if (ablyClient) return ablyClient

  ablyClient = new Ably.Realtime({
    authUrl: '/api/ably/auth',
    authMethod: 'GET',
    autoConnect: true,
    disconnectedRetryTimeout: 5000,
    suspendedRetryTimeout: 15000,
  })

  return ablyClient
}

export function closeAblyClient(): void {
  if (ablyClient) {
    ablyClient.close()
    ablyClient = null
  }
}

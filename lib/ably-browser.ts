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

/**
 * Refresh the Ably token to pick up new channel capabilities
 * (e.g., after creating a new conversation).
 */
export async function refreshAblyToken(): Promise<void> {
  if (!ablyClient) return
  await ablyClient.auth.authorize()
}

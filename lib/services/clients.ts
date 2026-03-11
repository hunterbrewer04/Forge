/**
 * Client-side service for trainer client management.
 * Thin fetch wrappers around /api/clients — no direct DB access.
 */

import type { ClientProfileJoin } from '@/lib/types/database'

/**
 * Fetch the list of clients for a trainer.
 * Clients are derived from conversations — any client who has messaged
 * the trainer will appear here.
 *
 * @param _trainerId - Unused (auth context resolved server-side)
 */
export async function fetchTrainerClientList(
  _trainerId: string
): Promise<ClientProfileJoin[]> {
  const res = await fetch('/api/clients')
  if (!res.ok) {
    const err = await res.json().catch(() => ({}))
    throw new Error(err?.error ?? 'Failed to fetch clients')
  }
  const json = await res.json()
  return json.data ?? []
}

/**
 * Fetch a single client's profile detail for a trainer.
 * The server verifies the trainer-client relationship before responding.
 *
 * @param _trainerId - Unused (auth context resolved server-side)
 * @param clientId   - The profile UUID of the client to look up
 */
export async function fetchClientDetail(
  _trainerId: string,
  clientId: string
): Promise<ClientProfileJoin & { conversation_id: string }> {
  const res = await fetch(`/api/clients/${clientId}`)
  if (!res.ok) {
    const err = await res.json().catch(() => ({}))
    throw new Error(err?.error ?? 'Failed to fetch client')
  }
  const json = await res.json()
  return json.data
}

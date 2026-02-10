'use client'

import { useState, useEffect } from 'react'
import { fetchTrainerClientList, fetchClientDetail } from '@/lib/services/clients'
import type { ClientProfileJoin } from '@/lib/types/database'

interface UseClientListResult {
  clients: ClientProfileJoin[]
  loading: boolean
  error: string | null
}

export function useClientList(trainerId: string | undefined): UseClientListResult {
  const [clients, setClients] = useState<ClientProfileJoin[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    if (!trainerId) {
      setLoading(false)
      return
    }

    let cancelled = false

    async function load() {
      try {
        const data = await fetchTrainerClientList(trainerId!)
        if (!cancelled) setClients(data)
      } catch (err) {
        if (!cancelled) {
          setError(err instanceof Error ? err.message : 'Failed to load clients')
        }
      } finally {
        if (!cancelled) setLoading(false)
      }
    }

    load()
    return () => { cancelled = true }
  }, [trainerId])

  return { clients, loading, error }
}

type ClientDetail = ClientProfileJoin & { conversation_id: string }

interface UseClientDetailResult {
  client: ClientDetail | null
  loading: boolean
  error: string | null
}

export function useClientDetail(
  trainerId: string | undefined,
  clientId: string
): UseClientDetailResult {
  const [client, setClient] = useState<ClientDetail | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    if (!trainerId) {
      setLoading(false)
      return
    }

    let cancelled = false

    async function load() {
      try {
        const data = await fetchClientDetail(trainerId!, clientId)
        if (!cancelled) setClient(data)
      } catch (err) {
        if (!cancelled) {
          setError(err instanceof Error ? err.message : 'Client not found')
        }
      } finally {
        if (!cancelled) setLoading(false)
      }
    }

    load()
    return () => { cancelled = true }
  }, [trainerId, clientId])

  return { client, loading, error }
}

'use client'

import { useQuery } from '@tanstack/react-query'
import { fetchTrainerEarnings } from '@/lib/services/trainer-earnings'
import type { TrainerEarnings } from '@/modules/trainer/types'

export function useTrainerEarnings(enabled = true) {
  const { data, isLoading } = useQuery<TrainerEarnings>({
    queryKey: ['trainer-earnings'],
    queryFn: fetchTrainerEarnings,
    staleTime: 60_000,
    enabled,
    retry: 1,
  })

  const earnings: TrainerEarnings = data ?? {
    monthly_earnings: 0,
    active_clients: 0,
    avg_per_client: 0,
    clients: [],
  }

  return { earnings, isLoading }
}

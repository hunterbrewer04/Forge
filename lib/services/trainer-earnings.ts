import type { TrainerEarnings } from '@/modules/trainer/types'

export async function fetchTrainerEarnings(): Promise<TrainerEarnings> {
  const res = await fetch('/api/trainer/earnings')
  if (!res.ok) throw new Error('Failed to load trainer earnings')
  const data = await res.json()
  return data.data
}

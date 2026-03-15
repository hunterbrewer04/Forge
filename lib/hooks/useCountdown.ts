'use client'

import { useState, useEffect } from 'react'

type CountdownStatus = 'upcoming' | 'soon' | 'in-progress'

interface CountdownResult {
  countdown: string
  status: CountdownStatus
}

export function useCountdown(startTime: string): CountdownResult {
  const [result, setResult] = useState<CountdownResult>({ countdown: '', status: 'upcoming' })

  useEffect(() => {
    const update = () => {
      const now = new Date()
      const start = new Date(startTime)
      const diffMs = start.getTime() - now.getTime()

      if (diffMs < 0) {
        setResult({ countdown: 'In progress', status: 'in-progress' })
        return
      }

      const diffMinutes = Math.floor(diffMs / 1000 / 60)

      if (diffMinutes < 5) {
        setResult({ countdown: 'Starting soon', status: 'soon' })
        return
      }

      const diffHours = Math.floor(diffMinutes / 60)
      const diffDays = Math.floor(diffHours / 24)

      let countdown: string
      if (diffDays > 0) {
        countdown = `${diffDays}d ${diffHours % 24}h`
      } else if (diffHours > 0) {
        countdown = `${diffHours}h ${diffMinutes % 60}m`
      } else {
        countdown = `${diffMinutes}m`
      }

      setResult({ countdown, status: 'upcoming' })
    }

    update()
    const interval = setInterval(update, 60000)
    return () => clearInterval(interval)
  }, [startTime])

  return result
}

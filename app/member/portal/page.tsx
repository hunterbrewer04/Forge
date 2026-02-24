'use client'

import { useEffect, useState } from 'react'

export default function MemberPortalPage() {
  const [error, setError] = useState('')

  useEffect(() => {
    fetch('/api/stripe/portal')
      .then((r) => r.json())
      .then((data) => {
        if (data.url) {
          window.location.href = data.url
        } else {
          setError('Could not open billing portal. Please try again.')
        }
      })
      .catch(() => setError('Could not open billing portal. Please try again.'))
  }, [])

  if (error) {
    return (
      <div className="text-center py-16">
        <p className="text-red-400 text-sm">{error}</p>
      </div>
    )
  }

  return (
    <div className="flex justify-center py-16">
      <div className="w-6 h-6 border-2 border-stone-600 border-t-stone-300 rounded-full animate-spin" />
    </div>
  )
}

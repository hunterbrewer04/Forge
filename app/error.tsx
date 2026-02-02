'use client'

import { useEffect } from 'react'

export default function Error({
  error,
  reset,
}: {
  error: Error & { digest?: string }
  reset: () => void
}) {
  useEffect(() => {
    console.error(error)
  }, [error])

  return (
    <div className="min-h-screen flex items-center justify-center bg-[#1C1C1C] px-4">
      <div className="text-center max-w-sm">
        <div className="w-16 h-16 bg-[#ff6714]/20 rounded-full flex items-center justify-center mx-auto mb-6">
          <span className="text-[#ff6714] text-3xl font-bold">!</span>
        </div>
        <h2 className="text-xl font-bold text-white mb-2">Something went wrong</h2>
        <p className="text-stone-400 text-sm mb-6">
          An unexpected error occurred. Please try again.
        </p>
        <button
          onClick={reset}
          className="px-6 py-3 bg-[#ff6714] text-white font-semibold rounded-lg hover:bg-orange-600 transition-colors"
        >
          Try Again
        </button>
      </div>
    </div>
  )
}

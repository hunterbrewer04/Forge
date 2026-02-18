'use client'

import { useState, useRef, useEffect } from 'react'
import { X, Calendar, Copy, RefreshCw, Loader2, ExternalLink } from '@/components/ui/icons'
import { toast } from 'sonner'

interface CalendarExportSheetProps {
  isOpen: boolean
  onClose: () => void
}

type SheetState = 'loading' | 'loaded' | 'error'

export default function CalendarExportSheet({
  isOpen,
  onClose,
}: CalendarExportSheetProps) {
  const [sheetState, setSheetState] = useState<SheetState>('loading')
  const [feedUrl, setFeedUrl] = useState<string>('')
  const [errorMessage, setErrorMessage] = useState<string>('')
  const [translateY, setTranslateY] = useState(0)
  const [touchStartY, setTouchStartY] = useState(0)
  const [isRegenerating, setIsRegenerating] = useState(false)

  const mountedRef = useRef(true)
  const scrollRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    mountedRef.current = true
    return () => {
      mountedRef.current = false
    }
  }, [])

  useEffect(() => {
    if (isOpen) {
      fetchFeedUrl()
    }
  }, [isOpen])

  const fetchFeedUrl = async () => {
    setSheetState('loading')
    setErrorMessage('')

    try {
      const response = await fetch('/api/calendar/token', {
        method: 'GET',
      })

      const data = await response.json()

      if (!response.ok) {
        throw new Error(data.error || 'Failed to get calendar feed')
      }

      if (!mountedRef.current) return

      setFeedUrl(data.feedUrl)
      setSheetState('loaded')
    } catch (error) {
      if (!mountedRef.current) return

      setSheetState('error')
      setErrorMessage(
        error instanceof Error ? error.message : 'Failed to load calendar feed'
      )
    }
  }

  const webcalFeedUrl = feedUrl.replace(/^https?:\/\//, 'webcal://')

  const handleCopyLink = async () => {
    try {
      await navigator.clipboard.writeText(webcalFeedUrl)
      toast.success('Link copied!')
    } catch (error) {
      toast.error('Failed to copy link')
    }
  }

  const handleAddToGoogle = () => {
    const googleUrl = `https://calendar.google.com/calendar/r?cid=${encodeURIComponent(webcalFeedUrl)}`
    window.open(googleUrl, '_blank')
  }

  const handleAddToApple = () => {
    window.location.href = webcalFeedUrl
  }

  const handleRegenerateLink = async () => {
    setIsRegenerating(true)

    try {
      const response = await fetch('/api/calendar/token', {
        method: 'POST',
      })

      const data = await response.json()

      if (!response.ok) {
        throw new Error(data.error || 'Failed to regenerate calendar link')
      }

      if (!mountedRef.current) return

      setFeedUrl(data.feedUrl)
      toast.success('Calendar link regenerated')
    } catch (error) {
      toast.error(
        error instanceof Error
          ? error.message
          : 'Failed to regenerate calendar link'
      )
    } finally {
      if (mountedRef.current) {
        setIsRegenerating(false)
      }
    }
  }

  const handleClose = () => {
    if (sheetState !== 'loading' && !isRegenerating) {
      onClose()
      setTranslateY(0)
      // Reset state after animation
      setTimeout(() => {
        if (!mountedRef.current) return
        setSheetState('loading')
        setFeedUrl('')
        setErrorMessage('')
      }, 300)
    }
  }

  const handleTouchStart = (e: React.TouchEvent) => {
    setTouchStartY(e.touches[0].clientY)
  }

  const handleTouchMove = (e: React.TouchEvent) => {
    const currentY = e.touches[0].clientY
    const delta = currentY - touchStartY
    if (delta > 0 && (!scrollRef.current || scrollRef.current.scrollTop === 0)) {
      setTranslateY(delta)
    }
  }

  const handleTouchEnd = () => {
    if (translateY > 100) {
      handleClose()
    } else {
      setTranslateY(0)
    }
  }

  if (!isOpen) return null

  return (
    <div className="fixed inset-0 z-[70] flex items-end justify-center">
      {/* Backdrop */}
      <div
        className="absolute inset-0 bg-black/70 backdrop-blur-sm"
        onClick={handleClose}
      />

      {/* Sheet Content */}
      <div
        className="relative w-full max-w-md bg-surface-dark rounded-t-2xl animate-slide-up max-h-[85dvh] flex flex-col"
        style={{
          transform: `translateY(${translateY}px)`,
          transition: translateY === 0 ? 'transform 0.3s ease-out' : 'none',
        }}
        onTouchStart={handleTouchStart}
        onTouchMove={handleTouchMove}
        onTouchEnd={handleTouchEnd}
      >
        {/* Header: Drag Handle + Close Button */}
        <div className="px-6 pt-2 shrink-0">
          <div className="flex justify-center pb-3">
            <div className="w-10 h-1 bg-gray-600 rounded-full" />
          </div>
        </div>

        <button
          onClick={handleClose}
          className="absolute top-4 right-4 p-2 text-gray-400 hover:text-white transition-colors z-10"
          disabled={sheetState === 'loading' || isRegenerating}
        >
          <X size={24} />
        </button>

        {/* Loading State */}
        {sheetState === 'loading' && (
          <div className="flex-1 flex flex-col items-center justify-center py-12 px-6 pb-6">
            <Loader2 size={48} className="text-primary animate-spin mb-4" />
            <p className="text-white font-medium">Loading calendar feed...</p>
          </div>
        )}

        {/* Error State */}
        {sheetState === 'error' && (
          <div className="flex-1 flex flex-col items-center justify-center py-12 px-6 pb-6">
            <div className="w-16 h-16 bg-red-500/20 rounded-full flex items-center justify-center mb-4">
              <X size={40} className="text-red-500" />
            </div>
            <h3 className="text-xl font-bold text-white mb-2">Failed to Load</h3>
            <p className="text-gray-400 text-center mb-6">{errorMessage}</p>
            <button
              onClick={fetchFeedUrl}
              className="w-full py-3 px-4 bg-primary text-white font-semibold rounded-lg hover:bg-primary/90 transition-colors"
            >
              Retry
            </button>
          </div>
        )}

        {/* Loaded State */}
        {sheetState === 'loaded' && (
          <>
            {/* Scrollable Body */}
            <div ref={scrollRef} className="flex-1 overflow-y-auto px-6 min-h-0">
              {/* Header */}
              <div className="mb-6">
                <div className="flex items-center gap-3 mb-2">
                  <Calendar size={24} className="text-primary" />
                  <h2 className="text-xl font-bold text-white">Calendar Feed</h2>
                </div>
                <p className="text-gray-400 text-sm">
                  Subscribe to your sessions in your favorite calendar app.
                </p>
              </div>

              {/* Feed URL Display */}
              <div className="mb-4">
                <label className="block text-sm font-medium text-gray-300 mb-2">
                  Feed URL
                </label>
                <input
                  type="text"
                  readOnly
                  value={webcalFeedUrl}
                  className="w-full bg-gray-800/50 rounded-lg p-3 text-sm text-gray-300 font-mono border border-gray-700 focus:outline-none focus:border-primary"
                />
              </div>

              {/* Action Buttons */}
              <div className="space-y-3 mb-6">
                <button
                  onClick={handleCopyLink}
                  className="flex items-center justify-center gap-2 w-full bg-primary text-white rounded-lg py-3 font-semibold hover:bg-primary/90 transition-colors"
                >
                  <Copy size={20} />
                  Copy Link
                </button>

                <button
                  onClick={handleAddToGoogle}
                  className="flex items-center justify-center gap-2 w-full bg-bg-secondary border border-border text-text-primary rounded-lg py-3 font-medium hover:bg-gray-700 transition-colors"
                >
                  <ExternalLink size={20} />
                  Add to Google Calendar
                </button>

                <button
                  onClick={handleAddToApple}
                  className="flex items-center justify-center gap-2 w-full bg-bg-secondary border border-border text-text-primary rounded-lg py-3 font-medium hover:bg-gray-700 transition-colors"
                >
                  <ExternalLink size={20} />
                  Add to Apple Calendar
                </button>
              </div>

              {/* Divider */}
              <div className="border-t border-gray-700 my-6" />

              {/* Regenerate Section */}
              <div className="mb-6">
                <button
                  onClick={handleRegenerateLink}
                  disabled={isRegenerating}
                  className="flex items-center justify-center gap-2 w-full bg-transparent border border-error/30 text-error rounded-lg py-3 font-medium hover:bg-error/10 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  <RefreshCw
                    size={20}
                    className={isRegenerating ? 'animate-spin' : ''}
                  />
                  {isRegenerating ? 'Regenerating...' : 'Regenerate Link'}
                </button>
                <p className="text-xs text-gray-500 mt-2 text-center">
                  This will invalidate your existing calendar subscription.
                </p>
              </div>

              {/* Bottom safe-area spacer */}
              <div className="safe-area-spacer" />
            </div>
          </>
        )}
      </div>

      <style jsx>{`
        .safe-area-spacer {
          height: max(2rem, env(safe-area-inset-bottom));
          flex-shrink: 0;
        }
      `}</style>
    </div>
  )
}

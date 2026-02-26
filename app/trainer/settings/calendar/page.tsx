'use client'

import { useState, useEffect, useCallback } from 'react'
import GlassAppLayout from '@/components/layout/GlassAppLayout'
import GlassCard from '@/components/ui/GlassCard'
import {
  Calendar,
  Link2,
  ExternalLink,
  Clipboard,
  RefreshCw,
  CheckCircle,
  AlertTriangle,
  Loader2,
  AlertCircle,
  ChevronDown,
  ChevronUp,
} from '@/components/ui/icons'

interface CalendarTokenData {
  token: string
  feedUrl: string
  trainerId: string
}

type InstructionSection = 'google' | 'apple' | 'outlook' | null

export default function CalendarSettingsPage() {
  const [tokenData, setTokenData] = useState<CalendarTokenData | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [isRegenerating, setIsRegenerating] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [copied, setCopied] = useState(false)
  const [showRegenerateConfirm, setShowRegenerateConfirm] = useState(false)
  const [expandedInstruction, setExpandedInstruction] = useState<InstructionSection>('google')

  const fetchToken = useCallback(async () => {
    try {
      const response = await fetch('/api/calendar/token')
      if (!response.ok) {
        throw new Error('Failed to fetch calendar token')
      }
      const data = await response.json()
      setTokenData(data)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load calendar settings')
    } finally {
      setIsLoading(false)
    }
  }, [])

  useEffect(() => {
    fetchToken()
  }, [fetchToken])

  const handleCopy = async () => {
    if (!tokenData?.feedUrl) return

    try {
      await navigator.clipboard.writeText(tokenData.feedUrl)
      setCopied(true)
      setTimeout(() => setCopied(false), 2000)
    } catch (err) {
      console.error('Failed to copy:', err)
    }
  }

  const handleRegenerate = async () => {
    setIsRegenerating(true)
    setError(null)

    try {
      const response = await fetch('/api/calendar/token', { method: 'POST' })
      if (!response.ok) {
        throw new Error('Failed to regenerate token')
      }
      const data = await response.json()
      setTokenData(data)
      setShowRegenerateConfirm(false)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to regenerate token')
    } finally {
      setIsRegenerating(false)
    }
  }

  const toggleInstruction = (section: InstructionSection) => {
    setExpandedInstruction(expandedInstruction === section ? null : section)
  }

  if (isLoading) {
    return (
      <GlassAppLayout title="Calendar Sync" desktopTitle="Calendar Sync" showBack showNotifications={false}>
        <div className="flex flex-col items-center justify-center py-12">
          <Loader2 size={32} className="text-primary animate-spin mb-4" />
          <p className="text-text-secondary">Loading calendar settings...</p>
        </div>
      </GlassAppLayout>
    )
  }

  if (error && !tokenData) {
    return (
      <GlassAppLayout title="Calendar Sync" desktopTitle="Calendar Sync" showBack showNotifications={false}>
        <div className="flex flex-col items-center justify-center py-12">
          <AlertCircle size={32} className="text-red-500 mb-4" />
          <p className="text-text-secondary">{error}</p>
          <button
            onClick={fetchToken}
            className="mt-4 px-4 py-2 bg-primary text-white rounded-lg font-medium"
          >
            Try Again
          </button>
        </div>
      </GlassAppLayout>
    )
  }

  return (
    <GlassAppLayout title="Calendar Sync" desktopTitle="Calendar Sync" showBack showNotifications={false}>
      <GlassCard variant="subtle" className="p-6">
        <div className="space-y-6">
          {/* Header */}
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 bg-primary/20 rounded-full flex items-center justify-center">
              <Calendar size={24} className="text-primary" />
            </div>
            <div>
              <h2 className="text-lg font-bold text-text-primary">iCal Feed</h2>
              <p className="text-sm text-text-secondary">
                Sync your sessions with external calendars
              </p>
            </div>
          </div>

          {/* Feed URL Card */}
          <div className="bg-bg-input rounded-xl p-5 space-y-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Link2 size={18} className="text-primary" />
                <span className="font-medium text-text-primary">Your Feed URL</span>
              </div>
              <span className="text-xs text-text-muted">Read-only</span>
            </div>

            <div className="bg-bg-secondary rounded-lg p-3 break-all">
              <code className="text-xs text-text-primary">
                {tokenData?.feedUrl || 'Loading...'}
              </code>
            </div>

            <button
              onClick={handleCopy}
              className="w-full flex items-center justify-center gap-2 py-3 px-4 bg-primary text-white font-bold rounded-lg hover:bg-primary/90 transition-colors"
            >
              {copied ? (
                <>
                  <CheckCircle size={20} />
                  Copied!
                </>
              ) : (
                <>
                  <Clipboard size={20} />
                  Copy Feed URL
                </>
              )}
            </button>
          </div>

          {/* Regenerate Token */}
          <div className="bg-bg-input rounded-xl p-5 space-y-4">
            <div className="flex items-center gap-2">
              <RefreshCw size={18} className="text-yellow-500" />
              <span className="font-medium text-text-primary">Regenerate URL</span>
            </div>
            <p className="text-sm text-text-secondary">
              If your feed URL was shared accidentally, you can regenerate it.
              This will invalidate the old URL and create a new one.
            </p>

            {!showRegenerateConfirm ? (
              <button
                onClick={() => setShowRegenerateConfirm(true)}
                className="w-full flex items-center justify-center gap-2 py-3 px-4 bg-bg-secondary text-text-primary font-medium rounded-lg hover:bg-bg-input transition-colors"
              >
                <RefreshCw size={18} />
                Regenerate URL
              </button>
            ) : (
              <div className="space-y-3">
                <div className="flex items-center gap-2 p-3 bg-yellow-500/10 rounded-lg">
                  <AlertTriangle size={18} className="text-yellow-500 flex-shrink-0" />
                  <p className="text-sm text-yellow-400">
                    This will break any existing calendar subscriptions using the old URL.
                  </p>
                </div>
                <div className="flex gap-3">
                  <button
                    onClick={() => setShowRegenerateConfirm(false)}
                    className="flex-1 py-3 px-4 bg-bg-secondary text-text-primary font-medium rounded-lg hover:bg-bg-input transition-colors"
                  >
                    Cancel
                  </button>
                  <button
                    onClick={handleRegenerate}
                    disabled={isRegenerating}
                    className="flex-1 py-3 px-4 bg-yellow-500 text-black font-bold rounded-lg hover:bg-yellow-400 transition-colors disabled:opacity-50 flex items-center justify-center gap-2"
                  >
                    {isRegenerating ? (
                      <Loader2 size={18} className="animate-spin" />
                    ) : (
                      <>
                        <RefreshCw size={18} />
                        Confirm
                      </>
                    )}
                  </button>
                </div>
              </div>
            )}
          </div>

          {/* Setup Instructions */}
          <div className="space-y-3">
            <h3 className="text-lg font-bold text-text-primary">Setup Instructions</h3>

            {/* Google Calendar */}
            <div className="bg-bg-input rounded-xl overflow-hidden">
              <button
                onClick={() => toggleInstruction('google')}
                className="w-full flex items-center justify-between p-4 text-left"
              >
                <div className="flex items-center gap-3">
                  <div className="w-8 h-8 bg-blue-500/20 rounded-lg flex items-center justify-center">
                    <span className="text-blue-400 font-bold text-sm">G</span>
                  </div>
                  <span className="font-medium text-text-primary">Google Calendar</span>
                </div>
                {expandedInstruction === 'google' ? (
                  <ChevronUp size={20} className="text-text-secondary" />
                ) : (
                  <ChevronDown size={20} className="text-text-secondary" />
                )}
              </button>
              {expandedInstruction === 'google' && (
                <div className="px-4 pb-4 space-y-3">
                  <ol className="list-decimal list-inside text-sm text-text-secondary space-y-2">
                    <li>Open <span className="text-text-primary">Google Calendar</span> on your computer</li>
                    <li>On the left, find <span className="text-text-primary">&quot;Other calendars&quot;</span> and click the <span className="text-text-primary">+</span></li>
                    <li>Select <span className="text-text-primary">&quot;From URL&quot;</span></li>
                    <li>Paste your feed URL and click <span className="text-text-primary">&quot;Add calendar&quot;</span></li>
                  </ol>
                  <a
                    href="https://calendar.google.com/calendar/r/settings/addbyurl"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center gap-2 text-sm text-primary hover:underline"
                  >
                    Open Google Calendar Settings
                    <ExternalLink size={14} />
                  </a>
                </div>
              )}
            </div>

            {/* Apple Calendar */}
            <div className="bg-bg-input rounded-xl overflow-hidden">
              <button
                onClick={() => toggleInstruction('apple')}
                className="w-full flex items-center justify-between p-4 text-left"
              >
                <div className="flex items-center gap-3">
                  <div className="w-8 h-8 bg-bg-secondary rounded-lg flex items-center justify-center">
                    <span className="text-text-secondary font-bold text-sm">A</span>
                  </div>
                  <span className="font-medium text-text-primary">Apple Calendar</span>
                </div>
                {expandedInstruction === 'apple' ? (
                  <ChevronUp size={20} className="text-text-secondary" />
                ) : (
                  <ChevronDown size={20} className="text-text-secondary" />
                )}
              </button>
              {expandedInstruction === 'apple' && (
                <div className="px-4 pb-4 space-y-3">
                  <p className="text-sm font-medium text-text-primary">On Mac:</p>
                  <ol className="list-decimal list-inside text-sm text-text-secondary space-y-2">
                    <li>Open <span className="text-text-primary">Calendar</span> app</li>
                    <li>Go to <span className="text-text-primary">File → New Calendar Subscription...</span></li>
                    <li>Paste your feed URL and click <span className="text-text-primary">Subscribe</span></li>
                    <li>Choose your refresh frequency and click <span className="text-text-primary">OK</span></li>
                  </ol>
                  <p className="text-sm font-medium text-text-primary mt-4">On iPhone/iPad:</p>
                  <ol className="list-decimal list-inside text-sm text-text-secondary space-y-2">
                    <li>Go to <span className="text-text-primary">Settings → Calendar → Accounts</span></li>
                    <li>Tap <span className="text-text-primary">Add Account → Other → Add Subscribed Calendar</span></li>
                    <li>Paste your feed URL and tap <span className="text-text-primary">Next</span></li>
                  </ol>
                </div>
              )}
            </div>

            {/* Outlook */}
            <div className="bg-bg-input rounded-xl overflow-hidden">
              <button
                onClick={() => toggleInstruction('outlook')}
                className="w-full flex items-center justify-between p-4 text-left"
              >
                <div className="flex items-center gap-3">
                  <div className="w-8 h-8 bg-blue-600/20 rounded-lg flex items-center justify-center">
                    <span className="text-blue-500 font-bold text-sm">O</span>
                  </div>
                  <span className="font-medium text-text-primary">Outlook</span>
                </div>
                {expandedInstruction === 'outlook' ? (
                  <ChevronUp size={20} className="text-text-secondary" />
                ) : (
                  <ChevronDown size={20} className="text-text-secondary" />
                )}
              </button>
              {expandedInstruction === 'outlook' && (
                <div className="px-4 pb-4 space-y-3">
                  <p className="text-sm font-medium text-text-primary">Outlook.com (Web):</p>
                  <ol className="list-decimal list-inside text-sm text-text-secondary space-y-2">
                    <li>Go to <span className="text-text-primary">outlook.com</span> and open Calendar</li>
                    <li>Click <span className="text-text-primary">Add calendar → Subscribe from web</span></li>
                    <li>Paste your feed URL and click <span className="text-text-primary">Import</span></li>
                  </ol>
                  <a
                    href="https://outlook.live.com/calendar"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center gap-2 text-sm text-primary hover:underline"
                  >
                    Open Outlook Calendar
                    <ExternalLink size={14} />
                  </a>
                </div>
              )}
            </div>
          </div>

          {/* Notes */}
          <div className="bg-bg-secondary/50 rounded-xl p-4 space-y-2">
            <p className="text-sm font-medium text-text-primary">Notes:</p>
            <ul className="list-disc list-inside text-sm text-text-secondary space-y-1">
              <li>Calendar apps refresh automatically every 1-24 hours</li>
              <li>Your feed includes sessions from the past 30 days to 90 days ahead</li>
              <li>This is a read-only feed - changes must be made in Forge</li>
              <li>Keep your feed URL private - it grants view access to your schedule</li>
            </ul>
          </div>
        </div>
      </GlassCard>
    </GlassAppLayout>
  )
}

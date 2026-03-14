'use client'

import { useEffect } from 'react'
import { motion } from 'framer-motion'
import { X, AlertCircle, Loader2 } from '@/components/ui/icons'

interface FormModalProps {
  title: string
  submitLabel: string
  onClose: () => void
  onSubmit: (e: React.FormEvent) => void
  isSubmitting: boolean
  disabled?: boolean
  error?: string | null
  children: React.ReactNode
}

export default function FormModal({
  title,
  submitLabel,
  onClose,
  onSubmit,
  isSubmitting,
  disabled = false,
  error,
  children,
}: FormModalProps) {
  useEffect(() => {
    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose()
    }
    document.body.style.overflow = 'hidden'
    window.addEventListener('keydown', handleEscape)
    return () => {
      document.body.style.overflow = 'unset'
      window.removeEventListener('keydown', handleEscape)
    }
  }, [onClose])

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/50 backdrop-blur-sm" onClick={onClose} />
      <motion.div
        initial={{ opacity: 0, scale: 0.95, y: 8 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        exit={{ opacity: 0, scale: 0.95, y: 8 }}
        transition={{ duration: 0.2 }}
        className="relative glass border border-border rounded-2xl shadow-2xl max-w-md w-full p-6"
      >
        <div className="flex items-center justify-between mb-6">
          <h3 className="text-lg font-bold text-text-primary">{title}</h3>
          <button
            onClick={onClose}
            className="size-8 flex items-center justify-center rounded-lg text-text-secondary hover:text-text-primary hover:bg-bg-secondary transition-all"
          >
            <X size={18} />
          </button>
        </div>

        <form onSubmit={onSubmit} className="space-y-4">
          {children}

          {error && (
            <div className="flex items-center gap-2 text-red-500 text-sm">
              <AlertCircle size={14} />
              <span>{error}</span>
            </div>
          )}

          <div className="flex gap-3 pt-2">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 py-3 px-4 bg-bg-secondary text-text-secondary rounded-xl font-semibold text-sm transition-all hover:bg-bg-secondary/80"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={isSubmitting || disabled}
              className="flex-1 py-3 px-4 bg-primary text-white rounded-xl font-semibold text-sm transition-all hover:opacity-90 disabled:opacity-50 flex items-center justify-center gap-2"
            >
              {isSubmitting && <Loader2 size={16} className="animate-spin" />}
              {isSubmitting ? 'Saving...' : submitLabel}
            </button>
          </div>
        </form>
      </motion.div>
    </div>
  )
}

'use client'

import { useEffect } from 'react'
import { AlertCircle } from './icons'

export interface ConfirmModalProps {
  title: string
  message: string
  confirmText?: string
  cancelText?: string
  onConfirm: () => void
  onCancel: () => void
}

export default function ConfirmModal({
  title,
  message,
  confirmText = 'Confirm',
  cancelText = 'Cancel',
  onConfirm,
  onCancel,
}: ConfirmModalProps) {
  // Prevent body scroll when modal is open
  useEffect(() => {
    document.body.style.overflow = 'hidden'
    return () => {
      document.body.style.overflow = 'unset'
    }
  }, [])

  // Handle escape key
  useEffect(() => {
    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        onCancel()
      }
    }
    window.addEventListener('keydown', handleEscape)
    return () => window.removeEventListener('keydown', handleEscape)
  }, [onCancel])

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      {/* Backdrop */}
      <div
        className="absolute inset-0 bg-black/60 backdrop-blur-sm"
        onClick={onCancel}
        aria-hidden="true"
      />

      {/* Modal */}
      <div
        className="relative bg-[#2C2C2C] border border-stone-700 rounded-2xl shadow-2xl max-w-sm w-full p-6 animate-scale-up"
        role="dialog"
        aria-modal="true"
        aria-labelledby="modal-title"
      >
        {/* Icon */}
        <div className="flex justify-center mb-4">
          <div className="size-14 rounded-full bg-primary/10 flex items-center justify-center">
            <AlertCircle size={28} strokeWidth={2} className="text-primary" />
          </div>
        </div>

        {/* Title */}
        <h3 id="modal-title" className="text-xl font-bold text-white text-center mb-2">{title}</h3>

        {/* Message */}
        <p className="text-sm text-stone-400 text-center mb-6">{message}</p>

        {/* Actions */}
        <div className="flex gap-3">
          <button
            onClick={onCancel}
            className="flex-1 py-3.5 px-4 bg-[#1C1C1C] text-stone-300 rounded-xl font-bold transition-all active:scale-95 hover:bg-[#252525]"
          >
            {cancelText}
          </button>
          <button
            onClick={onConfirm}
            className="flex-1 py-3.5 px-4 bg-primary text-white rounded-xl font-bold transition-all active:scale-95 hover:bg-orange-600"
          >
            {confirmText}
          </button>
        </div>
      </div>
    </div>
  )
}

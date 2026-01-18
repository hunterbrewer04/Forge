'use client'

import { useEffect } from 'react'
import { X, CheckCircle, AlertCircle, Info } from './icons'

export type ToastType = 'success' | 'error' | 'info'

export interface ToastProps {
  message: string
  type?: ToastType
  duration?: number
  onClose: () => void
}

export default function Toast({ message, type = 'info', duration = 3000, onClose }: ToastProps) {
  useEffect(() => {
    if (duration > 0) {
      const timer = setTimeout(() => {
        onClose()
      }, duration)
      return () => clearTimeout(timer)
    }
  }, [duration, onClose])

  const getIcon = () => {
    switch (type) {
      case 'success':
        return <CheckCircle size={20} strokeWidth={2} className="text-green-400" />
      case 'error':
        return <AlertCircle size={20} strokeWidth={2} className="text-red-400" />
      case 'info':
        return <Info size={20} strokeWidth={2} className="text-blue-400" />
    }
  }

  const getBgColor = () => {
    switch (type) {
      case 'success':
        return 'bg-green-500/10 border-green-500/20'
      case 'error':
        return 'bg-red-500/10 border-red-500/20'
      case 'info':
        return 'bg-blue-500/10 border-blue-500/20'
    }
  }

  const getTextColor = () => {
    switch (type) {
      case 'success':
        return 'text-green-400'
      case 'error':
        return 'text-red-400'
      case 'info':
        return 'text-blue-400'
    }
  }

  return (
    <div className={`fixed bottom-20 left-4 right-4 z-50 animate-slide-up`}>
      <div className={`flex items-center gap-3 p-4 rounded-xl border ${getBgColor()} backdrop-blur-sm shadow-lg`}>
        {getIcon()}
        <p className={`flex-1 text-sm font-medium ${getTextColor()}`}>{message}</p>
        <button
          onClick={onClose}
          className="p-1 hover:bg-white/10 rounded-lg transition-colors"
          aria-label="Close notification"
        >
          <X size={16} strokeWidth={2} className="text-stone-400" />
        </button>
      </div>
    </div>
  )
}

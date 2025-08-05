import React, { useState, useEffect } from 'react'
import { CheckCircle, AlertCircle, X, Info } from 'lucide-react'

interface ToastProps {
  type: 'success' | 'error' | 'info'
  message: string
  duration?: number
  onClose: () => void
}

interface ToastDetail {
  type: 'success' | 'error' | 'info'
  message: string
  duration?: number
}

export function Toast({ type, message, duration = 5000, onClose }: ToastProps) {
  useEffect(() => {
    const timer = setTimeout(onClose, duration)
    return () => clearTimeout(timer)
  }, [duration, onClose])

  const getIcon = () => {
    switch (type) {
      case 'success':
        return <CheckCircle className="h-5 w-5 text-green-600" />
      case 'error':
        return <AlertCircle className="h-5 w-5 text-red-600" />
      case 'info':
        return <Info className="h-5 w-5 text-blue-600" />
    }
  }

  const getStyles = () => {
    switch (type) {
      case 'success':
        return 'bg-green-50 border-green-200 text-green-800'
      case 'error':
        return 'bg-red-50 border-red-200 text-red-800'
      case 'info':
        return 'bg-blue-50 border-blue-200 text-blue-800'
    }
  }

  return (
    <div className={`fixed top-4 right-4 z-50 max-w-sm w-full mx-auto rounded-lg border p-4 shadow-lg animate-slide-in ${getStyles()}`}>
      <div className="flex items-start gap-3">
        {getIcon()}
        <div className="flex-1 text-sm">
          {message}
        </div>
        <button
          onClick={onClose}
          className="text-gray-400 hover:text-gray-600"
          title="Close notification"
          aria-label="Close notification"
        >
          <X className="h-4 w-4" />
        </button>
      </div>
    </div>
  )
}

export function ToastProvider({ children }: { children: React.ReactNode }) {
  const [toasts, setToasts] = useState<(ToastDetail & { id: string })[]>([])

  useEffect(() => {
    const handleToast = (event: CustomEvent<ToastDetail>) => {
      const id = Math.random().toString(36).substr(2, 9)
      const newToast = { ...event.detail, id }
      
      setToasts(prev => [...prev, newToast])
    }

    window.addEventListener('toast', handleToast as EventListener)
    return () => window.removeEventListener('toast', handleToast as EventListener)
  }, [])

  const removeToast = (id: string) => {
    setToasts(prev => prev.filter(toast => toast.id !== id))
  }

  // Show success toast
  const showSuccess = (message: string, duration?: number) => {
    const event = new CustomEvent('toast', {
      detail: { type: 'success', message, duration }
    })
    window.dispatchEvent(event)
  }

  // Show error toast
  const showError = (message: string, duration?: number) => {
    const event = new CustomEvent('toast', {
      detail: { type: 'error', message, duration }
    })
    window.dispatchEvent(event)
  }

  // Show info toast
  const showInfo = (message: string, duration?: number) => {
    const event = new CustomEvent('toast', {
      detail: { type: 'info', message, duration }
    })
    window.dispatchEvent(event)
  }

  return (
    <>
      {children}
      <div className="fixed top-4 right-4 z-50 space-y-2">
        {toasts.map(toast => (
          <Toast
            key={toast.id}
            type={toast.type}
            message={toast.message}
            duration={toast.duration}
            onClose={() => removeToast(toast.id)}
          />
        ))}
      </div>
    </>
  )
}

// Global toast functions
export const toast = {
  success: (message: string, duration?: number) => {
    const event = new CustomEvent('toast', {
      detail: { type: 'success', message, duration }
    })
    window.dispatchEvent(event)
  },
  
  error: (message: string, duration?: number) => {
    const event = new CustomEvent('toast', {
      detail: { type: 'error', message, duration }
    })
    window.dispatchEvent(event)
  },
  
  info: (message: string, duration?: number) => {
    const event = new CustomEvent('toast', {
      detail: { type: 'info', message, duration }
    })
    window.dispatchEvent(event)
  }
}

'use client'

import { useState, useEffect } from 'react'
import { X, CheckCircle, AlertCircle, Info } from 'lucide-react'

interface Toast {
  id: string
  message: string
  type: 'success' | 'error' | 'info'
  duration?: number
}

let toastId = 0
let toastStore: {
  toasts: Toast[]
  addToast: (toast: Omit<Toast, 'id'>) => void
  removeToast: (id: string) => void
  listeners: ((toasts: Toast[]) => void)[]
} = {
  toasts: [],
  addToast: () => {},
  removeToast: () => {},
  listeners: []
}

if (typeof window !== 'undefined') {
  toastStore = {
    toasts: [],
    listeners: [],
    addToast: (toast: Omit<Toast, 'id'>) => {
      const newToast = { ...toast, id: `toast-${toastId++}` }
      toastStore.toasts.push(newToast)
      toastStore.listeners.forEach(listener => listener([...toastStore.toasts]))
      
      // Auto remove after duration
      const duration = toast.duration || 3000
      setTimeout(() => {
        toastStore.removeToast(newToast.id)
      }, duration)
    },
    removeToast: (id: string) => {
      toastStore.toasts = toastStore.toasts.filter(t => t.id !== id)
      toastStore.listeners.forEach(listener => listener([...toastStore.toasts]))
    }
  }
}

export const toast = {
  success: (message: string, options?: { duration?: number }) => {
    toastStore.addToast({ message, type: 'success', duration: options?.duration })
  },
  error: (message: string, options?: { duration?: number }) => {
    toastStore.addToast({ message, type: 'error', duration: options?.duration })
  },
  info: (message: string, options?: { duration?: number }) => {
    toastStore.addToast({ message, type: 'info', duration: options?.duration })
  }
}

export function Toaster() {
  const [toasts, setToasts] = useState<Toast[]>([])

  useEffect(() => {
    const listener = (newToasts: Toast[]) => setToasts(newToasts)
    toastStore.listeners.push(listener)
    setToasts([...toastStore.toasts])

    return () => {
      toastStore.listeners = toastStore.listeners.filter(l => l !== listener)
    }
  }, [])

  return (
    <div className="fixed top-4 right-4 z-50 space-y-2">
      {toasts.map(toast => (
        <ToastItem
          key={toast.id}
          toast={toast}
          onRemove={() => toastStore.removeToast(toast.id)}
        />
      ))}
    </div>
  )
}

interface ToastItemProps {
  toast: Toast
  onRemove: () => void
}

function ToastItem({ toast, onRemove }: ToastItemProps) {
  const getToastStyles = () => {
    switch (toast.type) {
      case 'success':
        return 'bg-green-50 border-green-200 text-green-800'
      case 'error':
        return 'bg-red-50 border-red-200 text-red-800'
      case 'info':
        return 'bg-blue-50 border-blue-200 text-blue-800'
      default:
        return 'bg-gray-50 border-gray-200 text-gray-800'
    }
  }

  const getIcon = () => {
    switch (toast.type) {
      case 'success':
        return <CheckCircle className="h-4 w-4 text-green-500" />
      case 'error':
        return <AlertCircle className="h-4 w-4 text-red-500" />
      case 'info':
        return <Info className="h-4 w-4 text-blue-500" />
      default:
        return null
    }
  }

  return (
    <div className={`max-w-sm w-full border rounded-lg shadow-sm p-4 ${getToastStyles()} animate-in slide-in-from-right-full duration-300`}>
      <div className="flex items-start">
        <div className="flex-shrink-0">
          {getIcon()}
        </div>
        <div className="ml-3 w-0 flex-1">
          <p className="text-sm font-medium">
            {toast.message}
          </p>
        </div>
        <div className="ml-4 flex-shrink-0 flex">
          <button
            className="inline-flex text-gray-400 hover:text-gray-600 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500"
            onClick={onRemove}
          >
            <span className="sr-only">Close</span>
            <X className="h-4 w-4" />
          </button>
        </div>
      </div>
    </div>
  )
}

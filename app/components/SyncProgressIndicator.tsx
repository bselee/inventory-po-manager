'use client'

import { useState, useEffect } from 'react'
import { Loader2, Package, CheckCircle2, XCircle, Clock, TrendingUp } from 'lucide-react'

interface SyncProgress {
  status: 'idle' | 'running' | 'completed' | 'failed'
  type?: string
  progress: number
  itemsProcessed: number
  totalItems: number
  currentItem?: string
  startedAt?: string
  estimatedCompletion?: string
  errors: number
  speed?: number // items per second
}

export default function SyncProgressIndicator() {
  const [syncProgress, setSyncProgress] = useState<SyncProgress>({
    status: 'idle',
    progress: 0,
    itemsProcessed: 0,
    totalItems: 0,
    errors: 0
  })

  useEffect(() => {
    const loadProgress = async () => {
      try {
        const response = await fetch('/api/sync-status')
        if (response.ok) {
          const data = await response.json()
          if (data.activeSync) {
            const progress = data.activeSync.totalItems > 0 
              ? Math.round((data.activeSync.itemsProcessed / data.activeSync.totalItems) * 100)
              : 0
            
            setSyncProgress({
              status: 'running',
              type: data.activeSync.type,
              progress,
              itemsProcessed: data.activeSync.itemsProcessed || 0,
              totalItems: data.activeSync.totalItems || 0,
              currentItem: data.activeSync.currentItem,
              startedAt: data.activeSync.startedAt,
              estimatedCompletion: data.activeSync.estimatedCompletion,
              errors: data.activeSync.errors || 0,
              speed: data.activeSync.speed
            })
          } else {
            setSyncProgress(prev => ({ ...prev, status: 'idle' }))
          }
        }
      } catch (error) {
        console.error('Failed to load sync progress:', error)
      }
    }

    loadProgress()
    const interval = setInterval(loadProgress, 1000)
    return () => clearInterval(interval)
  }, [])

  if (syncProgress.status === 'idle') {
    return null
  }

  const getProgressColor = () => {
    if (syncProgress.errors > 0) return 'bg-yellow-500'
    if (syncProgress.progress < 30) return 'bg-blue-500'
    if (syncProgress.progress < 70) return 'bg-indigo-500'
    return 'bg-green-500'
  }

  const formatTime = (dateStr: string) => {
    const date = new Date(dateStr)
    const now = new Date()
    const diff = now.getTime() - date.getTime()
    const minutes = Math.floor(diff / 60000)
    const seconds = Math.floor((diff % 60000) / 1000)
    return `${minutes}:${seconds.toString().padStart(2, '0')}`
  }

  return (
    <div className="bg-white p-4 rounded-lg shadow-lg border border-gray-200 mb-6">
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-3">
          <div className="relative">
            <Loader2 className="h-6 w-6 text-blue-600 animate-spin" />
            <div className="absolute -bottom-1 -right-1 bg-white rounded-full">
              <Package className="h-3 w-3 text-gray-600" />
            </div>
          </div>
          <div>
            <h3 className="font-semibold text-gray-900">
              Sync in Progress
              {syncProgress.type && (
                <span className="ml-2 text-sm text-gray-600">({syncProgress.type})</span>
              )}
            </h3>
            <p className="text-xs text-gray-600">
              {syncProgress.itemsProcessed} of {syncProgress.totalItems} items
              {syncProgress.speed && (
                <span className="ml-2">• {syncProgress.speed.toFixed(1)} items/sec</span>
              )}
            </p>
          </div>
        </div>
        
        {syncProgress.startedAt && (
          <div className="text-right">
            <p className="text-xs text-gray-600">
              <Clock className="h-3 w-3 inline mr-1" />
              {formatTime(syncProgress.startedAt)} elapsed
            </p>
            {syncProgress.estimatedCompletion && (
              <p className="text-xs text-gray-600">
                Est. completion: {new Date(syncProgress.estimatedCompletion).toLocaleTimeString()}
              </p>
            )}
          </div>
        )}
      </div>

      <div className="relative h-3 bg-gray-200 rounded-full overflow-hidden mb-2">
        <div 
          className={`absolute top-0 left-0 h-full transition-all duration-500 ${getProgressColor()}`}
          style={{ width: `${syncProgress.progress}%` }}
        >
          <div className="absolute right-0 top-0 h-full w-8 bg-white/20 animate-pulse" />
        </div>
      </div>

      <div className="flex items-center justify-between text-xs">
        <span className="text-gray-600">{syncProgress.progress}% complete</span>
        {syncProgress.errors > 0 && (
          <span className="text-red-600 flex items-center gap-1">
            <XCircle className="h-3 w-3" />
            {syncProgress.errors} errors
          </span>
        )}
      </div>

      {syncProgress.currentItem && (
        <div className="mt-2 p-2 bg-gray-50 rounded text-xs text-gray-600">
          <span className="font-medium">Processing:</span> {syncProgress.currentItem}
        </div>
      )}
    </div>
  )
}
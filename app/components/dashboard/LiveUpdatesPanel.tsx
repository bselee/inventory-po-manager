'use client'

import { useEffect, useState } from 'react'
import { Activity, AlertCircle, CheckCircle, Info, Package } from 'lucide-react'

interface LiveUpdate {
  timestamp: string
  type: 'inventory' | 'po' | 'sync' | 'alert'
  message: string
  severity: 'info' | 'warning' | 'error' | 'success'
  details?: any
}

interface LiveUpdatesData {
  updates: LiveUpdate[]
  stats: {
    totalUpdates: number
    byType: Record<string, number>
    bySeverity: Record<string, number>
  }
}

export default function LiveUpdatesPanel() {
  const [data, setData] = useState<LiveUpdatesData | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const fetchUpdates = async () => {
    try {
      const response = await fetch('/api/dashboard/live-updates')
      if (!response.ok) throw new Error('Failed to fetch updates')
      const result = await response.json()
      setData(result.data || result)
      setError(null)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load updates')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchUpdates()
    const interval = setInterval(fetchUpdates, 30000) // Refresh every 30 seconds
    return () => clearInterval(interval)
  }, [])

  const getIcon = (type: string, severity: string) => {
    if (severity === 'error') return <AlertCircle className="h-4 w-4 text-red-500" />
    if (severity === 'success') return <CheckCircle className="h-4 w-4 text-green-500" />
    if (severity === 'warning') return <AlertCircle className="h-4 w-4 text-yellow-500" />
    
    switch (type) {
      case 'inventory':
        return <Package className="h-4 w-4 text-blue-500" />
      case 'sync':
        return <Activity className="h-4 w-4 text-purple-500" />
      default:
        return <Info className="h-4 w-4 text-gray-500" />
    }
  }

  const getSeverityColor = (severity: string) => {
    switch (severity) {
      case 'error':
        return 'bg-red-50 border-red-200'
      case 'success':
        return 'bg-green-50 border-green-200'
      case 'warning':
        return 'bg-yellow-50 border-yellow-200'
      default:
        return 'bg-gray-50 border-gray-200'
    }
  }

  const formatTime = (timestamp: string) => {
    const date = new Date(timestamp)
    const now = new Date()
    const diff = now.getTime() - date.getTime()
    const minutes = Math.floor(diff / 60000)
    
    if (minutes < 1) return 'Just now'
    if (minutes < 60) return `${minutes}m ago`
    const hours = Math.floor(minutes / 60)
    if (hours < 24) return `${hours}h ago`
    return date.toLocaleDateString()
  }

  if (loading) {
    return (
      <div className="col-span-12 lg:col-span-6">
        <div className="bg-white rounded-lg shadow">
          <div className="px-6 py-4 border-b">
            <h2 className="text-lg font-semibold text-gray-900">Live Updates</h2>
          </div>
          <div className="p-6">
            <div className="space-y-2">
              {[...Array(5)].map((_, i) => (
                <div key={i} className="animate-pulse">
                  <div className="h-12 bg-gray-100 rounded"></div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    )
  }

  if (error || !data) {
    return (
      <div className="col-span-12 lg:col-span-6">
        <div className="bg-white rounded-lg shadow">
          <div className="px-6 py-4 border-b">
            <h2 className="text-lg font-semibold text-gray-900">Live Updates</h2>
          </div>
          <div className="p-6">
            <div className="bg-red-50 border border-red-200 rounded-lg p-4">
              <p className="text-red-800">{error}</p>
            </div>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="col-span-12 lg:col-span-6">
      <div className="bg-white rounded-lg shadow">
        <div className="px-6 py-4 border-b">
          <div className="flex items-center justify-between">
            <h2 className="text-lg font-semibold text-gray-900 flex items-center">
              <Activity className="h-5 w-5 mr-2 text-blue-500" />
              Live Updates
            </h2>
            <div className="flex items-center gap-3 text-xs">
              {data.stats.bySeverity.error > 0 && (
                <span className="flex items-center gap-1 text-red-600">
                  <AlertCircle className="h-3 w-3" />
                  {data.stats.bySeverity.error}
                </span>
              )}
              {data.stats.bySeverity.warning > 0 && (
                <span className="flex items-center gap-1 text-yellow-600">
                  <AlertCircle className="h-3 w-3" />
                  {data.stats.bySeverity.warning}
                </span>
              )}
              <span className="text-gray-500">
                {data.stats.totalUpdates} total
              </span>
            </div>
          </div>
        </div>

        <div className="p-6">
          <div className="space-y-2 max-h-96 overflow-y-auto">
            {data.updates.length === 0 ? (
              <div className="text-center py-8 text-gray-500">
                <Activity className="h-12 w-12 mx-auto mb-2 text-gray-300" />
                <p>No recent updates</p>
                <p className="text-sm mt-1">Updates will appear here as they occur</p>
              </div>
            ) : (
              data.updates.map((update, index) => (
                <div
                  key={index}
                  className={`border rounded-lg p-3 ${getSeverityColor(update.severity)}`}
                >
                  <div className="flex items-start gap-3">
                    <div className="mt-0.5">
                      {getIcon(update.type, update.severity)}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium text-gray-900">
                        {update.message}
                      </p>
                      {update.details && (
                        <div className="mt-1 text-xs text-gray-600">
                          {update.details.product_title && (
                            <p>{update.details.product_title}</p>
                          )}
                          {update.details.items_synced !== undefined && (
                            <p>Items synced: {update.details.items_synced}</p>
                          )}
                          {update.details.duration !== undefined && (
                            <p>Duration: {update.details.duration}s</p>
                          )}
                          {update.details.available !== undefined && (
                            <p>Available: {update.details.available} units</p>
                          )}
                          {update.details.days_remaining !== undefined && (
                            <p className="text-red-600 font-semibold">
                              {update.details.days_remaining} days remaining
                            </p>
                          )}
                        </div>
                      )}
                      <p className="text-xs text-gray-500 mt-1">
                        {formatTime(update.timestamp)}
                      </p>
                    </div>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      </div>
    </div>
  )
}
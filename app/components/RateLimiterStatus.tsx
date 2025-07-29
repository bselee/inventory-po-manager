'use client'

import { useState, useEffect } from 'react'
import { Activity, Zap, AlertTriangle, CheckCircle, Clock } from 'lucide-react'

interface RateLimiterStats {
  requestsInQueue: number
  requestsPerSecond: number
  isProcessing: boolean
  lastRequestTime?: string
  totalRequests: number
  failedRequests: number
  averageResponseTime?: number
}

export default function RateLimiterStatus() {
  const [stats, setStats] = useState<RateLimiterStats>({
    requestsInQueue: 0,
    requestsPerSecond: 2,
    isProcessing: false,
    totalRequests: 0,
    failedRequests: 0
  })
  const [recentRequests, setRecentRequests] = useState<Array<{
    time: string
    type: string
    status: 'success' | 'error' | 'pending'
    duration?: number
  }>>([])

  useEffect(() => {
    const loadStats = async () => {
      try {
        const response = await fetch('/api/sync-finale/metrics')
        if (response.ok) {
          const data = await response.json()
          setStats(data.rateLimiter || stats)
          setRecentRequests(data.recentRequests || [])
        }
      } catch (error) {
        console.error('Failed to load rate limiter stats:', error)
      }
    }

    loadStats()
    const interval = setInterval(loadStats, 2000)
    return () => clearInterval(interval)
  }, [])

  const getStatusColor = () => {
    if (stats.failedRequests > 0) return 'text-red-600'
    if (stats.isProcessing) return 'text-yellow-600'
    return 'text-green-600'
  }

  const getStatusIcon = () => {
    if (stats.failedRequests > 0) return <AlertTriangle className="h-5 w-5" />
    if (stats.isProcessing) return <Activity className="h-5 w-5 animate-pulse" />
    return <CheckCircle className="h-5 w-5" />
  }

  return (
    <div className="bg-white p-6 rounded-lg shadow-sm border border-gray-200">
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-lg font-semibold text-gray-900 flex items-center gap-2">
          <Zap className="h-5 w-5 text-yellow-500" />
          API Rate Limiter Status
        </h3>
        <div className={`flex items-center gap-2 ${getStatusColor()}`}>
          {getStatusIcon()}
          <span className="text-sm font-medium">
            {stats.isProcessing ? 'Processing' : 'Idle'}
          </span>
        </div>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-4">
        <div className="bg-gray-50 p-3 rounded">
          <p className="text-xs text-gray-600">Queue Size</p>
          <p className="text-xl font-bold text-gray-900">{stats.requestsInQueue}</p>
        </div>
        <div className="bg-gray-50 p-3 rounded">
          <p className="text-xs text-gray-600">Requests/Second</p>
          <p className="text-xl font-bold text-gray-900">{stats.requestsPerSecond}</p>
        </div>
        <div className="bg-gray-50 p-3 rounded">
          <p className="text-xs text-gray-600">Total Requests</p>
          <p className="text-xl font-bold text-gray-900">{stats.totalRequests}</p>
        </div>
        <div className="bg-gray-50 p-3 rounded">
          <p className="text-xs text-gray-600">Failed</p>
          <p className="text-xl font-bold text-red-600">{stats.failedRequests}</p>
        </div>
      </div>

      {stats.averageResponseTime && (
        <div className="mb-4 p-3 bg-blue-50 rounded">
          <p className="text-sm text-blue-800">
            <Clock className="h-4 w-4 inline mr-1" />
            Average response time: <strong>{stats.averageResponseTime}ms</strong>
          </p>
        </div>
      )}

      {recentRequests.length > 0 && (
        <div>
          <h4 className="text-sm font-medium text-gray-700 mb-2">Recent API Calls</h4>
          <div className="space-y-1 max-h-32 overflow-y-auto">
            {recentRequests.slice(0, 5).map((req, idx) => (
              <div key={idx} className="flex items-center justify-between text-xs py-1 px-2 bg-gray-50 rounded">
                <span className="text-gray-600">{req.type}</span>
                <div className="flex items-center gap-2">
                  {req.duration && <span className="text-gray-500">{req.duration}ms</span>}
                  <span className={`font-medium ${
                    req.status === 'success' ? 'text-green-600' : 
                    req.status === 'error' ? 'text-red-600' : 'text-yellow-600'
                  }`}>
                    {req.status}
                  </span>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      <div className="mt-4 p-3 bg-yellow-50 rounded">
        <p className="text-xs text-yellow-800">
          <strong>Rate Limiting Active:</strong> API calls are limited to {stats.requestsPerSecond} requests per second to prevent overwhelming the Finale API. 
          Requests are queued and processed in order.
        </p>
      </div>
    </div>
  )
}
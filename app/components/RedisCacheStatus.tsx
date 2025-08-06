'use client'

import { useState, useEffect } from 'react'
import { Database, RefreshCw, CheckCircle, AlertCircle, Clock, Server } from 'lucide-react'

interface CacheHealth {
  redisConnection: string
  cacheStatus: string
  cacheAge: string
  lastSync: string | null
  nextSync: string | null
  itemsInCache: number
  vendorsInCache: number
}

export default function RedisCacheStatus() {
  const [health, setHealth] = useState<CacheHealth | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  
  const checkHealth = async () => {
    setLoading(true)
    setError(null)
    
    try {
      const response = await fetch('/api/inventory-cache', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'healthCheck' })
      })
      
      const result = await response.json()
      
      if (result.success && result.health) {
        setHealth(result.health)
      } else {
        setError(result.error || 'Failed to check cache health')
      }
    } catch (err) {
      setError('Failed to connect to cache service')
      logError('Cache health check error:', err)
    } finally {
      setLoading(false)
    }
  }
  
  useEffect(() => {
    checkHealth()
    // Check every 30 seconds
    const interval = setInterval(checkHealth, 30000)
    return () => clearInterval(interval)
  }, [])
  
  const getStatusIcon = () => {
    if (loading) return <RefreshCw className="h-5 w-5 animate-spin text-gray-400" />
    if (error || !health) return <AlertCircle className="h-5 w-5 text-red-500" />
    if (health.redisConnection === 'healthy') return <CheckCircle className="h-5 w-5 text-green-500" />
    return <AlertCircle className="h-5 w-5 text-yellow-500" />
  }
  
  const getStatusColor = () => {
    if (error || !health) return 'bg-red-50 border-red-200'
    if (health.redisConnection === 'healthy') return 'bg-green-50 border-green-200'
    return 'bg-yellow-50 border-yellow-200'
  }
  
  return (
    <div className={`rounded-lg border p-4 ${getStatusColor()}`}>
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-2">
          {getStatusIcon()}
          <h3 className="text-sm font-semibold text-gray-700">Redis Cache Status</h3>
        </div>
        <button
          onClick={checkHealth}
          disabled={loading}
          className="p-1 hover:bg-white rounded transition-colors disabled:opacity-50"
          title="Refresh status"
        >
          <RefreshCw className={`h-4 w-4 text-gray-600 ${loading ? 'animate-spin' : ''}`} />
        </button>
      </div>
      
      {error ? (
        <div className="text-sm text-red-600">
          <p>{error}</p>
          <p className="text-xs mt-1">Check your Redis connection settings</p>
        </div>
      ) : health ? (
        <div className="grid grid-cols-2 gap-3 text-sm">
          <div>
            <div className="flex items-center gap-1 text-gray-600 mb-1">
              <Server className="h-3 w-3" />
              <span className="text-xs">Connection</span>
            </div>
            <p className="font-medium text-gray-900 capitalize">{health.redisConnection}</p>
          </div>
          
          <div>
            <div className="flex items-center gap-1 text-gray-600 mb-1">
              <Database className="h-3 w-3" />
              <span className="text-xs">Cache Status</span>
            </div>
            <p className="font-medium text-gray-900 capitalize">{health.cacheStatus}</p>
          </div>
          
          <div>
            <div className="flex items-center gap-1 text-gray-600 mb-1">
              <Clock className="h-3 w-3" />
              <span className="text-xs">Cache Age</span>
            </div>
            <p className="font-medium text-gray-900">{health.cacheAge}</p>
          </div>
          
          <div>
            <div className="flex items-center gap-1 text-gray-600 mb-1">
              <Database className="h-3 w-3" />
              <span className="text-xs">Items Cached</span>
            </div>
            <p className="font-medium text-gray-900">{health.itemsInCache.toLocaleString()}</p>
          </div>
          
          {health.lastSync && (
            <div className="col-span-2 pt-2 border-t border-gray-200">
              <p className="text-xs text-gray-600">
                Last sync: {new Date(health.lastSync).toLocaleString()}
              </p>
            </div>
          )}
        </div>
      ) : (
        <div className="animate-pulse">
          <div className="h-4 bg-gray-200 rounded w-3/4 mb-2"></div>
          <div className="h-4 bg-gray-200 rounded w-1/2"></div>
        </div>
      )}
      
      {health && health.cacheStatus === 'stale' && (
        <div className="mt-3 p-2 bg-yellow-100 rounded text-xs text-yellow-800">
          Cache is stale. Consider refreshing to get the latest data.
        </div>
      )}
    </div>
  )
}
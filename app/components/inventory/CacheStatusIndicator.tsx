'use client'

import { useEffect, useState } from 'react'
import { RefreshCw, Database, Clock } from 'lucide-react'

interface CacheStatus {
  source: string
  lastSync: string | null
  itemsInCache: number
  cacheAge: string | null
  healthy: boolean
}

export default function CacheStatusIndicator({ dataSource }: { dataSource: string }) {
  const [cacheStatus, setCacheStatus] = useState<CacheStatus | null>(null)
  const [loading, setLoading] = useState(false)
  
  const checkCacheStatus = async () => {
    if (dataSource !== 'redis-cache') return
    
    setLoading(true)
    try {
      const response = await fetch('/api/inventory-cache', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'healthCheck' })
      })
      
      const result = await response.json()
      if (result.success && result.health) {
        setCacheStatus({
          source: 'Redis Cache',
          lastSync: result.health.lastSync,
          itemsInCache: result.health.itemsInCache || 0,
          cacheAge: result.health.cacheAge,
          healthy: result.health.redisConnection === 'healthy'
        })
      }
    } catch (error) {
      logError('Failed to check cache status:', error)
    } finally {
      setLoading(false)
    }
  }
  
  useEffect(() => {
    checkCacheStatus()
    // Check every 60 seconds
    const interval = setInterval(checkCacheStatus, 60000)
    return () => clearInterval(interval)
  }, [dataSource])
  
  if (dataSource !== 'redis-cache' || !cacheStatus) {
    return null
  }
  
  return (
    <div className="flex items-center gap-3 px-3 py-2 bg-gray-50 rounded-lg border border-gray-200">
      <div className="flex items-center gap-2">
        <Database className={`h-4 w-4 ${cacheStatus.healthy ? 'text-green-600' : 'text-red-600'}`} />
        <span className="text-sm font-medium text-gray-700">
          {cacheStatus.source}
        </span>
      </div>
      
      <div className="flex items-center gap-2 text-sm text-gray-600">
        <Clock className="h-3 w-3" />
        <span>{cacheStatus.cacheAge || 'Unknown age'}</span>
      </div>
      
      <div className="text-sm text-gray-600">
        {cacheStatus.itemsInCache.toLocaleString()} items
      </div>
      
      <button
        onClick={checkCacheStatus}
        disabled={loading}
        className="ml-auto p-1 hover:bg-gray-200 rounded transition-colors disabled:opacity-50"
        title="Refresh cache status"
      >
        <RefreshCw className={`h-3 w-3 text-gray-600 ${loading ? 'animate-spin' : ''}`} />
      </button>
    </div>
  )
}
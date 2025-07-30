/**
 * Custom hooks for sync management
 */

import { useState, useEffect, useCallback, useRef } from 'react'
import {
  getRunningSyncLog,
  getRecentSyncLogs,
  getSyncStats,
  isAnySyncRunning
} from '@/app/lib/data-access'
import type { SyncLog } from '@/app/lib/data-access'

/**
 * Hook for monitoring sync status
 */
export function useSyncMonitor(refreshInterval: number = 5000) {
  const [currentSync, setCurrentSync] = useState<SyncLog | null>(null)
  const [recentSyncs, setRecentSyncs] = useState<SyncLog[]>([])
  const [syncStats, setSyncStats] = useState<any>(null)
  const [loading, setLoading] = useState(true)
  const intervalRef = useRef<NodeJS.Timeout>()

  const loadSyncStatus = useCallback(async () => {
    try {
      const [running, recent, stats] = await Promise.all([
        getRunningSyncLog(),
        getRecentSyncLogs(5),
        getSyncStats(7)
      ])
      
      setCurrentSync(running)
      setRecentSyncs(recent)
      setSyncStats(stats)
    } catch (error) {
      console.error('Error loading sync status:', error)
    } finally {
      setLoading(false)
    }
  }, [])

  // Initial load
  useEffect(() => {
    loadSyncStatus()
  }, [loadSyncStatus])

  // Auto-refresh when sync is running
  useEffect(() => {
    if (currentSync) {
      intervalRef.current = setInterval(loadSyncStatus, refreshInterval)
    } else {
      if (intervalRef.current) {
        clearInterval(intervalRef.current)
      }
    }

    return () => {
      if (intervalRef.current) {
        clearInterval(intervalRef.current)
      }
    }
  }, [currentSync, loadSyncStatus, refreshInterval])

  return {
    currentSync,
    recentSyncs,
    syncStats,
    loading,
    refresh: loadSyncStatus
  }
}

/**
 * Hook for triggering syncs
 */
export function useSyncTrigger() {
  const [syncing, setSyncing] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const triggerSync = useCallback(async (
    syncType: 'full' | 'inventory' | 'critical' | 'active' | 'smart' = 'smart'
  ) => {
    try {
      setSyncing(true)
      setError(null)

      // Check if sync is already running
      const isRunning = await isAnySyncRunning()
      if (isRunning) {
        throw new Error('A sync is already in progress')
      }

      // Trigger sync via API
      const response = await fetch('/api/sync-finale', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ syncType })
      })

      if (!response.ok) {
        const data = await response.json()
        throw new Error(data.error || 'Sync failed')
      }

      const result = await response.json()
      return result
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Sync failed'
      setError(message)
      throw err
    } finally {
      setSyncing(false)
    }
  }, [])

  const clearStuckSyncs = useCallback(async () => {
    try {
      const response = await fetch('/api/sync-status-monitor', {
        method: 'POST'
      })
      
      if (!response.ok) {
        throw new Error('Failed to clear stuck syncs')
      }
      
      const result = await response.json()
      return result.stuckSyncs || 0
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to clear stuck syncs')
      throw err
    }
  }, [])

  return {
    syncing,
    error,
    triggerSync,
    clearStuckSyncs
  }
}

/**
 * Hook for sync progress tracking
 */
export function useSyncProgress(syncId: string | null) {
  const [progress, setProgress] = useState({
    itemsProcessed: 0,
    totalItems: 0,
    percentage: 0,
    estimatedTimeRemaining: null as number | null
  })
  const startTimeRef = useRef<number>()
  const intervalRef = useRef<NodeJS.Timeout>()

  useEffect(() => {
    if (!syncId) {
      setProgress({
        itemsProcessed: 0,
        totalItems: 0,
        percentage: 0,
        estimatedTimeRemaining: null
      })
      return
    }

    startTimeRef.current = Date.now()

    const updateProgress = async () => {
      try {
        // In a real implementation, this would fetch progress from the API
        // For now, we'll simulate progress
        const elapsed = Date.now() - (startTimeRef.current || 0)
        const simulatedProgress = Math.min(95, (elapsed / 60000) * 100) // 1 minute = 100%
        
        setProgress({
          itemsProcessed: Math.floor(simulatedProgress * 10),
          totalItems: 1000,
          percentage: simulatedProgress,
          estimatedTimeRemaining: simulatedProgress > 0 
            ? Math.max(0, 60000 - elapsed) 
            : null
        })
      } catch (error) {
        console.error('Error updating sync progress:', error)
      }
    }

    updateProgress()
    intervalRef.current = setInterval(updateProgress, 1000)

    return () => {
      if (intervalRef.current) {
        clearInterval(intervalRef.current)
      }
    }
  }, [syncId])

  return progress
}

/**
 * Hook for sync history
 */
export function useSyncHistory(days: number = 30) {
  const [history, setHistory] = useState<SyncLog[]>([])
  const [loading, setLoading] = useState(true)
  const [stats, setStats] = useState<any>(null)

  useEffect(() => {
    const loadHistory = async () => {
      try {
        setLoading(true)
        const [logs, syncStats] = await Promise.all([
          getRecentSyncLogs(100), // Get more logs for history
          getSyncStats(days)
        ])
        
        // Filter logs by date range
        const cutoffDate = new Date()
        cutoffDate.setDate(cutoffDate.getDate() - days)
        
        const filteredLogs = logs.filter((log: SyncLog) => 
          new Date(log.started_at) >= cutoffDate
        )
        
        setHistory(filteredLogs)
        setStats(syncStats)
      } catch (error) {
        console.error('Error loading sync history:', error)
      } finally {
        setLoading(false)
      }
    }

    loadHistory()
  }, [days])

  return { history, stats, loading }
}
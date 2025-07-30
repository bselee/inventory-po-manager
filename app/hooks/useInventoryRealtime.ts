/**
 * Enhanced Real-time Inventory Hook with Critical Monitoring
 * Provides real-time updates and critical item alerts
 */

import { useState, useEffect, useCallback, useRef } from 'react'
import { supabase } from '@/app/lib/supabase'
import { getCriticalItemMonitor, CriticalItem, DEFAULT_MONITOR_CONFIG } from '@/app/lib/real-time-monitor'
import { InventoryItem } from '@/app/types'
import type { RealtimeChannel } from '@supabase/supabase-js'

export interface CriticalAlert {
  id: string
  item: CriticalItem
  alertType: 'out_of_stock' | 'low_stock' | 'critical_stockout'
  urgencyLevel: 'critical' | 'high' | 'medium' | 'low'
  message: string
  timestamp: Date
}

export interface RealTimeInventoryState {
  items: InventoryItem[]
  isConnected: boolean
  lastUpdate: Date | null
  criticalAlerts: CriticalAlert[]
  connectionStatus: 'connecting' | 'connected' | 'disconnected' | 'error'
}

export interface RealTimeInventoryOptions {
  enableCriticalMonitoring?: boolean
  filters?: {
    vendor?: string
    location?: string
    lowStockOnly?: boolean
  }
  onCriticalAlert?: (alert: CriticalAlert) => void
  onConnectionChange?: (status: string) => void
}

/**
 * Real-time inventory hook with critical monitoring
 */
export function useInventoryRealtime(options: RealTimeInventoryOptions = {}) {
  const [state, setState] = useState<RealTimeInventoryState>({
    items: [],
    isConnected: false,
    lastUpdate: null,
    criticalAlerts: [],
    connectionStatus: 'disconnected'
  })

  const channelRef = useRef<RealtimeChannel | null>(null)
  const monitorRef = useRef<ReturnType<typeof getCriticalItemMonitor> | null>(null)
  const alertUnsubscribeRef = useRef<(() => void) | null>(null)

  /**
   * Handle real-time inventory updates
   */
  const handleInventoryChange = useCallback((payload: any) => {
    console.log('[useInventoryRealtime] Inventory change:', payload.eventType, payload.new?.sku)

    setState(prev => {
      let newItems = [...prev.items]

      switch (payload.eventType) {
        case 'INSERT':
          if (payload.new && !newItems.find(item => item.id === payload.new.id)) {
            newItems.push(payload.new)
          }
          break

        case 'UPDATE':
          if (payload.new) {
            const index = newItems.findIndex(item => item.id === payload.new.id)
            if (index >= 0) {
              newItems[index] = payload.new
            } else {
              newItems.push(payload.new) // Item wasn't in our current set
            }
          }
          break

        case 'DELETE':
          if (payload.old) {
            newItems = newItems.filter(item => item.id !== payload.old.id)
          }
          break
      }

      // Apply filters if specified
      if (options.filters) {
        newItems = applyFilters(newItems, options.filters)
      }

      return {
        ...prev,
        items: newItems,
        lastUpdate: new Date()
      }
    })
  }, [options.filters])

  /**
   * Handle critical alerts
   */
  const handleCriticalAlert = useCallback((alert: CriticalAlert) => {
    console.log('[useInventoryRealtime] Critical alert:', alert.alertType, alert.item.sku)

    setState(prev => ({
      ...prev,
      criticalAlerts: [alert, ...prev.criticalAlerts.slice(0, 9)] // Keep last 10 alerts
    }))

    // Call user callback if provided
    if (options.onCriticalAlert) {
      options.onCriticalAlert(alert)
    }
  }, [options.onCriticalAlert])

  /**
   * Handle connection status changes
   */
  const handleConnectionChange = useCallback((status: string) => {
    console.log('[useInventoryRealtime] Connection status:', status)

    const connectionStatus = mapSupabaseStatus(status)
    
    setState(prev => ({
      ...prev,
      isConnected: connectionStatus === 'connected',
      connectionStatus
    }))

    if (options.onConnectionChange) {
      options.onConnectionChange(status)
    }
  }, [options.onConnectionChange])

  /**
   * Load initial inventory data
   */
  const loadInitialData = useCallback(async () => {
    try {
      setState(prev => ({ ...prev, connectionStatus: 'connecting' }))

      let query = supabase.from('inventory_items').select('*')

      // Apply filters to initial query
      if (options.filters) {
        if (options.filters.vendor) {
          query = query.ilike('vendor', `%${options.filters.vendor}%`)
        }
        if (options.filters.location) {
          query = query.ilike('location', `%${options.filters.location}%`)
        }
        if (options.filters.lowStockOnly) {
          query = query.filter('stock', 'lte', 'reorder_point')
        }
      }

      const { data: items, error } = await query.order('product_name').limit(1000)

      if (error) {
        console.error('[useInventoryRealtime] Failed to load initial data:', error)
        setState(prev => ({ ...prev, connectionStatus: 'error' }))
        return
      }

      setState(prev => ({
        ...prev,
        items: items || [],
        lastUpdate: new Date()
      }))

    } catch (error) {
      console.error('[useInventoryRealtime] Error loading initial data:', error)
      setState(prev => ({ ...prev, connectionStatus: 'error' }))
    }
  }, [options.filters])

  /**
   * Set up real-time subscription
   */
  const setupRealtimeSubscription = useCallback(() => {
    if (channelRef.current) {
      console.log('[useInventoryRealtime] Cleaning up existing channel')
      supabase.removeChannel(channelRef.current)
    }

    console.log('[useInventoryRealtime] Setting up real-time subscription')

    // Create new channel for inventory changes
    channelRef.current = supabase
      .channel('inventory_realtime')
      .on('postgres_changes', {
        event: '*',
        schema: 'public',
        table: 'inventory_items'
      }, handleInventoryChange)
      .subscribe((status) => {
        handleConnectionChange(status)
      })

  }, [handleInventoryChange, handleConnectionChange])

  /**
   * Set up critical monitoring
   */
  const setupCriticalMonitoring = useCallback(async () => {
    if (!options.enableCriticalMonitoring) return

    try {
      console.log('[useInventoryRealtime] Setting up critical monitoring')

      // Get or create monitor instance
      monitorRef.current = getCriticalItemMonitor(DEFAULT_MONITOR_CONFIG)

      // Subscribe to alerts
      alertUnsubscribeRef.current = monitorRef.current.onAlert(handleCriticalAlert)

      // Start monitoring if not already started
      await monitorRef.current.startMonitoring()

    } catch (error) {
      console.error('[useInventoryRealtime] Failed to setup critical monitoring:', error)
    }
  }, [options.enableCriticalMonitoring, handleCriticalAlert])

  /**
   * Initialize everything
   */
  useEffect(() => {
    loadInitialData()
    setupRealtimeSubscription()
    setupCriticalMonitoring()

    return () => {
      // Cleanup on unmount
      if (channelRef.current) {
        supabase.removeChannel(channelRef.current)
        channelRef.current = null
      }
      
      if (alertUnsubscribeRef.current) {
        alertUnsubscribeRef.current()
        alertUnsubscribeRef.current = null
      }
    }
  }, [loadInitialData, setupRealtimeSubscription, setupCriticalMonitoring])

  /**
   * Acknowledge alert
   */
  const acknowledgeAlert = useCallback(async (alertId: string) => {
    setState(prev => ({
      ...prev,
      criticalAlerts: prev.criticalAlerts.map(alert =>
        alert.id === alertId ? { ...alert, acknowledged: true } : alert
      )
    }))

    // Update in database
    try {
      await supabase
        .from('inventory_alerts')
        .update({ acknowledged: true })
        .eq('id', alertId)
    } catch (error) {
      console.error('[useInventoryRealtime] Failed to acknowledge alert:', error)
    }
  }, [])

  /**
   * Clear all alerts
   */
  const clearAlerts = useCallback(() => {
    setState(prev => ({
      ...prev,
      criticalAlerts: []
    }))
  }, [])

  /**
   * Refresh data manually
   */
  const refresh = useCallback(() => {
    loadInitialData()
  }, [loadInitialData])

  /**
   * Get connection diagnostics
   */
  const getDiagnostics = useCallback(() => {
    return {
      isConnected: state.isConnected,
      connectionStatus: state.connectionStatus,
      lastUpdate: state.lastUpdate,
      itemCount: state.items.length,
      alertCount: state.criticalAlerts.length,
      monitorStatus: monitorRef.current?.getStatus() || null
    }
  }, [state])

  return {
    // State
    items: state.items,
    isConnected: state.isConnected,
    connectionStatus: state.connectionStatus,
    lastUpdate: state.lastUpdate,
    criticalAlerts: state.criticalAlerts,

    // Actions
    acknowledgeAlert,
    clearAlerts,
    refresh,
    getDiagnostics
  }
}

/**
 * Simplified hook for just critical alerts
 */
export function useCriticalAlerts(onAlert?: (alert: CriticalAlert) => void) {
  const [alerts, setAlerts] = useState<CriticalAlert[]>([])
  const [isMonitoring, setIsMonitoring] = useState(false)

  useEffect(() => {
    let unsubscribe: (() => void) | null = null

    const setup = async () => {
      try {
        const monitor = getCriticalItemMonitor()
        
        unsubscribe = monitor.onAlert((alert) => {
          setAlerts(prev => [alert, ...prev.slice(0, 19)]) // Keep last 20
          if (onAlert) onAlert(alert)
        })

        await monitor.startMonitoring()
        setIsMonitoring(true)
      } catch (error) {
        console.error('[useCriticalAlerts] Setup failed:', error)
      }
    }

    setup()

    return () => {
      if (unsubscribe) unsubscribe()
    }
  }, [onAlert])

  const acknowledgeAlert = useCallback(async (alertId: string) => {
    setAlerts(prev => prev.map(alert =>
      alert.id === alertId ? { ...alert, acknowledged: true } : alert
    ))
  }, [])

  const clearAlerts = useCallback(() => {
    setAlerts([])
  }, [])

  return {
    alerts,
    isMonitoring,
    acknowledgeAlert,
    clearAlerts
  }
}

/**
 * Hook for filtered real-time inventory
 */
export function useInventoryRealtimeFiltered(filters: {
  vendor?: string
  location?: string
  stockStatus?: 'all' | 'low' | 'out' | 'adequate'
}) {
  const options: RealTimeInventoryOptions = {
    enableCriticalMonitoring: filters.stockStatus === 'low' || filters.stockStatus === 'out',
    filters: {
      vendor: filters.vendor,
      location: filters.location,
      lowStockOnly: filters.stockStatus === 'low' || filters.stockStatus === 'out'
    }
  }

  return useInventoryRealtime(options)
}

/**
 * Utility functions
 */

function mapSupabaseStatus(status: string): RealTimeInventoryState['connectionStatus'] {
  switch (status) {
    case 'SUBSCRIBED':
      return 'connected'
    case 'CLOSED':
      return 'disconnected'
    case 'CHANNEL_ERROR':
    case 'TIMED_OUT':
      return 'error'
    default:
      return 'connecting'
  }
}

function applyFilters(items: InventoryItem[], filters: NonNullable<RealTimeInventoryOptions['filters']>): InventoryItem[] {
  let filtered = items

  if (filters.vendor) {
    filtered = filtered.filter(item =>
      item.vendor?.toLowerCase().includes(filters.vendor!.toLowerCase())
    )
  }

  if (filters.location) {
    filtered = filtered.filter(item =>
      item.location?.toLowerCase().includes(filters.location!.toLowerCase())
    )
  }

  if (filters.lowStockOnly) {
    filtered = filtered.filter(item =>
      (item.stock || 0) <= (item.reorder_point || 0)
    )
  }

  return filtered
}

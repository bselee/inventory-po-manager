import { NextResponse } from 'next/server'
import { supabase } from '@/app/lib/supabase'
import { getCachedData, setCachedData } from '@/app/lib/cache/redis-client'
import { createApiHandler, apiResponse, apiError } from '@/app/lib/api-handler'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'
export const maxDuration = 60

interface DashboardMetrics {
  totalInventoryValue: number
  totalSKUs: number
  criticalItems: number
  lowStockItems: number
  healthyItems: number
  overstockedItems: number
  averageSalesVelocity: number
  totalPendingPOs: number
  lastSyncTime: string | null
  cacheStatus: 'hit' | 'miss'
}

export const GET = createApiHandler(async () => {
  try {
    // Try to get cached metrics first
    const cacheKey = 'dashboard:metrics'
    let cached = null
    
    try {
      cached = await getCachedData(cacheKey)
    } catch (cacheError) {
      console.warn('Cache not available, proceeding without cache:', cacheError)
    }
    
    if (cached) {
      return apiResponse(cached, { cacheStatus: 'hit' })
    }

    // Calculate fresh metrics
    const startTime = Date.now()

    // Use the existing inventory API endpoint for consistency
    const inventoryResponse = await fetch(`${process.env.NEXT_PUBLIC_BASE_URL || 'http://localhost:3000'}/api/inventory`)
    if (!inventoryResponse.ok) throw new Error('Failed to fetch inventory')
    
    const inventoryData = await inventoryResponse.json()
    const inventory = inventoryData.inventory || []

    // Get pending POs
    const { data: pendingPOs, error: poError } = await supabase
      .from('purchase_orders')
      .select('id')
      .in('status', ['pending', 'submitted', 'approved'])

    if (poError) throw poError

    // Get last sync time
    const { data: lastSync, error: syncError } = await supabase
      .from('sync_logs')
      .select('created_at')
      .order('created_at', { ascending: false })
      .limit(1)
      .single()

    // Calculate metrics
    let totalInventoryValue = 0
    let criticalItems = 0
    let lowStockItems = 0
    let healthyItems = 0
    let overstockedItems = 0
    let totalVelocity = 0
    let velocityCount = 0

    for (const item of inventory || []) {
      // Skip empty items
      if (!item.sku) continue
      
      // Calculate inventory value
      const stock = item.current_stock || 0
      const cost = item.cost || 0
      const value = stock * cost
      totalInventoryValue += value

      // Calculate stock status based on stock status level
      const stockStatus = item.stock_status_level || 'unknown'
      
      if (stockStatus === 'critical') {
        criticalItems++
      } else if (stockStatus === 'low') {
        lowStockItems++
      } else if (stockStatus === 'adequate') {
        healthyItems++
      } else if (stockStatus === 'overstocked') {
        overstockedItems++
      }

      // Track velocity for average
      const velocity = item.sales_velocity || 0
      if (velocity > 0) {
        totalVelocity += velocity
        velocityCount++
      }
    }

    const metrics: DashboardMetrics = {
      totalInventoryValue: Math.round(totalInventoryValue * 100) / 100,
      totalSKUs: inventory?.length || 0,
      criticalItems,
      lowStockItems,
      healthyItems,
      overstockedItems,
      averageSalesVelocity: velocityCount > 0 
        ? Math.round((totalVelocity / velocityCount) * 100) / 100 
        : 0,
      totalPendingPOs: pendingPOs?.length || 0,
      lastSyncTime: lastSync?.created_at || null,
      cacheStatus: 'miss'
    }

    // Cache for 5 minutes (if available)
    try {
      await setCachedData(cacheKey, metrics, 300)
    } catch (cacheError) {
      console.warn('Failed to cache metrics:', cacheError)
    }

    // Check performance
    const responseTime = Date.now() - startTime
    if (responseTime > 200) {
      console.warn(`Dashboard metrics took ${responseTime}ms to calculate`)
    }

    return apiResponse(metrics, { 
      responseTime,
      itemsProcessed: inventory?.length || 0 
    })

  } catch (error) {
    console.error('Dashboard metrics error:', error)
    return apiError(error instanceof Error ? error : new Error('Failed to fetch metrics'))
  }
})
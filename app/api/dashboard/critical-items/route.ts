import { NextResponse } from 'next/server'
import { supabase } from '@/app/lib/supabase'
import { getCachedData, setCachedData } from '@/app/lib/cache/redis-client'
import { createApiHandler, apiResponse, apiError } from '@/app/lib/api-handler'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'
export const maxDuration = 60

interface CriticalItem {
  id: string
  sku: string
  product_title: string
  available_quantity: number
  sales_velocity_30_day: number
  days_until_stockout: number
  reorder_point: number
  vendor_name: string | null
  last_order_date: string | null
  status: 'critical' | 'low' | 'reorder_needed'
  action_required: string
}

export const GET = createApiHandler(async ({ query }) => {
  try {
    const limit = parseInt(query.get('limit') || '20')
    
    // Try cache first
    const cacheKey = `dashboard:critical-items:${limit}`
    let cached = null
    
    try {
      cached = await getCachedData(cacheKey)
    } catch (cacheError) {
      console.warn('Cache not available, proceeding without cache:', cacheError)
    }
    
    if (cached) {
      return apiResponse(cached, { cacheStatus: 'hit' })
    }

    // Use the existing inventory API endpoint for consistency
    const inventoryResponse = await fetch(`${process.env.NEXT_PUBLIC_BASE_URL || 'http://localhost:3000'}/api/inventory`)
    if (!inventoryResponse.ok) throw new Error('Failed to fetch inventory')
    
    const inventoryData = await inventoryResponse.json()
    const items = inventoryData.inventory || []

    // Calculate critical items
    const criticalItems: CriticalItem[] = []

    for (const item of items || []) {
      // Skip empty items
      if (!item.sku) continue
      
      const velocity = item.sales_velocity || 0
      const available = item.current_stock || 0
      const reorderPoint = item.reorder_point || 0
      const stockStatus = item.stock_status_level || 'unknown'
      
      // Only include critical or low stock items
      if (stockStatus !== 'critical' && stockStatus !== 'low') {
        continue
      }
      
      // Calculate days until stockout
      const daysUntilStockout = velocity > 0 ? available / velocity : 999
      
      // Determine status and action
      let status: CriticalItem['status'] = 'reorder_needed'
      let actionRequired = 'Monitor stock levels'
      
      if (stockStatus === 'critical') {
        status = 'critical'
        actionRequired = 'URGENT: Create PO immediately'
      } else if (stockStatus === 'low') {
        status = 'low'
        actionRequired = 'Create PO within 3 days'
      } else if (available <= reorderPoint) {
        status = 'reorder_needed'
        actionRequired = 'Reorder point reached'
      }

      criticalItems.push({
        id: item.finale_id || item.sku,
        sku: item.sku,
        product_title: item.product_name || 'Unknown Product',
        available_quantity: available,
        sales_velocity_30_day: velocity,
        days_until_stockout: Math.round(daysUntilStockout * 10) / 10,
        reorder_point: reorderPoint,
        vendor_name: item.vendor || 'Unknown',
        last_order_date: null, // We'll skip PO lookup for MVP
        status,
        action_required: actionRequired
      })
    }

    // Sort by urgency (days until stockout)
    criticalItems.sort((a, b) => a.days_until_stockout - b.days_until_stockout)

    // Limit results
    const limitedItems = criticalItems.slice(0, limit)

    // Cache for 5 minutes (if available)
    try {
      await setCachedData(cacheKey, limitedItems, 300)
    } catch (cacheError) {
      console.warn('Failed to cache critical items:', cacheError)
    }

    return apiResponse(limitedItems, {
      total: criticalItems.length,
      showing: limitedItems.length,
      cacheStatus: 'miss'
    })

  } catch (error) {
    console.error('Critical items error:', error)
    return apiError(error instanceof Error ? error : new Error('Failed to fetch critical items'))
  }
})
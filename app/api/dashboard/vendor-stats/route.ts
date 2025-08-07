import { NextResponse } from 'next/server'
import { supabase } from '@/app/lib/supabase'
import { getCachedData, setCachedData } from '@/app/lib/cache/redis-client'
import { createApiHandler, apiResponse, apiError } from '@/app/lib/api-handler'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'
export const maxDuration = 60

interface VendorStats {
  topVendors: {
    id: string
    name: string
    totalOrders: number
    totalSpent: number
    averageLeadTime: number
    onTimeDeliveryRate: number
    itemsSuppiled: number
    lastOrderDate: string | null
  }[]
  performanceMetrics: {
    bestLeadTime: { vendor: string, days: number }
    mostReliable: { vendor: string, onTimeRate: number }
    highestVolume: { vendor: string, orders: number }
    mostCriticalSupplier: { vendor: string, criticalItems: number }
  }
  alerts: {
    vendor: string
    issue: string
    severity: 'high' | 'medium' | 'low'
  }[]
}

export const GET = createApiHandler(async ({ query }) => {
  try {
    const limit = parseInt(query.get('limit') || '10')
    
    // Try cache first
    const cacheKey = `dashboard:vendor-stats:${limit}`
    let cached = null
    
    try {
      cached = await getCachedData(cacheKey)
    } catch (cacheError) {
      console.warn('Cache not available, proceeding without cache:', cacheError)
    }
    
    if (cached) {
      return apiResponse(cached, { cacheStatus: 'hit' })
    }

    // Get all vendors with their PO history
    const { data: vendors, error: vendorError } = await supabase
      .from('vendors')
      .select(`
        *,
        purchase_orders (
          id,
          status,
          created_at,
          expected_delivery,
          actual_delivery,
          total_amount
        ),
        inventory_items (
          id,
          sku,
          available_quantity,
          sales_velocity_30_day
        )
      `)
      .order('name')

    if (vendorError) throw vendorError

    // Calculate stats for each vendor
    const vendorStats = []
    const alerts = []

    for (const vendor of vendors || []) {
      const orders = vendor.purchase_orders || []
      const items = vendor.inventory_items || []
      
      // Calculate average lead time
      let totalLeadTime = 0
      let leadTimeCount = 0
      let onTimeCount = 0
      
      for (const order of orders) {
        if (order.actual_delivery && order.created_at) {
          const created = new Date(order.created_at)
          const delivered = new Date(order.actual_delivery)
          const leadTime = (delivered.getTime() - created.getTime()) / (1000 * 60 * 60 * 24)
          totalLeadTime += leadTime
          leadTimeCount++
          
          // Check if on time
          if (order.expected_delivery) {
            const expected = new Date(order.expected_delivery)
            if (delivered <= expected) {
              onTimeCount++
            }
          }
        }
      }
      
      const avgLeadTime = leadTimeCount > 0 ? totalLeadTime / leadTimeCount : 0
      const onTimeRate = leadTimeCount > 0 ? (onTimeCount / leadTimeCount) * 100 : 0
      
      // Calculate total spent
      const totalSpent = orders.reduce((sum, order) => sum + (order.total_amount || 0), 0)
      
      // Find last order date
      const lastOrder = orders
        .filter(o => o.created_at)
        .sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime())[0]
      
      // Check for critical items from this vendor
      let criticalItemCount = 0
      for (const item of items) {
        const velocity = item.sales_velocity_30_day || 0
        const available = item.available_quantity || 0
        const daysStock = velocity > 0 ? available / velocity : 999
        if (daysStock <= 7) {
          criticalItemCount++
        }
      }
      
      // Generate alerts
      if (onTimeRate < 80 && leadTimeCount >= 3) {
        alerts.push({
          vendor: vendor.name,
          issue: `Low on-time delivery rate: ${Math.round(onTimeRate)}%`,
          severity: 'high' as const
        })
      }
      
      if (criticalItemCount > 0) {
        alerts.push({
          vendor: vendor.name,
          issue: `${criticalItemCount} critical items need ordering`,
          severity: criticalItemCount > 3 ? 'high' as const : 'medium' as const
        })
      }
      
      if (lastOrder && new Date(lastOrder.created_at) < new Date(Date.now() - 60 * 24 * 60 * 60 * 1000)) {
        alerts.push({
          vendor: vendor.name,
          issue: 'No orders in 60+ days',
          severity: 'low' as const
        })
      }
      
      vendorStats.push({
        id: vendor.id,
        name: vendor.name,
        totalOrders: orders.length,
        totalSpent: Math.round(totalSpent * 100) / 100,
        averageLeadTime: Math.round(avgLeadTime * 10) / 10,
        onTimeDeliveryRate: Math.round(onTimeRate),
        itemsSuppiled: items.length,
        lastOrderDate: lastOrder?.created_at || null,
        criticalItemCount
      })
    }
    
    // Sort by total spent (most important vendors)
    vendorStats.sort((a, b) => b.totalSpent - a.totalSpent)
    
    // Find best performers
    const bestLeadTime = vendorStats
      .filter(v => v.averageLeadTime > 0)
      .sort((a, b) => a.averageLeadTime - b.averageLeadTime)[0]
      
    const mostReliable = vendorStats
      .filter(v => v.totalOrders >= 3)
      .sort((a, b) => b.onTimeDeliveryRate - a.onTimeDeliveryRate)[0]
      
    const highestVolume = vendorStats
      .sort((a, b) => b.totalOrders - a.totalOrders)[0]
      
    const mostCritical = vendorStats
      .sort((a, b) => b.criticalItemCount - a.criticalItemCount)[0]

    const stats: VendorStats = {
      topVendors: vendorStats.slice(0, limit).map(v => ({
        id: v.id,
        name: v.name,
        totalOrders: v.totalOrders,
        totalSpent: v.totalSpent,
        averageLeadTime: v.averageLeadTime,
        onTimeDeliveryRate: v.onTimeDeliveryRate,
        itemsSuppiled: v.itemsSuppiled,
        lastOrderDate: v.lastOrderDate
      })),
      performanceMetrics: {
        bestLeadTime: bestLeadTime 
          ? { vendor: bestLeadTime.name, days: bestLeadTime.averageLeadTime }
          : { vendor: 'N/A', days: 0 },
        mostReliable: mostReliable
          ? { vendor: mostReliable.name, onTimeRate: mostReliable.onTimeDeliveryRate }
          : { vendor: 'N/A', onTimeRate: 0 },
        highestVolume: highestVolume
          ? { vendor: highestVolume.name, orders: highestVolume.totalOrders }
          : { vendor: 'N/A', orders: 0 },
        mostCriticalSupplier: mostCritical
          ? { vendor: mostCritical.name, criticalItems: mostCritical.criticalItemCount }
          : { vendor: 'N/A', criticalItems: 0 }
      },
      alerts: alerts.sort((a, b) => {
        const severityOrder = { high: 0, medium: 1, low: 2 }
        return severityOrder[a.severity] - severityOrder[b.severity]
      }).slice(0, 10)
    }

    // Cache for 10 minutes (if available)
    try {
      await setCachedData(cacheKey, stats, 600)
    } catch (cacheError) {
      console.warn('Failed to cache vendor stats:', cacheError)
    }

    return apiResponse(stats, {
      totalVendors: vendors?.length || 0,
      cacheStatus: 'miss'
    })

  } catch (error) {
    console.error('Vendor stats error:', error)
    return apiError(error instanceof Error ? error : new Error('Failed to fetch vendor stats'))
  }
})
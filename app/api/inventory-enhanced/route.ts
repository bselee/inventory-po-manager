import { NextResponse } from 'next/server'
import { finaleMultiReportService } from '@/app/lib/finale-multi-report-service'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'
export const maxDuration = 300 // 5 minutes for multi-report sync

// GET /api/inventory-enhanced - Fetch enhanced inventory with consumption data
export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url)
    
    // Check if force refresh is requested
    const forceRefresh = searchParams.get('refresh') === 'true'
    
    // Get filter parameters
    const status = searchParams.get('status')
    const vendor = searchParams.get('vendor')
    const location = searchParams.get('location')
    const search = searchParams.get('search')
    const velocityType = searchParams.get('velocityType') || 'all' // all, sales, consumption
    const page = parseInt(searchParams.get('page') || '1')
    const limit = parseInt(searchParams.get('limit') || '100')
    const sortBy = searchParams.get('sortBy') || 'sku'
    const sortDirection = searchParams.get('sortDirection') || 'asc'
    
    // Fetch enhanced inventory from multi-report service
    const allItems = await finaleMultiReportService.getCombinedInventory(forceRefresh)
    
    // Apply filters
    let filteredItems = [...allItems]
    
    // Status filter
    if (status && status !== 'all') {
      if (status === 'out-of-stock') {
        filteredItems = filteredItems.filter(item => item.current_stock === 0)
      } else if (status === 'in-stock') {
        filteredItems = filteredItems.filter(item => item.current_stock > 0)
      } else {
        filteredItems = filteredItems.filter(item => item.stock_status === status)
      }
    }
    
    // Vendor filter
    if (vendor) {
      filteredItems = filteredItems.filter(item => 
        item.vendor && item.vendor.toLowerCase().includes(vendor.toLowerCase())
      )
    }
    
    // Location filter
    if (location) {
      filteredItems = filteredItems.filter(item => 
        item.location && item.location.toLowerCase().includes(location.toLowerCase())
      )
    }
    
    // Velocity type filter
    if (velocityType === 'sales') {
      filteredItems = filteredItems.filter(item => item.sales_velocity > 0)
    } else if (velocityType === 'consumption') {
      filteredItems = filteredItems.filter(item => item.consumption_velocity > 0)
    }
    
    // Search filter
    if (search) {
      const searchLower = search.toLowerCase()
      filteredItems = filteredItems.filter(item => 
        item.sku.toLowerCase().includes(searchLower) ||
        item.product_name.toLowerCase().includes(searchLower) ||
        (item.vendor && item.vendor.toLowerCase().includes(searchLower))
      )
    }
    
    // Sort items
    filteredItems.sort((a, b) => {
      let aVal = a[sortBy as keyof typeof a]
      let bVal = b[sortBy as keyof typeof b]
      
      // Handle null/undefined values
      if (aVal === null || aVal === undefined) aVal = ''
      if (bVal === null || bVal === undefined) bVal = ''
      
      // Handle numeric sorting
      if (typeof aVal === 'number' && typeof bVal === 'number') {
        return sortDirection === 'asc' ? aVal - bVal : bVal - aVal
      }
      
      // String sorting
      const comparison = String(aVal).localeCompare(String(bVal))
      return sortDirection === 'asc' ? comparison : -comparison
    })
    
    // Pagination
    const total = filteredItems.length
    const totalPages = Math.ceil(total / limit)
    const startIndex = (page - 1) * limit
    const endIndex = startIndex + limit
    const paginatedItems = filteredItems.slice(startIndex, endIndex)
    
    // Get summary statistics
    const summary = await finaleMultiReportService.getMetricsSummary()
    
    // Add enhanced data quality metrics
    const dataQuality = {
      itemsWithVendor: allItems.filter(item => item.vendor && item.vendor.trim() !== '').length,
      itemsWithSales: summary.items_with_sales,
      itemsWithConsumption: summary.items_with_consumption,
      itemsWithBoth: summary.items_with_both,
      totalItems: allItems.length
    }
    
    // Calculate velocity insights
    const velocityInsights = {
      avgSalesVelocity: summary.avg_sales_velocity,
      avgConsumptionVelocity: summary.avg_consumption_velocity,
      highVelocityItems: allItems.filter(item => item.total_velocity > 10).length,
      slowMovingItems: allItems.filter(item => 
        item.total_velocity > 0 && item.total_velocity < 1
      ).length,
      deadStock: allItems.filter(item => 
        item.total_velocity === 0 && item.current_stock > 0
      ).length
    }
    
    return NextResponse.json({
      items: paginatedItems,
      pagination: {
        page,
        limit,
        total,
        totalPages
      },
      summary: {
        ...summary,
        dataQuality,
        velocityInsights
      },
      metadata: {
        lastSync: summary.last_sync,
        source: 'finale-multi-report',
        reportsUsed: ['inventory', 'consumption-14day', 'consumption-30day']
      }
    })
    
  } catch (error) {
    console.error('[Enhanced Inventory API] Error:', error)
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Failed to fetch enhanced inventory' },
      { status: 500 }
    )
  }
}

// POST /api/inventory-enhanced/sync - Manually trigger sync
export async function POST(request: Request) {
  try {
    const body = await request.json().catch(() => ({}))
    const { clearCache = false } = body
    
    if (clearCache) {
      console.log('[Enhanced Inventory] Clearing cache before sync...')
      await finaleMultiReportService.clearCache()
    }
    
    console.log('[Enhanced Inventory] Starting manual sync...')
    const startTime = Date.now()
    
    try {
      // Force refresh to trigger sync
      const inventory = await finaleMultiReportService.getCombinedInventory(true)
      const summary = await finaleMultiReportService.getMetricsSummary()
      
      const endTime = Date.now()
      const duration = endTime - startTime
      
      return NextResponse.json({
        success: true,
        message: 'Enhanced inventory sync completed successfully',
        stats: {
          itemsSynced: inventory.length,
          itemsWithVendor: inventory.filter(item => item.vendor).length,
          itemsWithSales: summary.items_with_sales,
          itemsWithConsumption: summary.items_with_consumption,
          itemsWithBoth: summary.items_with_both,
          duration: `${(duration / 1000).toFixed(2)}s`
        },
        summary
      })
      
    } catch (syncError) {
      console.error('[Enhanced Inventory] Sync failed:', syncError)
      
      return NextResponse.json(
        { 
          error: 'Sync failed',
          details: syncError instanceof Error ? syncError.message : 'Unknown error',
          duration: `${((Date.now() - startTime) / 1000).toFixed(2)}s`
        },
        { status: 500 }
      )
    }
    
  } catch (error) {
    console.error('[Enhanced Inventory Sync] Error:', error)
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Failed to start sync' },
      { status: 500 }
    )
  }
}
import { NextResponse } from 'next/server'
import { kvInventoryService } from '@/app/lib/kv-inventory-service'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'
export const maxDuration = 60

// GET /api/inventory-kv - Fetch inventory from KV cache
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
    const page = parseInt(searchParams.get('page') || '1')
    const limit = parseInt(searchParams.get('limit') || '100')
    const sortBy = searchParams.get('sortBy') || 'sku'
    const sortDirection = searchParams.get('sortDirection') || 'asc'
    
    // Fetch inventory from KV service
    const allItems = await kvInventoryService.getInventory(forceRefresh)
    
    // Apply filters
    let filteredItems = [...allItems]
    
    // Status filter
    if (status && status !== 'all') {
      if (status === 'out-of-stock') {
        filteredItems = filteredItems.filter(item => item.current_stock === 0)
      } else if (status === 'in-stock') {
        filteredItems = filteredItems.filter(item => item.current_stock > 0)
      } else {
        filteredItems = filteredItems.filter(item => item.stock_status_level === status)
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
    const summary = await kvInventoryService.getSummary()
    
    // Add data quality metrics
    const dataQuality = {
      itemsWithVendor: allItems.filter(item => item.vendor && item.vendor.trim() !== '').length,
      itemsWithReorderPoint: allItems.filter(item => item.reorder_point && item.reorder_point > 0).length,
      itemsWithSalesData: allItems.filter(item => item.sales_velocity && item.sales_velocity > 0).length,
      totalItems: allItems.length
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
        dataQuality
      },
      cacheInfo: {
        lastSync: summary.last_sync,
        source: 'redis-cache'
      }
    })
    
  } catch (error) {
    logError('[Inventory KV API] Error:', error)
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Failed to fetch inventory' },
      { status: 500 }
    )
  }
}
import { NextRequest, NextResponse } from 'next/server'
import { kvInventoryService } from '@/app/lib/kv-inventory-service'
import { logError } from '@/app/lib/logger'
import fs from 'fs/promises'
import path from 'path'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'
export const maxDuration = 60

// GET /api/inventory - Fetch inventory items from cache or Finale
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const forceRefresh = searchParams.get('forceRefresh') === 'true'
    const vendor = searchParams.get('vendor')
    const search = searchParams.get('search')
    const status = searchParams.get('status')
    const page = parseInt(searchParams.get('page') || '1')
    const limit = parseInt(searchParams.get('limit') || '100')
    const useSimpleCache = searchParams.get('source') === 'simple'
    
    let allItems = []
    
    // Check if we should use the simple file-based cache
    if (useSimpleCache) {
      try {
        const cacheFile = path.join(process.cwd(), '.inventory-cache.json')
        const cacheContent = await fs.readFile(cacheFile, 'utf-8')
        const cacheData = JSON.parse(cacheContent)
        allItems = cacheData.items || []
      } catch (error) {
        allItems = await kvInventoryService.getInventory(forceRefresh)
      }
    } else {
      // Get inventory from Redis/Finale (existing behavior)
      allItems = await kvInventoryService.getInventory(forceRefresh)
    }
    
    // Apply filters
    let filteredItems = allItems
    
    if (vendor) {
      filteredItems = filteredItems.filter(item => 
        item.vendor?.toLowerCase().includes(vendor.toLowerCase())
      )
    }
    
    if (search) {
      const searchLower = search.toLowerCase()
      filteredItems = filteredItems.filter(item =>
        item.sku?.toLowerCase().includes(searchLower) ||
        item.product_name?.toLowerCase().includes(searchLower)
      )
    }
    
    if (status) {
      switch (status) {
        case 'out-of-stock':
          filteredItems = filteredItems.filter(item => item.current_stock === 0)
          break
        case 'critical':
          filteredItems = filteredItems.filter(item => item.stock_status_level === 'critical')
          break
        case 'low-stock':
          filteredItems = filteredItems.filter(item => item.stock_status_level === 'low')
          break
        case 'adequate':
          filteredItems = filteredItems.filter(item => item.stock_status_level === 'adequate')
          break
        case 'overstocked':
          filteredItems = filteredItems.filter(item => item.stock_status_level === 'overstocked')
          break
        case 'in-stock':
          filteredItems = filteredItems.filter(item => item.current_stock > 0)
          break
      }
    }
    
    // Get summary
    const summary = await kvInventoryService.getSummary()
    
    // Apply pagination
    const startIndex = (page - 1) * limit
    const endIndex = startIndex + limit
    const paginatedItems = filteredItems.slice(startIndex, endIndex)
    
    return NextResponse.json({
      inventory: paginatedItems,
      pagination: {
        page,
        limit,
        total: filteredItems.length,
        totalPages: Math.ceil(filteredItems.length / limit)
      },
      summary,
      source: 'redis-finale'
    })
  } catch (error) {
    logError('Error in GET /api/inventory:', error)
    return NextResponse.json(
      { error: 'Failed to fetch inventory' },
      { status: 500 }
    )
  }
}

// POST /api/inventory - Not implemented for Redis/Finale (read-only)
export async function POST(request: NextRequest) {
  return NextResponse.json(
    { error: 'Creating inventory items is not supported when using Finale as the data source' },
    { status: 501 }
  )
}

// PUT /api/inventory - Not implemented for Redis/Finale (read-only) 
export async function PUT(request: NextRequest) {
  return NextResponse.json(
    { error: 'Updating inventory items is not supported when using Finale as the data source' },
    { status: 501 }
  )
}
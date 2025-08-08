import { NextRequest, NextResponse } from 'next/server'
import { logInfo, logError } from '@/app/lib/logger'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'
export const maxDuration = 60

// TEMPORARY EMERGENCY ENDPOINT - Remove after fixing production issues
export async function GET(request: NextRequest) {
  try {
    logInfo('Emergency sync started', {}, 'EMERGENCY_SYNC')
    
    // Get Finale credentials from environment
    const apiKey = process.env.FINALE_API_KEY
    const apiSecret = process.env.FINALE_API_SECRET
    const accountPath = process.env.FINALE_ACCOUNT_PATH
    
    if (!apiKey || !apiSecret || !accountPath) {
      return NextResponse.json({
        success: false,
        error: 'Finale API credentials not configured in environment variables'
      }, { status: 500 })
    }
    
    // Clean the account path
    const cleanPath = accountPath
      .replace(/^https?:\/\//, '')
      .replace(/\.finaleinventory\.com.*$/, '')
      .replace(/^app\./, '')
      .replace(/\/$/, '')
      .replace(/\/api$/, '')
      .trim()
    
    // Create auth header
    const authString = Buffer.from(`${apiKey}:${apiSecret}`).toString('base64')
    const authHeader = `Basic ${authString}`
    
    // Fetch inventory data
    const inventoryUrl = `https://app.finaleinventory.com/${cleanPath}/api/product`
    
    logInfo('Fetching inventory from Finale', { url: inventoryUrl }, 'EMERGENCY_SYNC')
    
    const inventoryResponse = await fetch(inventoryUrl, {
      method: 'GET',
      headers: {
        'Authorization': authHeader,
        'Accept': 'application/json',
        'Content-Type': 'application/json'
      }
    })
    
    if (!inventoryResponse.ok) {
      const errorText = await inventoryResponse.text()
      logError('Failed to fetch inventory', { 
        status: inventoryResponse.status, 
        statusText: inventoryResponse.statusText,
        error: errorText 
      }, 'EMERGENCY_SYNC')
      
      return NextResponse.json({
        success: false,
        error: `Failed to fetch inventory: ${inventoryResponse.status} ${inventoryResponse.statusText}`
      }, { status: inventoryResponse.status })
    }
    
    const inventoryData = await inventoryResponse.json()
    const products = Array.isArray(inventoryData) ? inventoryData : inventoryData.products || []
    
    // Transform products to our format
    const transformedInventory = products.map((item: any) => ({
      sku: item.productId || item.sku || '',
      product_name: item.productName || item.name || '',
      vendor: item.primarySupplierName || item.vendor || 'Unknown',
      current_stock: item.quantityAvailable || item.quantityOnHand || 0,
      cost: item.averageCost || item.cost || 0,
      location: item.facilityName || item.defaultLocationName || 'Main',
      reorder_point: item.reorderPoint || 10,
      sales_velocity: 0,
      days_until_stockout: null,
      stock_status_level: determineStockLevel(
        item.quantityAvailable || 0, 
        item.reorderPoint || 10
      ),
      last_updated: new Date().toISOString(),
      finale_id: item.productId
    }))
    
    // Fetch vendors
    const vendorsUrl = `https://app.finaleinventory.com/${cleanPath}/api/supplier`
    
    logInfo('Fetching vendors from Finale', { url: vendorsUrl }, 'EMERGENCY_SYNC')
    
    const vendorsResponse = await fetch(vendorsUrl, {
      method: 'GET',
      headers: {
        'Authorization': authHeader,
        'Accept': 'application/json',
        'Content-Type': 'application/json'
      }
    })
    
    let vendors = []
    if (vendorsResponse.ok) {
      const vendorsData = await vendorsResponse.json()
      vendors = Array.isArray(vendorsData) ? vendorsData : vendorsData.suppliers || []
    }
    
    // Try to store in Redis if available
    try {
      const { redis } = await import('@/app/lib/redis-client')
      
      if (redis) {
        // Store inventory
        await redis.set('inventory:full', transformedInventory, 900) // 15 minutes TTL
        
        // Store vendors
        await redis.set('vendors:full', vendors, 3600) // 1 hour TTL
        
        // Store summary
        const summary = {
          total_items: transformedInventory.length,
          total_inventory_value: transformedInventory.reduce((sum: number, item: any) => 
            sum + (item.current_stock * item.cost), 0
          ),
          out_of_stock_count: transformedInventory.filter((item: any) => 
            item.current_stock === 0
          ).length,
          low_stock_count: transformedInventory.filter((item: any) => 
            item.stock_status_level === 'low' || item.stock_status_level === 'critical'
          ).length,
          critical_reorder_count: transformedInventory.filter((item: any) => 
            item.stock_status_level === 'critical'
          ).length,
          vendors_count: vendors.length,
          last_sync: new Date().toISOString()
        }
        
        await redis.set('inventory:summary', summary, 300) // 5 minutes TTL
        await redis.set('inventory:last_sync', new Date().toISOString(), 3600)
        
        logInfo('Data stored in Redis cache', { 
          inventoryCount: transformedInventory.length,
          vendorsCount: vendors.length 
        }, 'EMERGENCY_SYNC')
      }
    } catch (redisError) {
      logError('Redis storage failed, but sync completed', redisError, 'EMERGENCY_SYNC')
    }
    
    // Also save to file as backup
    try {
      const fs = await import('fs/promises')
      const path = await import('path')
      
      const cacheFile = path.join(process.cwd(), '.inventory-cache.json')
      await fs.writeFile(cacheFile, JSON.stringify({
        items: transformedInventory,
        vendors: vendors,
        lastSync: new Date().toISOString(),
        totalItems: transformedInventory.length
      }, null, 2))
      
      logInfo('Backup cache file created', {}, 'EMERGENCY_SYNC')
    } catch (fileError) {
      logError('File backup failed', fileError, 'EMERGENCY_SYNC')
    }
    
    return NextResponse.json({
      success: true,
      message: 'Emergency sync completed successfully',
      data: {
        inventoryCount: transformedInventory.length,
        vendorsCount: vendors.length,
        timestamp: new Date().toISOString()
      }
    })
    
  } catch (error) {
    logError('Emergency sync failed', error, 'EMERGENCY_SYNC')
    
    return NextResponse.json({
      success: false,
      error: error instanceof Error ? error.message : 'Emergency sync failed',
      details: error instanceof Error ? error.stack : undefined
    }, { status: 500 })
  }
}

// Helper function to determine stock level
function determineStockLevel(
  currentStock: number, 
  reorderPoint: number
): 'critical' | 'low' | 'adequate' | 'overstocked' {
  if (currentStock === 0) return 'critical'
  if (currentStock < reorderPoint * 0.5) return 'critical'
  if (currentStock < reorderPoint) return 'low'
  if (currentStock > reorderPoint * 3) return 'overstocked'
  return 'adequate'
}
import { NextResponse } from 'next/server'
import { kvInventoryService } from '@/app/lib/kv-inventory-service'
import { redis } from '@/app/lib/redis-client'
import { logError } from '@/app/lib/logger'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'
export const maxDuration = 60

// POST /api/inventory-cache - Cache management operations
export async function POST(request: Request) {
  try {
    const body = await request.json()
    const { action } = body
    
    // Validate Redis connection first
    try {
      await redis.get('connection:test')
    } catch (error) {
      return NextResponse.json({
        success: false,
        error: 'Redis connection failed',
        details: error instanceof Error ? error.message : 'Unknown Redis error'
      }, { status: 503 })
    }
    
    switch (action) {
      case 'clearCache': {
        await kvInventoryService.clearCache()
        
        return NextResponse.json({
          success: true,
          message: 'All caches cleared successfully',
          timestamp: new Date().toISOString()
        })
      }
      
      case 'warmUpCache': {
        const startTime = Date.now()
        
        try {
          // Trigger cache refresh
          const inventory = await kvInventoryService.getInventory(true)
          const summary = await kvInventoryService.getSummary()
          const vendors = await kvInventoryService.getVendors()
          
          const duration = Date.now() - startTime
          
          return NextResponse.json({
            success: true,
            message: 'Cache warmed up successfully',
            stats: {
              itemsCached: inventory.length,
              vendorsCached: vendors.length,
              duration: `${(duration / 1000).toFixed(2)}s`
            },
            summary
          })
        } catch (error) {
          logError('[Cache Management] Warm up failed:', error)
          
          // Check if it's a configuration error
          if (error instanceof Error && error.message.includes('not configured')) {
            return NextResponse.json({
              success: false,
              error: 'Cache configuration error',
              details: error.message,
              hint: 'Please check your Finale API settings and report URLs in the settings page'
            }, { status: 400 })
          }
          
          // Check if it's a connection error
          if (error instanceof Error && (error.message.includes('Redis') || error.message.includes('ECONNREFUSED'))) {
            return NextResponse.json({
              success: false,
              error: 'Cache connection failed',
              details: 'Unable to connect to Redis cache',
              hint: 'Please check your Redis connection settings'
            }, { status: 503 })
          }
          
          // Generic error
          return NextResponse.json({
            success: false,
            error: 'Failed to warm up cache',
            details: error instanceof Error ? error.message : 'Unknown error'
          }, { status: 500 })
        }
      }
      
      case 'healthCheck': {
        try {
          // Test Redis connection
          const client = await redis.get('test:ping')
          await redis.set('test:ping', 'pong', 5) // 5 second TTL
          
          // Get cache stats
          const summary = await kvInventoryService.getSummary()
          const syncStatus = await kvInventoryService.getSyncStatus()
          
          // Check cache freshness
          const lastSyncTime = summary.last_sync ? new Date(summary.last_sync).getTime() : 0
          const cacheAge = Date.now() - lastSyncTime
          const isStale = cacheAge > (15 * 60 * 1000) // 15 minutes
          
          return NextResponse.json({
            success: true,
            health: {
              redisConnection: 'healthy',
              cacheStatus: isStale ? 'stale' : 'fresh',
              cacheAge: `${Math.floor(cacheAge / 1000 / 60)} minutes`,
              lastSync: summary.last_sync,
              nextSync: syncStatus.next_sync,
              itemsInCache: summary.total_items,
              vendorsInCache: summary.vendors_count
            }
          })
          
        } catch (error) {
          return NextResponse.json({
            success: false,
            health: {
              redisConnection: 'unhealthy',
              error: error instanceof Error ? error.message : 'Unknown error'
            }
          }, { status: 503 })
        }
      }
      
      default:
        return NextResponse.json(
          { error: `Unknown action: ${action}` },
          { status: 400 }
        )
    }
    
  } catch (error) {
    logError('[Cache Management] Error:', error)
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Cache operation failed' },
      { status: 500 }
    )
  }
}

// GET /api/inventory-cache - Get cache statistics
export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url)
    const forceRefresh = searchParams.get('forceRefresh') === 'true'
    
    if (forceRefresh) {
      // Trigger a refresh but return immediately
      kvInventoryService.getInventory(true).catch(error => {
        logError('[Cache Stats] Background sync error:', error)
      })
    }
    
    // Get current cache stats
    const summary = await kvInventoryService.getSummary()
    const syncStatus = await kvInventoryService.getSyncStatus()
    const vendors = await kvInventoryService.getVendors()
    
    // Calculate cache metrics
    const lastSyncTime = summary.last_sync ? new Date(summary.last_sync).getTime() : 0
    const cacheAge = Date.now() - lastSyncTime
    
    // Sample inventory items for quality check
    const inventory = await kvInventoryService.getInventory()
    const sampleSize = Math.min(100, inventory.length)
    const sample = inventory.slice(0, sampleSize)
    
    const stats = {
      cache: {
        totalItems: summary.total_items,
        totalValue: summary.total_inventory_value,
        lastSync: summary.last_sync,
        cacheAge: `${Math.floor(cacheAge / 1000 / 60)} minutes`,
        isStale: cacheAge > (15 * 60 * 1000),
        vendorsCount: vendors.length
      },
      dataQuality: {
        itemsWithVendor: sample.filter(item => item.vendor && item.vendor.trim() !== '').length,
        itemsWithReorderPoint: sample.filter(item => item.reorder_point && item.reorder_point > 0).length,
        itemsWithSalesData: sample.filter(item => item.sales_velocity && item.sales_velocity > 0).length,
        sampleSize
      },
      stockStatus: {
        outOfStock: summary.out_of_stock_count,
        lowStock: summary.low_stock_count,
        criticalReorder: summary.critical_reorder_count
      },
      sync: syncStatus
    }
    
    return NextResponse.json(stats)
    
  } catch (error) {
    logError('[Cache Stats] Error:', error)
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Failed to get cache statistics' },
      { status: 500 }
    )
  }
}
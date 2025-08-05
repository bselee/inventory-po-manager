import { NextResponse } from 'next/server'
import { kvInventoryService } from '@/app/lib/kv-inventory-service'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'
export const maxDuration = 300 // 5 minutes for sync operations

// POST /api/inventory/sync - Manually trigger inventory sync
export async function POST(request: Request) {
  try {
    // Check if sync is already running
    const syncStatus = await kvInventoryService.getSyncStatus()
    
    if (syncStatus.is_syncing) {
      return NextResponse.json(
        { 
          error: 'Sync already in progress',
          status: syncStatus
        },
        { status: 409 }
      )
    }
    
    // Get request body for options
    const body = await request.json().catch(() => ({}))
    const { clearCache = false } = body
    
    // Clear cache if requested
    if (clearCache) {
      console.log('[Inventory Sync] Clearing cache before sync...')
      await kvInventoryService.clearCache()
    }
    
    // Start sync
    console.log('[Inventory Sync] Starting manual inventory sync...')
    const startTime = Date.now()
    
    try {
      // Force refresh to trigger sync
      const inventory = await kvInventoryService.getInventory(true)
      
      const endTime = Date.now()
      const duration = endTime - startTime
      
      // Get updated summary
      const summary = await kvInventoryService.getSummary()
      
      return NextResponse.json({
        success: true,
        message: 'Inventory sync completed successfully',
        stats: {
          itemsSynced: inventory.length,
          duration: `${(duration / 1000).toFixed(2)}s`,
          lastSync: new Date().toISOString(),
          vendorsFound: summary.vendors_count,
          itemsWithVendor: inventory.filter(item => item.vendor).length
        },
        summary
      })
      
    } catch (syncError) {
      console.error('[Inventory Sync] Sync failed:', syncError)
      
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
    console.error('[Inventory Sync] Error:', error)
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Failed to start sync' },
      { status: 500 }
    )
  }
}

// GET /api/inventory/sync - Get sync status
export async function GET() {
  try {
    const status = await kvInventoryService.getSyncStatus()
    const summary = await kvInventoryService.getSummary()
    
    return NextResponse.json({
      ...status,
      summary: {
        total_items: summary.total_items,
        vendors_count: summary.vendors_count,
        last_sync: summary.last_sync
      }
    })
    
  } catch (error) {
    console.error('[Inventory Sync Status] Error:', error)
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Failed to get sync status' },
      { status: 500 }
    )
  }
}
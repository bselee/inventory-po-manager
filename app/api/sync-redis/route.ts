import { NextRequest, NextResponse } from 'next/server'
import { kvInventoryService } from '@/app/lib/kv-inventory-service'
import { kvVendorsService } from '@/app/lib/kv-vendors-service'
import { logError } from '@/app/lib/logger'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'
export const maxDuration = 300

/**
 * Sync data from Finale to Redis cache
 */
export async function POST(request: NextRequest) {
  try {
    const results = {
      inventory: { success: false, count: 0, error: null as string | null },
      vendors: { success: false, count: 0, error: null as string | null }
    }
    
    // Sync inventory
    try {
      const inventory = await kvInventoryService.getInventory(true) // Force refresh
      results.inventory.success = true
      results.inventory.count = inventory.length
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error'
      results.inventory.error = errorMessage
      logError('[Sync Redis] Inventory sync failed:', error)
    }
    
    // Sync vendors
    try {
      const vendors = await kvVendorsService.getVendors(true) // Force refresh
      results.vendors.success = true
      results.vendors.count = vendors.length
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error'
      results.vendors.error = errorMessage
      logError('[Sync Redis] Vendors sync failed:', error)
    }
    
    const allSuccess = results.inventory.success && results.vendors.success
    
    return NextResponse.json({
      success: allSuccess,
      message: allSuccess 
        ? `Successfully synced ${results.inventory.count} inventory items and ${results.vendors.count} vendors`
        : 'Sync completed with some errors',
      results
    }, { status: allSuccess ? 200 : 207 })
    
  } catch (error) {
    logError('[Sync Redis] Fatal error:', error)
    return NextResponse.json(
      { 
        error: 'Sync failed',
        message: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    )
  }
}

/**
 * Get sync status
 */
export async function GET(request: NextRequest) {
  try {
    const [inventoryStatus, vendorsSummary, inventorySummary] = await Promise.all([
      kvInventoryService.getSyncStatus(),
      kvVendorsService.getSummary(),
      kvInventoryService.getSummary()
    ])
    
    return NextResponse.json({
      inventory: {
        ...inventoryStatus,
        total_items: inventorySummary.total_items,
        last_sync: inventorySummary.last_sync
      },
      vendors: {
        total_vendors: vendorsSummary.total_vendors,
        active_vendors: vendorsSummary.active_vendors,
        last_sync: vendorsSummary.last_sync
      }
    })
  } catch (error) {
    logError('[Sync Redis] Error getting status:', error)
    return NextResponse.json(
      { error: 'Failed to get sync status' },
      { status: 500 }
    )
  }
}
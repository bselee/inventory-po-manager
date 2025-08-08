import { NextResponse } from 'next/server'
import { kvInventoryService } from '@/app/lib/kv-inventory-service'
import { logWarn, logError } from '@/app/lib/logger'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'
export const maxDuration = 300 // 5 minutes

// Cron job for automatic inventory cache refresh
export async function GET(request: Request) {
  try {
    // Verify cron secret (Vercel cron jobs include this)
    const authHeader = request.headers.get('authorization')
    if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
      logWarn('[Cron Inventory KV] Unauthorized cron request')
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }
    // Check if sync is already running
    const syncStatus = await kvInventoryService.getSyncStatus()
    if (syncStatus.is_syncing) {
      return NextResponse.json({
        message: 'Sync already in progress',
        status: syncStatus
      })
    }
    
    const startTime = Date.now()
    
    try {
      // Force refresh the cache
      const inventory = await kvInventoryService.getInventory(true)
      const summary = await kvInventoryService.getSummary()
      
      const duration = Date.now() - startTime
      
      const result = {
        success: true,
        message: 'Scheduled inventory cache refresh completed',
        stats: {
          itemsSynced: inventory.length,
          vendorsFound: summary.vendors_count,
          itemsWithVendor: inventory.filter(item => item.vendor).length,
          duration: `${(duration / 1000).toFixed(2)}s`,
          timestamp: new Date().toISOString()
        }
      }
      return NextResponse.json(result)
      
    } catch (syncError) {
      const duration = Date.now() - startTime
      logError('[Cron Inventory KV] Sync failed:', syncError)
      
      return NextResponse.json({
        success: false,
        error: 'Scheduled sync failed',
        details: syncError instanceof Error ? syncError.message : 'Unknown error',
        duration: `${(duration / 1000).toFixed(2)}s`
      }, { status: 500 })
    }
    
  } catch (error) {
    logError('[Cron Inventory KV] Error:', error)
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Cron job failed' },
      { status: 500 }
    )
  }
}
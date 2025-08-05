import { NextResponse } from 'next/server'
import { finaleMultiReportService } from '@/app/lib/finale-multi-report-service'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'
export const maxDuration = 300

// POST /api/inventory-enhanced/sync - Trigger enhanced sync
export async function POST() {
  try {
    const startTime = Date.now()
    
    console.log('[Enhanced Sync] Starting sync of all Finale reports...')
    
    // Force refresh all data
    const items = await finaleMultiReportService.getCombinedInventory(true)
    
    // Get summary metrics
    const summary = await finaleMultiReportService.getMetricsSummary()
    
    const duration = Date.now() - startTime
    
    // Calculate additional stats
    const stats = {
      itemsSynced: items.length,
      itemsWithVendor: items.filter(item => item.vendor).length,
      itemsWithSales: items.filter(item => item.sales_velocity > 0).length,
      itemsWithConsumption: items.filter(item => item.consumption_velocity > 0).length,
      itemsWithBoth: items.filter(item => 
        item.sales_velocity > 0 && item.consumption_velocity > 0
      ).length,
      duration: `${(duration / 1000).toFixed(2)}s`
    }
    
    // Calculate velocity insights
    const velocityInsights = {
      highVelocityItems: items.filter(item => item.total_velocity > 10).length,
      slowMovingItems: items.filter(item => 
        item.total_velocity > 0 && item.total_velocity < 1
      ).length,
      deadStock: items.filter(item => 
        item.total_velocity === 0 && item.current_stock > 0
      ).length
    }
    
    console.log('[Enhanced Sync] Sync completed successfully')
    console.log(`[Enhanced Sync] Stats:`, stats)
    
    return NextResponse.json({
      success: true,
      message: 'Enhanced sync completed successfully',
      stats,
      summary: {
        ...summary,
        velocityInsights,
        dataQuality: {
          totalItems: items.length,
          itemsWithVendor: stats.itemsWithVendor,
          itemsWithSales: stats.itemsWithSales,
          itemsWithConsumption: stats.itemsWithConsumption
        }
      }
    })
    
  } catch (error) {
    console.error('[Enhanced Sync] Error:', error)
    return NextResponse.json(
      { 
        error: error instanceof Error ? error.message : 'Sync failed',
        details: error instanceof Error ? error.stack : undefined
      },
      { status: 500 }
    )
  }
}
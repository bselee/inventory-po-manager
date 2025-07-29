import { NextResponse } from 'next/server'
import { FinaleApiService, getFinaleConfig } from '@/app/lib/finale-api'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'
export const maxDuration = 300 // 5 minutes for large syncs

export async function POST(request: Request) {
  try {
    const body = await request.json()
    const { dryRun = false, filterYear } = body

    // Get Finale config
    const config = await getFinaleConfig()
    if (!config) {
      return NextResponse.json({ 
        success: false, 
        error: 'Finale API not configured. Please check your settings.' 
      })
    }

    console.log('[Simple Sync] Starting sync with config:', {
      accountPath: config.accountPath,
      hasKey: !!config.apiKey,
      hasSecret: !!config.apiSecret,
      dryRun,
      filterYear
    })

    // Create Finale API instance
    const finaleApi = new FinaleApiService(config)

    // For dry run, just get a small sample
    if (dryRun) {
      console.log('[Simple Sync] Running dry run - fetching sample data')
      const products = await finaleApi.getInventoryData(filterYear)
      
      return NextResponse.json({
        success: true,
        totalProducts: products.length,
        processed: 0,
        sample: products.slice(0, 5),
        dryRun: true,
        message: `Found ${products.length} products in Finale. Click "Sync Now" to import them.`
      })
    }

    // Perform actual sync
    console.log('[Simple Sync] Starting full sync - this may take several minutes for large inventories')
    const result = await finaleApi.syncToSupabase(dryRun, filterYear)

    console.log('[Simple Sync] Sync result:', {
      success: result.success,
      totalProducts: result.totalProducts,
      processed: result.processed,
      error: result.error
    })

    return NextResponse.json({
      success: result.success,
      totalProducts: result.totalProducts || 0,
      processed: result.processed || 0,
      sample: result.sample,
      dryRun: result.dryRun,
      error: result.error,
      message: result.success 
        ? `Successfully synced ${result.processed} items` 
        : 'Sync failed'
    })

  } catch (error) {
    console.error('[Simple Sync] Error:', error)
    return NextResponse.json({ 
      success: false, 
      error: error instanceof Error ? error.message : 'Unknown error occurred' 
    }, { status: 500 })
  }
}
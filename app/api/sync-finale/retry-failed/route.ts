import { NextRequest, NextResponse } from 'next/server'
import { supabase } from '@/app/lib/supabase'
import { FinaleApiService, getFinaleConfig } from '@/app/lib/finale-api'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'
export const maxDuration = 60

export async function POST(request: NextRequest) {
  try {
    const body = await request.json().catch(() => ({}))
    const { syncId, skus } = body
    
    // Get Finale API config
    const config = await getFinaleConfig()
    if (!config) {
      return NextResponse.json({ 
        success: false, 
        error: 'Finale API credentials not configured' 
      }, { status: 400 })
    }
    
    const finaleApi = new FinaleApiService(config)
    
    // If specific SKUs provided, retry only those
    if (skus && Array.isArray(skus) && skus.length > 0) {
      // Fetch product data from Finale for these SKUs
      const allProducts = await finaleApi.getInventoryData(null) // No year filter for retry
      const productsToRetry = allProducts.filter(p => skus.includes(p.productSku))
      
      if (productsToRetry.length === 0) {
        return NextResponse.json({
          success: false,
          error: 'No matching products found in Finale for provided SKUs'
        })
      }
      
      // Transform and upsert
      const inventoryItems = productsToRetry.map(p => finaleApi.transformToInventoryItem(p))
      
      const { data, error } = await supabase
        .from('inventory_items')
        .upsert(inventoryItems, { 
          onConflict: 'sku',
          ignoreDuplicates: false 
        })
        .select()
      
      if (error) {
        return NextResponse.json({
          success: false,
          error: error.message,
          details: error
        })
      }
      
      return NextResponse.json({
        success: true,
        message: `Successfully retried ${inventoryItems.length} items`,
        processed: inventoryItems.length,
        skus: skus
      })
    }
    
    // If syncId provided, get failed items from that sync
    if (syncId) {
      const { data: syncLog } = await supabase
        .from('sync_logs')
        .select('metadata')
        .eq('id', syncId)
        .single()
      
      if (!syncLog?.metadata?.batchResults) {
        return NextResponse.json({
          success: false,
          error: 'No batch results found for this sync'
        })
      }
      
      // Extract failed batches
      const failedBatches = syncLog.metadata.batchResults.filter((r: any) => r.error)
      
      if (failedBatches.length === 0) {
        return NextResponse.json({
          success: false,
          error: 'No failed batches found in this sync'
        })
      }
      
      return NextResponse.json({
        success: false,
        error: 'Batch retry not implemented yet',
        failedBatches: failedBatches.length,
        details: 'Please provide specific SKUs to retry'
      })
    }
    
    // Get recent failed items from sync logs
    const { data: recentFailures } = await supabase
      .from('sync_logs')
      .select('metadata, errors')
      .eq('sync_type', 'finale_inventory')
      .in('status', ['error', 'partial'])
      .order('synced_at', { ascending: false })
      .limit(5)
    
    const failureInfo = recentFailures?.map(log => ({
      errors: log.errors?.length || 0,
      itemsFailed: log.metadata?.itemsFailed || 0,
      time: log.metadata?.endTime
    }))
    
    return NextResponse.json({
      success: false,
      message: 'Please provide either syncId or skus array to retry',
      recentFailures: failureInfo
    })
    
  } catch (error) {
    logError('Retry failed:', error)
    return NextResponse.json({ 
      success: false, 
      error: error instanceof Error ? error.message : 'Unknown error' 
    }, { status: 500 })
  }
}
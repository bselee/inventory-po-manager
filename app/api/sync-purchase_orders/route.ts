import { NextResponse } from 'next/server'
import { FinaleApiService, getFinaleConfig } from '@/app/lib/finale-api'
import { supabase } from '@/app/lib/supabase'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'
export const maxDuration = 60

export async function POST(request: Request) {
  const startTime = Date.now()
  
  try {
    const body = await request.json()
    const isManual = body.manual || false

    // Check if sync is enabled (unless manual)
    if (!isManual) {
      const { data: settings } = await supabase
        .from('settings')
        .select('sync_enabled, sync_purchase_orders')
        .single()

      if (!settings?.sync_enabled || !settings?.sync_purchase_orders) {
        return NextResponse.json({ 
          success: false, 
          error: 'Purchase order sync is disabled' 
        })
      }
    }

    // Get Finale config
    const config = await getFinaleConfig()
    if (!config) {
      throw new Error('Finale API not configured')
    }

    const finaleApi = new FinaleApiService(config)

    // Get purchase orders from Finale
    // This would need to be implemented in the FinaleApiService
    // For now, we'll create a placeholder
    const poResult = {
      success: true,
      totalPOs: 0,
      syncedPOs: 0,
      error: null as string | null
    }

    try {
      // TODO: Implement getPurchaseOrders in FinaleApiService
      // const purchaseOrders = await finaleApi.getPurchaseOrders()
      
      // For now, just log that this needs implementation
      console.log('Purchase order sync not yet implemented')
      
      poResult.error = 'Purchase order sync not yet implemented'
      poResult.success = false
    } catch (error) {
      poResult.success = false
      poResult.error = error instanceof Error ? error.message : 'Failed to fetch purchase orders'
    }

    // Log results
    await supabase
      .from('sync_logs')
      .insert({
        sync_type: 'purchase_orders',
        status: poResult.success ? 'success' : 'error',
        items_processed: poResult.totalPOs || 0,
        items_updated: poResult.syncedPOs || 0,
        errors: poResult.error ? [poResult.error] : [],
        duration_ms: Date.now() - startTime,
        metadata: {
          manual: isManual
        },
        synced_at: new Date().toISOString()
      })

    return NextResponse.json({
      success: poResult.success,
      itemsSynced: poResult.syncedPOs || 0,
      totalItems: poResult.totalPOs || 0,
      duration: Date.now() - startTime,
      error: poResult.error
    })

  } catch (error) {
    console.error('Purchase order sync error:', error)
    
    await supabase
      .from('sync_logs')
      .insert({
        sync_type: 'purchase_orders',
        status: 'error',
        errors: [error instanceof Error ? error.message : 'Unknown error'],
        duration_ms: Date.now() - startTime,
        synced_at: new Date().toISOString()
      })

    return NextResponse.json({ 
      success: false, 
      error: error instanceof Error ? error.message : 'Sync failed' 
    }, { status: 500 })
  }
}
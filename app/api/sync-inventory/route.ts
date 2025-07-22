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
        .select('sync_enabled, sync_inventory')
        .single()

      if (!settings?.sync_enabled || !settings?.sync_inventory) {
        return NextResponse.json({ 
          success: false, 
          error: 'Inventory sync is disabled' 
        })
      }
    }

    // Get Finale config
    const config = await getFinaleConfig()
    if (!config) {
      throw new Error('Finale API not configured')
    }

    const finaleApi = new FinaleApiService(config)

    // For manual syncs, always do full sync
    // For automated syncs, use incremental based on last sync
    let filterYear: number | null | undefined = undefined
    
    if (!isManual) {
      const { data: lastSync } = await supabase
        .from('sync_logs')
        .select('synced_at')
        .eq('sync_type', 'inventory')
        .eq('status', 'success')
        .order('synced_at', { ascending: false })
        .limit(1)
        .single()

      if (lastSync?.synced_at) {
        const hoursSinceLastSync = (Date.now() - new Date(lastSync.synced_at).getTime()) / (1000 * 60 * 60)
        if (hoursSinceLastSync < 48) {
          filterYear = new Date().getFullYear()
        }
      }
    } else {
      // Manual sync - use current year to avoid overwhelming
      filterYear = new Date().getFullYear()
    }

    // Perform sync
    const result = await finaleApi.syncToSupabase(false, filterYear)

    // Log results
    await supabase
      .from('sync_logs')
      .insert({
        sync_type: 'inventory',
        status: result.success ? 'success' : 'error',
        items_processed: result.totalProducts || 0,
        items_updated: result.processed || 0,
        errors: result.error ? [result.error] : [],
        duration_ms: Date.now() - startTime,
        metadata: {
          manual: isManual,
          filterYear
        },
        synced_at: new Date().toISOString()
      })

    return NextResponse.json({
      success: result.success,
      itemsSynced: result.processed || 0,
      totalItems: result.totalProducts || 0,
      duration: Date.now() - startTime,
      error: result.error
    })

  } catch (error) {
    console.error('Inventory sync error:', error)
    
    await supabase
      .from('sync_logs')
      .insert({
        sync_type: 'inventory',
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
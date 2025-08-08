import { NextRequest, NextResponse } from 'next/server'
import { FinaleSyncService, getFinaleConfig } from '@/app/lib/finale-sync-service'
import { supabase } from '@/app/lib/supabase'
import { logError, logInfo } from '@/app/lib/logger'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'
export const maxDuration = 60

export async function POST(request: NextRequest) {
  try {
    const body = await request.json().catch(() => ({}))
    const { filterYear, dryRun = false, syncVendors = true } = body
    
    logInfo('[Manual Sync] Starting sync', { filterYear, dryRun, syncVendors })
    
    // Check if a sync is already running
    const { data: runningSync } = await supabase
      .from('sync_logs')
      .select('id, synced_at')
      .eq('sync_type', 'finale_inventory')
      .eq('status', 'running')
      .order('synced_at', { ascending: false })
      .limit(1)
      .maybeSingle()
    
    if (runningSync) {
      const runningMinutes = Math.round(
        (Date.now() - new Date(runningSync.synced_at).getTime()) / 1000 / 60
      )
      
      return NextResponse.json({
        success: false,
        error: 'A sync is already in progress',
        details: {
          syncId: runningSync.id,
          runningFor: `${runningMinutes} minutes`
        }
      }, { status: 409 })
    }
    
    // Get Finale API config
    const config = await getFinaleConfig()
    
    if (!config) {
      return NextResponse.json({ 
        success: false, 
        error: 'Finale API credentials not configured. Please update settings.' 
      }, { status: 400 })
    }
    
    // Initialize Finale Sync service
    const syncService = new FinaleSyncService(config)
    
    // Test connection first
    const isConnected = await syncService.testConnection()
    
    if (!isConnected) {
      logError('[Manual Sync] Connection test failed')
      return NextResponse.json({ 
        success: false, 
        error: 'Failed to connect to Finale API. Please check your credentials and report URLs.' 
      }, { status: 500 })
    }
    
    // Create initial sync log entry
    const { data: syncLog } = await supabase
      .from('sync_logs')
      .insert({
        sync_type: 'finale_inventory',
        status: 'running',
        synced_at: new Date().toISOString(),
        items_processed: 0,
        items_updated: 0,
        errors: [],
        metadata: {
          source: 'manual',
          filterYear: filterYear || null,
          dryRun,
          triggeredBy: 'api'
        }
      })
      .select()
      .single()
    
    // Perform inventory sync
    const inventoryResult = await syncService.syncInventory({
      dryRun,
      syncToSupabase: true,
      filterYear
    })
    
    // Sync vendors if requested
    let vendorResult = null
    if (syncVendors && inventoryResult.success) {
      vendorResult = await syncService.syncVendors({ dryRun })
    }
    
    // Update sync log with final status
    if (syncLog) {
      await supabase
        .from('sync_logs')
        .update({
          status: inventoryResult.success ? 'success' : 'error',
          items_processed: inventoryResult.itemsProcessed,
          items_updated: inventoryResult.itemsUpdated,
          errors: inventoryResult.errors,
          duration_ms: inventoryResult.duration,
          metadata: {
            source: 'manual',
            filterYear: filterYear || null,
            dryRun,
            triggeredBy: 'api',
            vendorsSynced: vendorResult ? vendorResult.itemsProcessed : 0
          }
        })
        .eq('id', syncLog.id)
    }
    
    // Update settings last sync time if successful and not dry run
    if (inventoryResult.success && !dryRun) {
      await supabase
        .from('settings')
        .update({ last_sync_time: new Date().toISOString() })
        .eq('id', 1)
    }
    
    return NextResponse.json({
      success: inventoryResult.success,
      inventory: {
        itemsProcessed: inventoryResult.itemsProcessed,
        itemsUpdated: inventoryResult.itemsUpdated,
        errors: inventoryResult.errors,
        duration: inventoryResult.duration
      },
      vendors: vendorResult ? {
        itemsProcessed: vendorResult.itemsProcessed,
        itemsUpdated: vendorResult.itemsUpdated,
        errors: vendorResult.errors
      } : null,
      syncId: syncLog?.id,
      mode: dryRun ? 'dry_run' : 'full_sync'
    })
  } catch (error) {
    logError('[Manual Sync] Error:', error)
    
    // Log the error
    await supabase
      .from('sync_logs')
      .insert({
        sync_type: 'finale_inventory',
        status: 'error',
        synced_at: new Date().toISOString(),
        errors: [error instanceof Error ? error.message : 'Unknown error'],
        metadata: {
          source: 'manual',
          errorDetails: error instanceof Error ? error.stack : undefined
        }
      })
    
    return NextResponse.json({ 
      success: false, 
      error: error instanceof Error ? error.message : 'Unknown error occurred',
      details: error instanceof Error ? error.stack?.split('\n')[0] : undefined
    }, { status: 500 })
  }
}
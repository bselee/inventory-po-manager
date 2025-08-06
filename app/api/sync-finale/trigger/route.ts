import { NextRequest, NextResponse } from 'next/server'
import { FinaleApiService, getFinaleConfig } from '@/app/lib/finale-api'
import { supabase } from '@/app/lib/supabase'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'
export const maxDuration = 60

export async function POST(request: NextRequest) {
  try {
    const body = await request.json().catch(() => ({}))
    const { filterYear, dryRun = false } = body
    
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
    
    // Initialize Finale API service
    const finaleApi = new FinaleApiService(config)
    
    // Test connection first
    const isConnected = await finaleApi.testConnection()
    
    if (!isConnected) {
      logError('[Manual Sync] Connection test failed')
      return NextResponse.json({ 
        success: false, 
        error: 'Failed to connect to Finale API. Please check your credentials.' 
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
          filterYear: filterYear || new Date().getFullYear(),
          dryRun,
          triggeredBy: 'api'
        }
      })
      .select()
      .single()
    
    // Perform sync
    const result = await finaleApi.syncToSupabase(dryRun, filterYear)
    
    // Update settings last sync time if successful and not dry run
    if (result.success && !dryRun) {
      await supabase
        .from('settings')
        .update({ last_sync_time: new Date().toISOString() })
        .eq('id', 1)
    }
    
    return NextResponse.json({
      ...result,
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
import { NextRequest, NextResponse } from 'next/server'
import { FinaleSyncService, getFinaleConfig } from '@/app/lib/finale-sync-service'
import { supabase } from '@/app/lib/supabase'
import { logError, logInfo } from '@/app/lib/logger'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'
export const maxDuration = 60

export async function GET(request: NextRequest) {
  try {
    // Verify cron secret
    const authHeader = request.headers.get('authorization')
    if (process.env.CRON_SECRET && authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // Check if inventory sync is enabled
    const { data: settings } = await supabase
      .from('settings')
      .select('sync_enabled, sync_inventory')
      .single()

    if (!settings?.sync_enabled || !settings?.sync_inventory) {
      return NextResponse.json({ 
        message: 'Inventory sync is disabled',
        sync_enabled: settings?.sync_enabled,
        sync_inventory: settings?.sync_inventory
      })
    }

    logInfo('[Cron Sync] Starting scheduled inventory sync')

    // Get Finale configuration
    const config = await getFinaleConfig()
    if (!config) {
      return NextResponse.json({ 
        success: false, 
        error: 'Finale API not configured' 
      }, { status: 500 })
    }

    // Initialize sync service
    const syncService = new FinaleSyncService(config)

    // Perform sync
    const result = await syncService.syncInventory({
      dryRun: false,
      syncToSupabase: true,
      filterYear: null // Sync all data in cron
    })

    // Update last sync time if successful
    if (result.success) {
      await supabase
        .from('settings')
        .update({ last_sync_time: new Date().toISOString() })
        .eq('id', 1)
    }

    return NextResponse.json({
      success: result.success,
      message: result.success 
        ? `Synced ${result.itemsProcessed} inventory items`
        : `Sync failed: ${result.errors.join(', ')}`,
      details: {
        itemsProcessed: result.itemsProcessed,
        itemsUpdated: result.itemsUpdated,
        duration: result.duration,
        errors: result.errors
      }
    })

  } catch (error) {
    logError('[Cron Sync] Inventory sync error:', error)
    return NextResponse.json({ 
      success: false, 
      error: error instanceof Error ? error.message : 'Unknown error' 
    }, { status: 500 })
  }
}
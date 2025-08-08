import { NextRequest, NextResponse } from 'next/server'
import { FinaleSyncService, getFinaleConfig } from '@/app/lib/finale-sync-service'
import { supabase } from '@/app/lib/supabase'
import { logError, logInfo } from '@/app/lib/logger'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'
export const maxDuration = 300 // Increase to 5 minutes for vendor sync

export async function GET(request: NextRequest) {
  try {
    // Verify cron secret
    const authHeader = request.headers.get('authorization')
    if (process.env.CRON_SECRET && authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // Check if vendor sync is enabled
    const { data: settings } = await supabase
      .from('settings')
      .select('sync_enabled, sync_vendors')
      .single()

    if (!settings?.sync_enabled || !settings?.sync_vendors) {
      return NextResponse.json({ 
        message: 'Vendor sync is disabled',
        sync_enabled: settings?.sync_enabled,
        sync_vendors: settings?.sync_vendors
      })
    }

    logInfo('[Cron Sync] Starting scheduled vendor sync')

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

    // Perform vendor sync
    const result = await syncService.syncVendors({
      dryRun: false
    })

    return NextResponse.json({
      success: result.success,
      message: result.success 
        ? `Synced ${result.itemsProcessed} vendors`
        : `Sync failed: ${result.errors.join(', ')}`,
      details: {
        itemsProcessed: result.itemsProcessed,
        itemsUpdated: result.itemsUpdated,
        duration: result.duration,
        errors: result.errors
      }
    })

  } catch (error) {
    logError('[Cron Sync] Vendor sync error:', error)
    return NextResponse.json({ 
      success: false, 
      error: error instanceof Error ? error.message : 'Unknown error' 
    }, { status: 500 })
  }
}
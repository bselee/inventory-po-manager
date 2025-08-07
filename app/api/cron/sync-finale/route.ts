import { NextRequest, NextResponse } from 'next/server'
import { FinaleApiService, getFinaleConfig } from '@/app/lib/finale-api'
import { supabase } from '@/app/lib/supabase'
import { logError, logInfo } from '@/app/lib/logger'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'
export const maxDuration = 60 // 60 seconds max for Vercel

export async function GET(request: NextRequest) {
  try {
    // Verify cron secret for security (optional but recommended)
    const authHeader = request.headers.get('authorization')
    if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // Check if sync is enabled and get frequency
    const { data: settings } = await supabase
      .from('settings')
      .select('id, sync_enabled, sync_frequency_minutes, last_sync_time')
      .single()

    if (!settings?.sync_enabled) {
      return NextResponse.json({ message: 'Sync is disabled' })
    }

    // Check if enough time has passed since last sync
    if (settings.last_sync_time) {
      const lastSync = new Date(settings.last_sync_time)
      const now = new Date()
      const minutesPassed = (now.getTime() - lastSync.getTime()) / (1000 * 60)
      
      if (minutesPassed < (settings.sync_frequency_minutes || 60)) {
        return NextResponse.json({ 
          message: 'Sync skipped - not enough time passed',
          minutesPassed,
          requiredMinutes: settings.sync_frequency_minutes || 60
        })
      }
    }

    // Get Finale API config
    const config = await getFinaleConfig()
    
    if (!config) {
      return NextResponse.json({ 
        success: false, 
        error: 'Finale API credentials not configured' 
      }, { status: 400 })
    }

    // Initialize Finale API service
    const finaleApi = new FinaleApiService(config)

    // Test connection first
    const isConnected = await finaleApi.testConnection()
    if (!isConnected) {
      return NextResponse.json({ 
        success: false, 
        error: 'Failed to connect to Finale API' 
      }, { status: 500 })
    }

    // Perform sync
    const syncResult = await finaleApi.syncToSupabase(false)

    // Update last sync time
    await supabase
      .from('settings')
      .update({ last_sync_time: new Date().toISOString() })
      .eq('id', settings.id)

    // Log sync result
    await supabase
      .from('sync_logs')
      .insert({
        sync_type: 'finale_inventory',
        status: syncResult.success ? 'success' : 'error',
        items_processed: syncResult.totalProducts || 0,
        items_updated: syncResult.processed || 0,
        errors: syncResult.error ? [syncResult.error] : [],
        synced_at: new Date().toISOString()
      })

    return NextResponse.json({
      success: syncResult.success,
      message: syncResult.success 
        ? `Synced ${syncResult.processed} items successfully`
        : 'Sync failed',
      details: syncResult
    })
  } catch (error) {
    logError('Cron sync error:', error)
    
    // Log error
    await supabase
      .from('sync_logs')
      .insert({
        sync_type: 'finale_inventory',
        status: 'error',
        errors: [error instanceof Error ? error.message : 'Unknown error'],
        synced_at: new Date().toISOString()
      })

    return NextResponse.json({ 
      success: false, 
      error: error instanceof Error ? error.message : 'Unknown error occurred' 
    }, { status: 500 })
  }
}
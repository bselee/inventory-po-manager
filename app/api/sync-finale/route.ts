// app/api/sync-finale/route.ts
import { NextRequest, NextResponse } from 'next/server'
import { FinaleApiService, getFinaleConfig } from '@/app/lib/finale-api'
import { supabase } from '@/app/lib/supabase'

export async function POST(request: NextRequest) {
  try {
    // Get dry run flag and filter year from request body
    const body = await request.json().catch(() => ({}))
    const { dryRun = false, filterYear } = body

    // Check if a sync is already running
    const { data: runningSync } = await supabase
      .from('sync_logs')
      .select('id, synced_at, metadata')
      .eq('sync_type', 'finale_inventory')
      .eq('status', 'running')
      .order('synced_at', { ascending: false })
      .limit(1)
      .maybeSingle()
    
    if (runningSync) {
      const runningMinutes = Math.round(
        (Date.now() - new Date(runningSync.synced_at).getTime()) / 1000 / 60
      )
      
      // If running for more than 30 minutes, consider it stuck
      if (runningMinutes > 30) {
        console.log(`[Sync] Found stuck sync ${runningSync.id}, marking as failed`)
        await supabase
          .from('sync_logs')
          .update({
            status: 'error',
            errors: [`Sync terminated - was running for ${runningMinutes} minutes`],
            duration_ms: runningMinutes * 60 * 1000
          })
          .eq('id', runningSync.id)
      } else {
        return NextResponse.json({
          success: false,
          error: 'A sync is already in progress',
          details: {
            syncId: runningSync.id,
            runningFor: `${runningMinutes} minutes`,
            progress: runningSync.metadata?.progress || 'Unknown'
          }
        }, { status: 409 })
      }
    }

    // Get Finale API config from settings
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
    console.log('[Sync] Testing Finale connection...')
    const isConnected = await finaleApi.testConnection()
    if (!isConnected) {
      console.error('[Sync] Connection test failed')
      
      // Try to get more details
      try {
        const testUrl = `${finaleApi['baseUrl']}/product?limit=1`
        const response = await fetch(testUrl, {
          headers: {
            'Authorization': finaleApi['authHeader'],
            'Accept': 'application/json'
          }
        })
        console.error('[Sync] Test response:', response.status, response.statusText)
        const text = await response.text()
        console.error('[Sync] Response preview:', text.substring(0, 200))
      } catch (e) {
        console.error('[Sync] Additional error:', e)
      }
      
      return NextResponse.json({ 
        success: false, 
        error: 'Failed to connect to Finale API. Please check your credentials.' 
      }, { status: 500 })
    }
    console.log('[Sync] Connection test passed')

    // Perform sync with optional year filter
    const result = await finaleApi.syncToSupabase(dryRun, filterYear)

    return NextResponse.json(result)
  } catch (error) {
    console.error('[Sync] Endpoint error:', error)
    console.error('[Sync] Error stack:', error instanceof Error ? error.stack : 'No stack trace')
    return NextResponse.json({ 
      success: false, 
      error: error instanceof Error ? error.message : 'Unknown error occurred',
      details: error instanceof Error ? error.stack?.split('\n')[0] : undefined
    }, { status: 500 })
  }
}

// GET endpoint to check sync status and last sync time
export async function GET() {
  try {
    const config = await getFinaleConfig()
    
    if (!config) {
      return NextResponse.json({ 
        configured: false,
        message: 'Finale API not configured' 
      })
    }

    // Get last sync info from most recently updated item
    const { data: lastSync } = await supabase
      .from('inventory_items')
      .select('last_updated')
      .order('last_updated', { ascending: false })
      .limit(1)
      .single()

    return NextResponse.json({
      configured: true,
      lastSync: lastSync?.last_updated || null,
      accountPath: config.accountPath
    })
  } catch (error) {
    return NextResponse.json({ 
      configured: false,
      error: error instanceof Error ? error.message : 'Unknown error' 
    }, { status: 500 })
  }
}
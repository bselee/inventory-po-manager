import { NextResponse } from 'next/server'
import { getFinaleConfig } from '@/app/lib/finale-api'
import { supabase } from '@/app/lib/supabase'
import { rateLimitedFetch } from '@/app/lib/finale-rate-limiter'
import { formatFinaleError } from '@/app/lib/finale-error-messages'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

export async function POST(request: Request) {
  try {
    const body = await request.json()
    const { dryRun = false, filterYear } = body

    // Get Finale config
    const config = await getFinaleConfig()
    if (!config) {
      const errorInfo = formatFinaleError(
        new Error('No Finale configuration found'),
        'sync-background'
      )
      return NextResponse.json({ 
        success: false, 
        error: errorInfo.title,
        details: errorInfo.message,
        solutions: errorInfo.solutions
      })
    }

    // For dry run, do a quick check
    if (dryRun) {
      const authHeader = `Basic ${Buffer.from(`${config.apiKey}:${config.apiSecret}`).toString('base64')}`
      const testUrl = `https://app.finaleinventory.com/${config.accountPath}/api/product?limit=1`
      
      const response = await rateLimitedFetch(testUrl, {
        headers: { 'Authorization': authHeader }
      })
      
      if (!response.ok) {
        const errorInfo = formatFinaleError(response, 'sync-dry-run')
        return NextResponse.json({ 
          success: false, 
          error: errorInfo.title,
          details: errorInfo.message,
          solutions: errorInfo.solutions
        })
      }
      
      return NextResponse.json({
        success: true,
        message: 'Connection successful! Click "Sync Now" to start background sync.',
        dryRun: true
      })
    }

    // Create a sync job record
    const { data: syncJob, error: createError } = await supabase
      .from('sync_jobs')
      .insert({
        type: 'finale_inventory',
        status: 'pending',
        metadata: {
          filterYear,
          startedBy: 'manual',
          config: {
            accountPath: config.accountPath,
            hasCredentials: true
          }
        }
      })
      .select()
      .single()

    if (createError) {
      // If sync_jobs table doesn't exist, create a simple sync log instead
      const { data: syncLog } = await supabase
        .from('sync_logs')
        .insert({
          sync_type: 'inventory',
          status: 'running',
          metadata: { filterYear }
        })
        .select()
        .single()

      // For now, let's run the sync directly (not truly background)
      // True background jobs need a proper queue system
      setTimeout(async () => {
        try {
          const { FinaleApiService } = await import('@/app/lib/finale-api')
          const finaleApi = new FinaleApiService(config)
          
          console.log('[Sync] Starting sync with filterYear:', filterYear)
          const result = await finaleApi.syncToSupabase(false, filterYear)
          
          console.log('[Sync] Result:', result)
          
          if (syncLog?.id) {
            await supabase
              .from('sync_logs')
              .update({
                status: result.success ? 'success' : 'error',
                items_processed: result.totalProducts || 0,
                items_updated: result.processed || 0,
                errors: result.error ? [result.error] : [],
                completed_at: new Date().toISOString()
              })
              .eq('id', syncLog.id)
          }
        } catch (error) {
          console.error('[Sync] Error:', error)
          if (syncLog?.id) {
            await supabase
              .from('sync_logs')
              .update({
                status: 'error',
                errors: [error instanceof Error ? error.message : 'Sync failed'],
                completed_at: new Date().toISOString()
              })
              .eq('id', syncLog.id)
          }
        }
      }, 100) // Small delay to ensure response is sent first

      return NextResponse.json({
        success: true,
        message: 'Sync started. Check back in a few minutes.',
        syncId: syncLog?.id
      })
    }

    // Start the sync in background (fire and forget)
    startBackgroundSync(config, filterYear, syncJob.id)
      .catch(error => console.error('[Background Sync] Error:', error))

    return NextResponse.json({
      success: true,
      message: 'Sync job created. The sync will run in the background.',
      jobId: syncJob.id,
      estimatedTime: '2-5 minutes'
    })

  } catch (error) {
    console.error('[Sync Background] Error:', error)
    return NextResponse.json({ 
      success: false, 
      error: error instanceof Error ? error.message : 'Unknown error' 
    }, { status: 500 })
  }
}

// Background sync function (runs after response is sent)
async function startBackgroundSync(config: any, filterYear: number | null | undefined, jobId?: string) {
  const { FinaleApiService } = await import('@/app/lib/finale-api')
  const finaleApi = new FinaleApiService(config)
  
  try {
    console.log('[Background Sync] Starting sync...')
    const result = await finaleApi.syncToSupabase(false, filterYear)
    
    if (jobId) {
      // Update sync log with results
      await supabase
        .from('sync_logs')
        .update({
          status: result.success ? 'success' : 'error',
          items_processed: result.totalProducts || 0,
          items_updated: result.processed || 0,
          errors: result.error ? [result.error] : [],
          completed_at: new Date().toISOString()
        })
        .eq('id', jobId)
    }
    
    console.log('[Background Sync] Completed:', result)
  } catch (error) {
    console.error('[Background Sync] Failed:', error)
    
    if (jobId) {
      await supabase
        .from('sync_logs')
        .update({
          status: 'error',
          errors: [error instanceof Error ? error.message : 'Sync failed'],
          completed_at: new Date().toISOString()
        })
        .eq('id', jobId)
    }
  }
}

// GET endpoint to check sync status
export async function GET(request: Request) {
  try {
    // Get recent sync logs
    const { data: recentSyncs } = await supabase
      .from('sync_logs')
      .select('*')
      .eq('sync_type', 'inventory')
      .order('created_at', { ascending: false })
      .limit(5)

    const runningSyncs = recentSyncs?.filter(s => s.status === 'running') || []
    const lastCompleted = recentSyncs?.find(s => s.status === 'success')

    return NextResponse.json({
      hasRunningSync: runningSyncs.length > 0,
      runningSyncCount: runningSyncs.length,
      lastSync: lastCompleted,
      recentSyncs
    })
  } catch (error) {
    return NextResponse.json({ 
      error: 'Failed to check sync status' 
    }, { status: 500 })
  }
}
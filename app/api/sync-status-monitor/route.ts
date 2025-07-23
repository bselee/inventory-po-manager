import { NextResponse } from 'next/server'
import { supabase } from '@/app/lib/supabase'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

// Monitor and clean up stuck sync operations
export async function POST() {
  try {
    console.log('[Sync Monitor] Checking for stuck sync operations...')
    
    // Find sync operations that have been "running" for more than 10 minutes
    const tenMinutesAgo = new Date(Date.now() - 10 * 60 * 1000).toISOString()
    
    const { data: stuckSyncs, error: findError } = await supabase
      .from('sync_logs')
      .select('id, sync_type, synced_at, metadata')
      .eq('status', 'running')
      .lt('synced_at', tenMinutesAgo)
    
    if (findError) {
      console.error('[Sync Monitor] Error finding stuck syncs:', findError)
      return NextResponse.json({ error: 'Failed to check for stuck syncs' }, { status: 500 })
    }
    
    if (!stuckSyncs || stuckSyncs.length === 0) {
      console.log('[Sync Monitor] No stuck syncs found')
      return NextResponse.json({ 
        success: true, 
        message: 'No stuck syncs found',
        stuckSyncs: 0
      })
    }
    
    console.log(`[Sync Monitor] Found ${stuckSyncs.length} stuck sync operations`)
    
    // Update stuck syncs to error status
    const updatePromises = stuckSyncs.map(sync => {
      const runtime = Date.now() - new Date(sync.synced_at).getTime()
      
      return supabase
        .from('sync_logs')
        .update({
          status: 'error',
          errors: ['Sync operation timed out - automatically marked as failed'],
          duration_ms: runtime,
          metadata: {
            ...sync.metadata,
            timeoutReason: 'Stuck sync detected by monitor',
            originalStartTime: sync.synced_at,
            timeoutTime: new Date().toISOString(),
            runtimeBeforeTimeout: `${Math.round(runtime / 1000)}s`
          }
        })
        .eq('id', sync.id)
    })
    
    const results = await Promise.allSettled(updatePromises)
    
    let updated = 0
    let failed = 0
    
    results.forEach((result, index) => {
      if (result.status === 'fulfilled' && !result.value.error) {
        updated++
        console.log(`[Sync Monitor] Updated stuck sync ${stuckSyncs[index].id} (${stuckSyncs[index].sync_type})`)
      } else {
        failed++
        console.error(`[Sync Monitor] Failed to update sync ${stuckSyncs[index].id}:`, 
          result.status === 'rejected' ? result.reason : result.value.error)
      }
    })
    
    console.log(`[Sync Monitor] Cleanup complete: ${updated} updated, ${failed} failed`)
    
    return NextResponse.json({
      success: true,
      message: `Cleaned up ${updated} stuck sync operations`,
      stuckSyncs: stuckSyncs.length,
      updated,
      failed,
      details: stuckSyncs.map(sync => ({
        id: sync.id,
        type: sync.sync_type,
        startedAt: sync.synced_at,
        runtime: `${Math.round((Date.now() - new Date(sync.synced_at).getTime()) / 1000)}s`
      }))
    })
    
  } catch (error) {
    console.error('[Sync Monitor] Error:', error)
    return NextResponse.json({ 
      error: error instanceof Error ? error.message : 'Unknown error' 
    }, { status: 500 })
  }
}

// GET endpoint to check current sync status
export async function GET() {
  try {
    // Get currently running syncs
    const { data: runningSyncs } = await supabase
      .from('sync_logs')
      .select('id, sync_type, synced_at, metadata')
      .eq('status', 'running')
      .order('synced_at', { ascending: false })
    
    // Get recent completed syncs
    const { data: recentSyncs } = await supabase
      .from('sync_logs')
      .select('id, sync_type, status, synced_at, duration_ms, items_processed, items_updated')
      .neq('status', 'running')
      .order('synced_at', { ascending: false })
      .limit(5)
    
    const currentTime = Date.now()
    const processedRunningSyncs = runningSyncs?.map(sync => {
      const runtime = currentTime - new Date(sync.synced_at).getTime()
      const isStuck = runtime > 10 * 60 * 1000 // 10 minutes
      
      return {
        ...sync,
        runtime: Math.round(runtime / 1000), // seconds
        isStuck,
        status: isStuck ? 'stuck' : 'running'
      }
    }) || []
    
    return NextResponse.json({
      success: true,
      runningSyncs: processedRunningSyncs,
      recentSyncs: recentSyncs || [],
      hasStuckSyncs: processedRunningSyncs.some(sync => sync.isStuck),
      totalRunning: processedRunningSyncs.length
    })
    
  } catch (error) {
    console.error('[Sync Monitor] Status check error:', error)
    return NextResponse.json({ 
      error: error instanceof Error ? error.message : 'Unknown error' 
    }, { status: 500 })
  }
}

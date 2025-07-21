import { NextRequest, NextResponse } from 'next/server'
import { supabase } from '@/app/lib/supabase'
import { emailAlerts } from '@/app/lib/email-alerts'

export async function GET(request: NextRequest) {
  try {
    // Check for syncs running longer than 30 minutes
    const thirtyMinutesAgo = new Date()
    thirtyMinutesAgo.setMinutes(thirtyMinutesAgo.getMinutes() - 30)
    
    const { data: stuckSyncs, error } = await supabase
      .from('sync_logs')
      .select('*')
      .eq('sync_type', 'finale_inventory')
      .eq('status', 'running')
      .lt('synced_at', thirtyMinutesAgo.toISOString())
    
    if (error) throw error
    
    const result = {
      hasStuckSyncs: false,
      stuckSyncs: [] as any[],
      actions: [] as string[]
    }
    
    if (stuckSyncs && stuckSyncs.length > 0) {
      result.hasStuckSyncs = true
      
      for (const sync of stuckSyncs) {
        const runningMinutes = Math.round(
          (Date.now() - new Date(sync.synced_at).getTime()) / 1000 / 60
        )
        
        result.stuckSyncs.push({
          id: sync.id,
          startedAt: sync.synced_at,
          runningMinutes,
          lastProgress: sync.metadata?.progress || 'Unknown',
          itemsProcessed: sync.items_processed || 0
        })
        
        // Auto-fix if requested
        if (request.nextUrl.searchParams.get('autoFix') === 'true') {
          // Mark as failed
          const { error: updateError } = await supabase
            .from('sync_logs')
            .update({
              status: 'error',
              errors: [`Sync terminated after running for ${runningMinutes} minutes`],
              duration_ms: runningMinutes * 60 * 1000,
              metadata: {
                ...sync.metadata,
                terminatedAt: new Date().toISOString(),
                terminationReason: 'Stuck sync detected and terminated'
              }
            })
            .eq('id', sync.id)
          
          if (!updateError) {
            result.actions.push(`Terminated stuck sync ${sync.id}`)
            
            // Send alert
            await emailAlerts.initialize()
            await emailAlerts.sendSyncAlert({
              type: 'stuck',
              syncId: sync.id,
              details: {
                startedAt: sync.synced_at,
                runningFor: `${runningMinutes} minutes`
              }
            })
          } else {
            result.actions.push(`Failed to terminate sync ${sync.id}: ${updateError.message}`)
          }
        }
      }
    }
    
    // Also check for recent patterns of stuck syncs
    const sevenDaysAgo = new Date()
    sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7)
    
    const { data: recentStuckPattern } = await supabase
      .from('sync_logs')
      .select('id, synced_at, metadata')
      .eq('sync_type', 'finale_inventory')
      .eq('status', 'error')
      .gte('synced_at', sevenDaysAgo.toISOString())
      .filter('metadata->terminationReason', 'eq', 'Stuck sync detected and terminated')
    
    if (recentStuckPattern && recentStuckPattern.length > 3) {
      result.actions.push(
        `Warning: ${recentStuckPattern.length} syncs got stuck in the last 7 days. ` +
        'This may indicate a systemic issue.'
      )
    }
    
    return NextResponse.json({
      ...result,
      recommendation: result.hasStuckSyncs 
        ? 'Found stuck syncs. Use ?autoFix=true to terminate them.'
        : 'No stuck syncs detected.'
    })
  } catch (error) {
    console.error('Error checking stuck syncs:', error)
    return NextResponse.json(
      { error: 'Failed to check stuck syncs' },
      { status: 500 }
    )
  }
}

// POST endpoint to manually mark a sync as failed
export async function POST(request: NextRequest) {
  try {
    const { syncId, reason } = await request.json()
    
    if (!syncId) {
      return NextResponse.json(
        { error: 'syncId is required' },
        { status: 400 }
      )
    }
    
    // Get the sync
    const { data: sync, error: fetchError } = await supabase
      .from('sync_logs')
      .select('*')
      .eq('id', syncId)
      .single()
    
    if (fetchError || !sync) {
      return NextResponse.json(
        { error: 'Sync not found' },
        { status: 404 }
      )
    }
    
    if (sync.status !== 'running') {
      return NextResponse.json(
        { error: 'Sync is not in running state' },
        { status: 400 }
      )
    }
    
    // Calculate duration
    const duration = Date.now() - new Date(sync.synced_at).getTime()
    
    // Update sync status
    const { error: updateError } = await supabase
      .from('sync_logs')
      .update({
        status: 'error',
        errors: [reason || 'Manually terminated'],
        duration_ms: duration,
        metadata: {
          ...sync.metadata,
          terminatedAt: new Date().toISOString(),
          terminationReason: reason || 'Manually terminated'
        }
      })
      .eq('id', syncId)
    
    if (updateError) {
      return NextResponse.json(
        { error: updateError.message },
        { status: 500 }
      )
    }
    
    // Send alert
    await emailAlerts.initialize()
    await emailAlerts.sendSyncAlert({
      type: 'failure',
      syncId,
      error: reason || 'Sync manually terminated',
      details: {
        runningFor: Math.round(duration / 1000 / 60) + ' minutes',
        itemsProcessed: sync.items_processed || 0
      }
    })
    
    return NextResponse.json({
      success: true,
      message: `Sync ${syncId} marked as failed`,
      duration: Math.round(duration / 1000) + ' seconds'
    })
  } catch (error) {
    console.error('Error terminating sync:', error)
    return NextResponse.json(
      { error: 'Failed to terminate sync' },
      { status: 500 }
    )
  }
}
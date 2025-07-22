import { NextRequest, NextResponse } from 'next/server'
import { supabase } from '@/app/lib/supabase'
import { getFinaleConfig } from '@/app/lib/finale-api'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'
export const maxDuration = 60

export async function GET(request: NextRequest) {
  try {
    // Check if Finale is configured
    const config = await getFinaleConfig()
    const isConfigured = !!config
    
    // Get current running sync (if any)
    const { data: runningSync } = await supabase
      .from('sync_logs')
      .select('*')
      .eq('sync_type', 'finale_inventory')
      .eq('status', 'running')
      .order('synced_at', { ascending: false })
      .limit(1)
      .maybeSingle()
    
    // Get last completed sync
    const { data: lastSync } = await supabase
      .from('sync_logs')
      .select('*')
      .eq('sync_type', 'finale_inventory')
      .in('status', ['success', 'error', 'partial'])
      .order('synced_at', { ascending: false })
      .limit(1)
      .maybeSingle()
    
    // Get sync statistics for the last 7 days
    const sevenDaysAgo = new Date()
    sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7)
    
    const { data: recentSyncs } = await supabase
      .from('sync_logs')
      .select('status, items_processed, items_updated, duration_ms, errors')
      .eq('sync_type', 'finale_inventory')
      .gte('synced_at', sevenDaysAgo.toISOString())
      .order('synced_at', { ascending: false })
    
    // Calculate statistics
    const stats = {
      totalSyncs: recentSyncs?.length || 0,
      successfulSyncs: recentSyncs?.filter(s => s.status === 'success').length || 0,
      failedSyncs: recentSyncs?.filter(s => s.status === 'error').length || 0,
      partialSyncs: recentSyncs?.filter(s => s.status === 'partial').length || 0,
      averageDuration: recentSyncs?.length 
        ? Math.round(recentSyncs.reduce((sum, s) => sum + (s.duration_ms || 0), 0) / recentSyncs.length)
        : 0,
      totalItemsProcessed: recentSyncs?.reduce((sum, s) => sum + (s.items_processed || 0), 0) || 0,
      totalItemsUpdated: recentSyncs?.reduce((sum, s) => sum + (s.items_updated || 0), 0) || 0,
      recentErrors: recentSyncs?.flatMap(s => s.errors || []).slice(0, 10) || []
    }
    
    // Get settings for sync configuration
    const { data: settings } = await supabase
      .from('settings')
      .select('sync_enabled, sync_inventory, sync_frequency_minutes, last_sync_time')
      .single()
    
    // Calculate current status
    let currentStatus: 'idle' | 'running' | 'error' | 'warning' = 'idle'
    let statusMessage = ''
    
    if (runningSync) {
      currentStatus = 'running'
      const progress = runningSync.metadata?.progress || '0%'
      statusMessage = `Sync in progress: ${progress}`
    } else if (lastSync?.status === 'error') {
      currentStatus = 'error'
      statusMessage = `Last sync failed: ${lastSync.errors?.[0] || 'Unknown error'}`
    } else if (lastSync?.status === 'partial') {
      currentStatus = 'warning'
      statusMessage = `Last sync completed with errors`
    } else if (!settings?.sync_enabled) {
      statusMessage = 'Sync is disabled'
    } else {
      statusMessage = 'Ready to sync'
    }
    
    // Get total inventory items count
    const { count: totalItems } = await supabase
      .from('inventory_items')
      .select('*', { count: 'exact', head: true })
    
    return NextResponse.json({
      status: currentStatus,
      message: statusMessage,
      configured: isConfigured,
      syncEnabled: settings?.sync_enabled || false,
      currentSync: runningSync ? {
        id: runningSync.id,
        startedAt: runningSync.synced_at,
        progress: runningSync.metadata?.progress || '0%',
        itemsProcessed: runningSync.items_processed || 0,
        currentBatch: runningSync.metadata?.currentBatch,
        totalBatches: runningSync.metadata?.totalBatches
      } : null,
      lastSync: lastSync ? {
        id: lastSync.id,
        status: lastSync.status,
        completedAt: lastSync.synced_at,
        duration: lastSync.duration_ms,
        itemsProcessed: lastSync.items_processed || 0,
        itemsUpdated: lastSync.items_updated || 0,
        itemsFailed: lastSync.metadata?.itemsFailed || 0,
        errors: lastSync.errors || []
      } : null,
      statistics: {
        last7Days: stats,
        successRate: stats.totalSyncs > 0 
          ? Math.round((stats.successfulSyncs / stats.totalSyncs) * 100) 
          : 0,
        totalInventoryItems: totalItems || 0
      },
      syncConfig: {
        frequencyMinutes: settings?.sync_frequency_minutes || 60,
        lastScheduledSync: settings?.last_sync_time,
        nextScheduledSync: settings?.last_sync_time 
          ? new Date(new Date(settings.last_sync_time).getTime() + (settings.sync_frequency_minutes || 60) * 60000).toISOString()
          : null
      }
    })
  } catch (error) {
    console.error('Error fetching sync status:', error)
    return NextResponse.json(
      { error: 'Failed to fetch sync status' },
      { status: 500 }
    )
  }
}
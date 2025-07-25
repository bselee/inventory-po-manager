/**
 * Data Access Layer for Sync Log Operations
 * Centralizes all database queries related to sync logging
 */

import { supabase } from '@/app/lib/supabase'

export interface SyncLog {
  id: string
  sync_type: 'full' | 'inventory' | 'critical' | 'active' | 'smart'
  status: 'running' | 'completed' | 'failed'
  started_at: string
  completed_at?: string
  items_synced?: number
  errors?: any
  duration_ms?: number
  created_at?: string
}

/**
 * Create a new sync log entry
 */
export async function createSyncLog(
  syncType: SyncLog['sync_type']
): Promise<SyncLog> {
  const { data, error } = await supabase
    .from('sync_logs')
    .insert({
      sync_type: syncType,
      status: 'running',
      started_at: new Date().toISOString()
    })
    .select()
    .single()

  if (error) {
    throw new Error(`Failed to create sync log: ${error.message}`)
  }

  return data
}

/**
 * Update sync log status
 */
export async function updateSyncLog(
  id: string,
  updates: {
    status?: SyncLog['status']
    completed_at?: string
    items_synced?: number
    errors?: any
    duration_ms?: number
  }
): Promise<SyncLog> {
  const { data, error } = await supabase
    .from('sync_logs')
    .update(updates)
    .eq('id', id)
    .select()
    .single()

  if (error) {
    throw new Error(`Failed to update sync log: ${error.message}`)
  }

  return data
}

/**
 * Complete a sync log with success
 */
export async function completeSyncLog(
  id: string,
  itemsSynced: number
): Promise<SyncLog> {
  const log = await getSyncLogById(id)
  if (!log) throw new Error('Sync log not found')

  const startedAt = new Date(log.started_at)
  const completedAt = new Date()
  const durationMs = completedAt.getTime() - startedAt.getTime()

  return updateSyncLog(id, {
    status: 'completed',
    completed_at: completedAt.toISOString(),
    items_synced: itemsSynced,
    duration_ms: durationMs
  })
}

/**
 * Fail a sync log with error
 */
export async function failSyncLog(
  id: string,
  error: any
): Promise<SyncLog> {
  const log = await getSyncLogById(id)
  if (!log) throw new Error('Sync log not found')

  const startedAt = new Date(log.started_at)
  const completedAt = new Date()
  const durationMs = completedAt.getTime() - startedAt.getTime()

  return updateSyncLog(id, {
    status: 'failed',
    completed_at: completedAt.toISOString(),
    errors: error,
    duration_ms: durationMs
  })
}

/**
 * Get sync log by ID
 */
export async function getSyncLogById(id: string): Promise<SyncLog | null> {
  const { data, error } = await supabase
    .from('sync_logs')
    .select('*')
    .eq('id', id)
    .single()

  if (error) {
    throw new Error(`Failed to fetch sync log: ${error.message}`)
  }

  return data
}

/**
 * Check if a sync is currently running
 */
export async function isAnySyncRunning(): Promise<boolean> {
  const { data, error } = await supabase
    .from('sync_logs')
    .select('id')
    .eq('status', 'running')
    .limit(1)

  if (error) {
    throw new Error(`Failed to check running syncs: ${error.message}`)
  }

  return (data?.length || 0) > 0
}

/**
 * Get currently running sync
 */
export async function getRunningSyncLog(): Promise<SyncLog | null> {
  const { data, error } = await supabase
    .from('sync_logs')
    .select('*')
    .eq('status', 'running')
    .order('started_at', { ascending: false })
    .limit(1)
    .maybeSingle()

  if (error) {
    throw new Error(`Failed to fetch running sync: ${error.message}`)
  }

  return data
}

/**
 * Get recent sync logs
 */
export async function getRecentSyncLogs(limit: number = 10): Promise<SyncLog[]> {
  const { data, error } = await supabase
    .from('sync_logs')
    .select('*')
    .order('started_at', { ascending: false })
    .limit(limit)

  if (error) {
    throw new Error(`Failed to fetch sync logs: ${error.message}`)
  }

  return data || []
}

/**
 * Get last successful sync
 */
export async function getLastSuccessfulSync(): Promise<SyncLog | null> {
  const { data, error } = await supabase
    .from('sync_logs')
    .select('*')
    .eq('status', 'completed')
    .order('completed_at', { ascending: false })
    .limit(1)
    .maybeSingle()

  if (error) {
    throw new Error(`Failed to fetch last successful sync: ${error.message}`)
  }

  return data
}

/**
 * Mark stuck syncs as failed (running for more than specified minutes)
 */
export async function markStuckSyncsAsFailed(
  maxMinutes: number = 30
): Promise<number> {
  const cutoffTime = new Date()
  cutoffTime.setMinutes(cutoffTime.getMinutes() - maxMinutes)

  const { data, error } = await supabase
    .from('sync_logs')
    .update({
      status: 'failed',
      completed_at: new Date().toISOString(),
      errors: { message: 'Sync was stuck and marked as failed' }
    })
    .eq('status', 'running')
    .lt('started_at', cutoffTime.toISOString())
    .select()

  if (error) {
    throw new Error(`Failed to mark stuck syncs: ${error.message}`)
  }

  return data?.length || 0
}

/**
 * Get sync statistics for the last N days
 */
export async function getSyncStats(days: number = 7) {
  const startDate = new Date()
  startDate.setDate(startDate.getDate() - days)

  const { data, error } = await supabase
    .from('sync_logs')
    .select('*')
    .gte('started_at', startDate.toISOString())
    .order('started_at', { ascending: false })

  if (error) {
    throw new Error(`Failed to fetch sync stats: ${error.message}`)
  }

  const logs = data || []
  
  return {
    total: logs.length,
    successful: logs.filter(l => l.status === 'completed').length,
    failed: logs.filter(l => l.status === 'failed').length,
    running: logs.filter(l => l.status === 'running').length,
    averageDuration: logs
      .filter(l => l.duration_ms)
      .reduce((sum, l) => sum + (l.duration_ms || 0), 0) / 
      logs.filter(l => l.duration_ms).length || 0,
    totalItemsSynced: logs.reduce((sum, l) => sum + (l.items_synced || 0), 0)
  }
}
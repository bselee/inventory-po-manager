/**
 * Sync operation logger
 * Logs all sync attempts, failures, and retries for debugging and monitoring
 */

import { supabase } from './supabase'

export interface SyncLogEntry {
  timestamp: string
  syncType: string
  operation: string
  status: 'started' | 'success' | 'failed' | 'retry'
  duration?: number
  itemsProcessed?: number
  itemsFailed?: number
  error?: string
  metadata?: Record<string, any>
}

export class SyncLogger {
  private logs: SyncLogEntry[] = []
  private syncId: string | null = null
  
  constructor(private syncType: string) {}
  
  /**
   * Start a new sync operation
   */
  async startSync(metadata?: Record<string, any>): Promise<void> {
    const entry: SyncLogEntry = {
      timestamp: new Date().toISOString(),
      syncType: this.syncType,
      operation: 'sync_start',
      status: 'started',
      metadata
    }
    
    this.logs.push(entry)
    console.log(`[SyncLogger] Starting ${this.syncType} sync`, metadata)
    
    // Create sync log in database
    try {
      const { data } = await supabase
        .from('sync_logs')
        .insert({
          sync_type: this.syncType,
          status: 'running',
          metadata,
          started_at: new Date().toISOString()
        })
        .select()
        .single()
      
      if (data) {
        this.syncId = data.id
      }
    } catch (error) {
      console.error('[SyncLogger] Failed to create sync log:', error)
    }
  }
  
  /**
   * Log a sync operation
   */
  log(operation: string, status: 'success' | 'failed' | 'retry', details?: {
    duration?: number
    itemsProcessed?: number
    itemsFailed?: number
    error?: string
    metadata?: Record<string, any>
  }): void {
    const entry: SyncLogEntry = {
      timestamp: new Date().toISOString(),
      syncType: this.syncType,
      operation,
      status,
      ...details
    }
    
    this.logs.push(entry)
    
    // Log to console
    const logLevel = status === 'failed' ? 'error' : status === 'retry' ? 'warn' : 'log'
    console[logLevel](
      `[SyncLogger] ${this.syncType} - ${operation}: ${status}`,
      details
    )
  }
  
  /**
   * Log a batch operation
   */
  logBatch(batchNumber: number, totalBatches: number, itemsInBatch: number, status: 'started' | 'completed' | 'failed', error?: string): void {
    this.log(`batch_${batchNumber}_of_${totalBatches}`, status === 'failed' ? 'failed' : 'success', {
      itemsProcessed: status === 'completed' ? itemsInBatch : 0,
      itemsFailed: status === 'failed' ? itemsInBatch : 0,
      error,
      metadata: {
        batchNumber,
        totalBatches,
        itemsInBatch
      }
    })
  }
  
  /**
   * Log a retry attempt
   */
  logRetry(operation: string, attempt: number, maxRetries: number, error: string, delay: number): void {
    this.log(`${operation}_retry`, 'retry', {
      error,
      metadata: {
        attempt,
        maxRetries,
        delayMs: delay
      }
    })
  }
  
  /**
   * Complete the sync operation
   */
  async completeSync(success: boolean, summary?: {
    itemsProcessed?: number
    itemsFailed?: number
    duration?: number
    error?: string
  }): Promise<void> {
    const entry: SyncLogEntry = {
      timestamp: new Date().toISOString(),
      syncType: this.syncType,
      operation: 'sync_complete',
      status: success ? 'success' : 'failed',
      ...summary
    }
    
    this.logs.push(entry)
    console.log(`[SyncLogger] Completed ${this.syncType} sync:`, {
      success,
      ...summary
    })
    
    // Update sync log in database
    if (this.syncId) {
      try {
        await supabase
          .from('sync_logs')
          .update({
            status: success ? 'success' : 'error',
            items_processed: summary?.itemsProcessed || 0,
            items_failed: summary?.itemsFailed || 0,
            duration_ms: summary?.duration || 0,
            errors: summary?.error ? [summary.error] : [],
            completed_at: new Date().toISOString()
          })
          .eq('id', this.syncId)
      } catch (error) {
        console.error('[SyncLogger] Failed to update sync log:', error)
      }
    }
  }
  
  /**
   * Get all logs for this sync session
   */
  getLogs(): SyncLogEntry[] {
    return [...this.logs]
  }
  
  /**
   * Get summary of sync operations
   */
  getSummary(): {
    totalOperations: number
    successCount: number
    failureCount: number
    retryCount: number
    totalItemsProcessed: number
    totalItemsFailed: number
    errors: string[]
  } {
    const summary = {
      totalOperations: this.logs.length,
      successCount: 0,
      failureCount: 0,
      retryCount: 0,
      totalItemsProcessed: 0,
      totalItemsFailed: 0,
      errors: [] as string[]
    }
    
    for (const log of this.logs) {
      if (log.status === 'success') summary.successCount++
      if (log.status === 'failed') summary.failureCount++
      if (log.status === 'retry') summary.retryCount++
      if (log.itemsProcessed) summary.totalItemsProcessed += log.itemsProcessed
      if (log.itemsFailed) summary.totalItemsFailed += log.itemsFailed
      if (log.error && !summary.errors.includes(log.error)) {
        summary.errors.push(log.error)
      }
    }
    
    return summary
  }
  
  /**
   * Export logs for debugging
   */
  exportLogs(): string {
    return JSON.stringify({
      syncType: this.syncType,
      syncId: this.syncId,
      summary: this.getSummary(),
      logs: this.logs
    }, null, 2)
  }
}
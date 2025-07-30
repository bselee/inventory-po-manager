/**
 * Enhanced Sync Service with Change Detection and Real-time Monitoring
 * Integrates all the new optimization features
 */

import { SyncService as BaseSyncService, executeSync as baseExecuteSync } from './sync-service'
import { 
  generateItemHash,
  detectChanges,
  filterChangedItems,
  calculateSyncStats,
  ItemChangeData,
  ChangeDetectionResult
} from './change-detection'
import { startGlobalMonitoring, getCriticalItemMonitor } from './real-time-monitor'
import { startIntelligentScheduling, executeIntelligentSync } from './sync-scheduler'
import { supabase } from './supabase'
import { InventoryItem } from '@/app/types'

export interface EnhancedSyncOptions {
  strategy?: 'smart' | 'full' | 'inventory' | 'critical' | 'active'
  enableChangeDetection?: boolean
  enableRealTimeMonitoring?: boolean
  enableIntelligentScheduling?: boolean
  forceSync?: boolean
  batchSize?: number
  dryRun?: boolean
}

export interface EnhancedSyncResult {
  success: boolean
  strategy: string
  itemsProcessed: number
  itemsUpdated: number
  itemsSkipped: number
  newItems: number
  duration: number
  changeDetectionStats: {
    enabled: boolean
    changeRate: number
    efficiencyGain: number
  }
  realTimeAlerts: number
  errors?: string[]
}

/**
 * Enhanced Sync Service with all optimizations
 */
export class EnhancedSyncService {
  private changeCache = new Map<string, ItemChangeData>()
  private isInitialized = false

  constructor() {
    // Initialize change cache
  }

  /**
   * Initialize all enhanced features
   */
  async initialize(): Promise<void> {
    if (this.isInitialized) return

    console.log('[EnhancedSync] Initializing enhanced sync service...')

    try {
      // Start real-time monitoring
      await startGlobalMonitoring()
      console.log('[EnhancedSync] Real-time monitoring started')

      // Start intelligent scheduling
      await startIntelligentScheduling()
      console.log('[EnhancedSync] Intelligent scheduling started')

      this.isInitialized = true
      console.log('[EnhancedSync] Enhanced sync service initialized')

    } catch (error) {
      console.error('[EnhancedSync] Initialization failed:', error)
      throw error
    }
  }

  /**
   * Execute enhanced sync with all optimizations
   */
  async executeEnhancedSync(options: EnhancedSyncOptions = {}): Promise<EnhancedSyncResult> {
    const startTime = Date.now()
    
    // Ensure initialization
    if (!this.isInitialized) {
      await this.initialize()
    }

    const {
      strategy = 'smart',
      enableChangeDetection = true,
      enableRealTimeMonitoring = true,
      forceSync = false,
      batchSize = 100,
      dryRun = false
    } = options

    console.log(`[EnhancedSync] Starting enhanced ${strategy} sync`)
    console.log(`[EnhancedSync] Change detection: ${enableChangeDetection ? 'enabled' : 'disabled'}`)

    let result: EnhancedSyncResult = {
      success: false,
      strategy,
      itemsProcessed: 0,
      itemsUpdated: 0,
      itemsSkipped: 0,
      newItems: 0,
      duration: 0,
      changeDetectionStats: {
        enabled: enableChangeDetection,
        changeRate: 0,
        efficiencyGain: 0
      },
      realTimeAlerts: 0
    }

    try {
      if (enableChangeDetection && !forceSync) {
        result = await this.executeWithChangeDetection(options)
      } else {
        // Fall back to standard sync
        console.log('[EnhancedSync] Using standard sync (change detection disabled or forced)')
        const standardResult = await baseExecuteSync(options)
        
        result = {
          ...result,
          success: standardResult.success,
          itemsProcessed: standardResult.itemsSynced || 0,
          itemsUpdated: standardResult.itemsSynced || 0,
          duration: standardResult.duration || 0,
          errors: standardResult.errors
        }
      }

      // Get real-time alerts count if monitoring enabled
      if (enableRealTimeMonitoring) {
        result.realTimeAlerts = await this.getRecentAlertsCount()
      }

      result.duration = Date.now() - startTime

      // Log enhanced sync statistics
      await this.logEnhancedSyncStats(result)

      console.log(`[EnhancedSync] Enhanced sync completed:`, {
        success: result.success,
        strategy: result.strategy,
        itemsProcessed: result.itemsProcessed,
        itemsUpdated: result.itemsUpdated,
        changeRate: result.changeDetectionStats.changeRate.toFixed(1) + '%',
        efficiencyGain: result.changeDetectionStats.efficiencyGain.toFixed(1) + '%',
        duration: Math.round(result.duration / 1000) + 's'
      })

      return result

    } catch (error) {
      result.success = false
      result.duration = Date.now() - startTime
      result.errors = [error instanceof Error ? error.message : 'Unknown error']

      console.error('[EnhancedSync] Enhanced sync failed:', error)
      return result
    }
  }

  /**
   * Execute sync with smart change detection
   */
  private async executeWithChangeDetection(options: EnhancedSyncOptions): Promise<EnhancedSyncResult> {
    console.log('[EnhancedSync] Executing sync with change detection...')

    // Get current database items for comparison
    const { data: currentDbItems, error: dbError } = await supabase
      .from('inventory_items')
      .select('*')
      .limit(10000) // Reasonable limit

    if (dbError) {
      throw new Error(`Failed to fetch current items: ${dbError.message}`)
    }

    // Get Finale data (simplified - would use actual Finale API)
    const finaleItems = await this.getFinaleData(options.strategy!)
    
    if (!finaleItems || finaleItems.length === 0) {
      return {
        success: true,
        strategy: options.strategy!,
        itemsProcessed: 0,
        itemsUpdated: 0,
        itemsSkipped: 0,
        newItems: 0,
        duration: 0,
        changeDetectionStats: {
          enabled: true,
          changeRate: 0,
          efficiencyGain: 0
        },
        realTimeAlerts: 0
      }
    }

    // Build existing items map for change detection
    const existingItemsMap = new Map<string, ItemChangeData>()
    currentDbItems?.forEach(item => {
      existingItemsMap.set(item.sku, {
        sku: item.sku,
        contentHash: item.content_hash || '',
        lastSyncedAt: new Date(item.finale_last_sync || item.last_updated),
        lastModifiedAt: new Date(item.finale_last_modified || item.last_updated),
        syncPriority: 5,
        changeFields: []
      })
    })

    // Use change detection to filter items
    const changeAnalysis = filterChangedItems(finaleItems, existingItemsMap, options.forceSync)

    console.log('[EnhancedSync] Change analysis:', {
      totalItems: finaleItems.length,
      changedItems: changeAnalysis.toSync.length,
      unchangedItems: changeAnalysis.unchanged
    })

    // Calculate efficiency metrics
    const changeRate = (changeAnalysis.toSync.length / finaleItems.length) * 100
    const efficiencyGain = (changeAnalysis.unchanged / finaleItems.length) * 100

    // Process only changed items if not dry run
    let itemsUpdated = 0
    let newItems = 0

    if (!options.dryRun) {
      for (const finaleItem of changeAnalysis.toSync) {
        const sku = finaleItem.productSku || finaleItem.sku
        const existingItem = currentDbItems?.find(item => item.sku === sku)

        try {
          if (existingItem) {
            // Update existing item
            await this.updateInventoryItem(finaleItem, existingItem, [])
            itemsUpdated++
          } else {
            // Create new item
            await this.createInventoryItem(finaleItem)
            newItems++
          }
          
          // Update change tracking
          await this.updateChangeTracking(finaleItem, generateItemHash(finaleItem))
        } catch (error) {
          console.error(`[EnhancedSync] Failed to process ${sku}:`, error)
        }
      }
    }

    return {
      success: true,
      strategy: options.strategy!,
      itemsProcessed: finaleItems.length,
      itemsUpdated,
      itemsSkipped: changeAnalysis.unchanged,
      newItems,
      duration: 0, // Will be set by caller
      changeDetectionStats: {
        enabled: true,
        changeRate,
        efficiencyGain
      },
      realTimeAlerts: 0 // Will be set by caller
    }
  }

  /**
   * Get Finale data (placeholder - would integrate with actual Finale API)
   */
  private async getFinaleData(strategy: string): Promise<any[]> {
    // This would integrate with your existing Finale API service
    // For now, return empty array as placeholder
    console.log(`[EnhancedSync] Getting Finale data for strategy: ${strategy}`)
    return []
  }

  /**
   * Update inventory item with change tracking
   */
  private async updateInventoryItem(
    finaleItem: any, 
    dbItem: InventoryItem, 
    changedFields: string[]
  ): Promise<void> {
    const updates = this.mapFinaleItemToDbUpdate(finaleItem)
    
    const { error } = await supabase
      .from('inventory_items')
      .update({
        ...updates,
        last_change_detected: new Date().toISOString(),
        finale_last_sync: new Date().toISOString()
      })
      .eq('id', dbItem.id)

    if (error) {
      throw new Error(`Update failed: ${error.message}`)
    }
  }

  /**
   * Create new inventory item
   */
  private async createInventoryItem(finaleItem: any): Promise<void> {
    const itemData = this.mapFinaleItemToDbItem(finaleItem)
    
    const { error } = await supabase
      .from('inventory_items')
      .insert({
        ...itemData,
        last_change_detected: new Date().toISOString(),
        finale_last_sync: new Date().toISOString()
      })

    if (error) {
      throw new Error(`Create failed: ${error.message}`)
    }
  }

  /**
   * Update change tracking information
   */
  private async updateChangeTracking(finaleItem: any, contentHash: string): Promise<void> {
    const { error } = await supabase
      .from('inventory_items')
      .update({
        content_hash: contentHash,
        finale_last_modified: finaleItem.lastUpdatedDate || new Date().toISOString()
      })
      .eq('sku', finaleItem.productSku || finaleItem.sku)

    if (error) {
      console.error('[EnhancedSync] Failed to update change tracking:', error)
    }
  }

  /**
   * Map Finale item to database update object
   */
  private mapFinaleItemToDbUpdate(finaleItem: any): Partial<InventoryItem> {
    return {
      stock: finaleItem.quantityOnHand || finaleItem.stock || 0,
      cost: finaleItem.unitCost || finaleItem.cost || 0,
      vendor: finaleItem.supplierName || finaleItem.vendor || null,
      product_name: finaleItem.description || finaleItem.productName || finaleItem.name,
      last_updated: new Date().toISOString()
    }
  }

  /**
   * Map Finale item to new database item
   */
  private mapFinaleItemToDbItem(finaleItem: any): Partial<InventoryItem> {
    return {
      sku: finaleItem.productSku || finaleItem.sku,
      product_name: finaleItem.description || finaleItem.productName || finaleItem.name,
      stock: finaleItem.quantityOnHand || finaleItem.stock || 0,
      cost: finaleItem.unitCost || finaleItem.cost || 0,
      vendor: finaleItem.supplierName || finaleItem.vendor || null,
      location: finaleItem.primaryLocation || 'Shipping',
      reorder_point: finaleItem.reorderLevel || 0,
      reorder_quantity: finaleItem.reorderQuantity || 0
    }
  }

  /**
   * Get recent alerts count
   */
  private async getRecentAlertsCount(): Promise<number> {
    try {
      const { count } = await supabase
        .from('inventory_alerts')
        .select('id', { count: 'exact', head: true })
        .gte('created_at', new Date(Date.now() - 60 * 60 * 1000).toISOString()) // Last hour

      return count || 0
    } catch (error) {
      console.error('[EnhancedSync] Failed to get alerts count:', error)
      return 0
    }
  }

  /**
   * Log enhanced sync statistics
   */
  private async logEnhancedSyncStats(result: EnhancedSyncResult): Promise<void> {
    try {
      const { error } = await supabase
        .from('sync_logs')
        .insert({
          sync_type: 'finale_inventory_enhanced',
          status: result.success ? 'success' : 'error',
          synced_at: new Date().toISOString(),
          items_processed: result.itemsProcessed,
          items_updated: result.itemsUpdated,
          duration_ms: result.duration,
          metadata: {
            strategy: result.strategy,
            changeDetection: result.changeDetectionStats,
            itemsSkipped: result.itemsSkipped,
            newItems: result.newItems,
            realTimeAlerts: result.realTimeAlerts,
            enhanced: true
          },
          errors: result.errors || []
        })

      if (error) {
        console.error('[EnhancedSync] Failed to log stats:', error)
      }
    } catch (error) {
      console.error('[EnhancedSync] Logging error:', error)
    }
  }
}

/**
 * Global enhanced sync service instance
 */
let globalEnhancedSyncService: EnhancedSyncService | null = null

/**
 * Get or create global enhanced sync service
 */
export function getEnhancedSyncService(): EnhancedSyncService {
  if (!globalEnhancedSyncService) {
    globalEnhancedSyncService = new EnhancedSyncService()
  }
  return globalEnhancedSyncService
}

/**
 * Execute enhanced sync (main entry point)
 */
export async function executeEnhancedSync(options: EnhancedSyncOptions = {}): Promise<EnhancedSyncResult> {
  const service = getEnhancedSyncService()
  return await service.executeEnhancedSync(options)
}

/**
 * Execute intelligent sync with analysis
 */
export async function executeIntelligentEnhancedSync(): Promise<{
  success: boolean
  strategy: string
  duration: number
  enhancedResult: EnhancedSyncResult
  analysis: any
}> {
  console.log('[EnhancedSync] Executing intelligent enhanced sync...')

  try {
    // Get intelligent analysis and execution
    const intelligentResult = await executeIntelligentSync()
    
    // Execute enhanced sync with the recommended strategy
    const enhancedResult = await executeEnhancedSync({
      strategy: intelligentResult.strategy as any,
      enableChangeDetection: true,
      enableRealTimeMonitoring: true
    })

    return {
      success: enhancedResult.success,
      strategy: intelligentResult.strategy,
      duration: enhancedResult.duration,
      enhancedResult,
      analysis: intelligentResult.analysis
    }
  } catch (error) {
    console.error('[EnhancedSync] Intelligent enhanced sync failed:', error)
    throw error
  }
}

/**
 * Initialize all enhanced sync features
 */
export async function initializeEnhancedSync(): Promise<void> {
  const service = getEnhancedSyncService()
  await service.initialize()
}

/**
 * Health check for enhanced sync system
 */
export async function checkEnhancedSyncHealth(): Promise<{
  status: 'healthy' | 'degraded' | 'unhealthy'
  components: {
    changeDetection: boolean
    realTimeMonitoring: boolean
    intelligentScheduling: boolean
    database: boolean
  }
  lastSync: Date | null
  criticalAlerts: number
}> {
  try {
    // Check database connectivity
    const { error: dbError } = await supabase.from('inventory_items').select('id').limit(1)
    const databaseHealthy = !dbError

    // Check real-time monitoring
    const monitor = getCriticalItemMonitor()
    const monitorStatus = monitor.getStatus()
    
    // Get last sync info
    const { data: lastSync } = await supabase
      .from('sync_logs')
      .select('synced_at')
      .eq('sync_type', 'finale_inventory_enhanced')
      .order('synced_at', { ascending: false })
      .limit(1)
      .maybeSingle()

    // Get critical alerts count
    const { count: criticalAlerts } = await supabase
      .from('inventory_alerts')
      .select('id', { count: 'exact', head: true })
      .eq('severity', 'critical')
      .eq('acknowledged', false)

    const components = {
      changeDetection: true, // Always available
      realTimeMonitoring: monitorStatus.isMonitoring,
      intelligentScheduling: true, // Would check scheduler status
      database: databaseHealthy
    }

    const healthyComponents = Object.values(components).filter(Boolean).length
    const totalComponents = Object.keys(components).length

    let status: 'healthy' | 'degraded' | 'unhealthy'
    if (healthyComponents === totalComponents) {
      status = 'healthy'
    } else if (healthyComponents >= totalComponents * 0.75) {
      status = 'degraded'
    } else {
      status = 'unhealthy'
    }

    return {
      status,
      components,
      lastSync: lastSync ? new Date(lastSync.synced_at) : null,
      criticalAlerts: criticalAlerts || 0
    }
  } catch (error) {
    console.error('[EnhancedSync] Health check failed:', error)
    return {
      status: 'unhealthy',
      components: {
        changeDetection: false,
        realTimeMonitoring: false,
        intelligentScheduling: false,
        database: false
      },
      lastSync: null,
      criticalAlerts: 0
    }
  }
}

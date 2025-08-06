/**
 * Consolidated Sync Service
 * Handles all sync strategies in a unified way
 */

import { FinaleApiService, getFinaleConfig } from './finale-api'
import { CachedFinaleApiService } from './finale-api-cached'
import {
  createSyncLog,
  completeSyncLog,
  failSyncLog,
  isAnySyncRunning,
  markStuckSyncsAsFailed,
  getLastSuccessfulSync,
  getInventoryItems,
  updateInventoryItem,
  createInventoryItem,
  syncVendorFromFinale
} from './data-access/index'
import { SyncError, ExternalServiceError, retryWithBackoff } from './errors'
import { SyncLogger } from './sync-logger'

export type SyncStrategy = 'smart' | 'full' | 'inventory' | 'critical' | 'active'

export interface SyncOptions {
  strategy?: SyncStrategy
  dryRun?: boolean
  filterYear?: number
  batchSize?: number
  maxRetries?: number
}

export interface SyncResult {
  success: boolean
  itemsSynced: number
  itemsFailed: number
  duration: number
  errors?: string[]
}

/**
 * Main sync orchestrator
 */
export class SyncService {
  private finaleApi: FinaleApiService | null = null
  private logger: SyncLogger | null = null

  async initialize(): Promise<void> {
    const config = await getFinaleConfig()
    if (!config) {
      throw new SyncError('initialization', 'Finale API credentials not configured')
    }

    // Use cached API service for better performance
    this.finaleApi = new CachedFinaleApiService(config)

    // Test connection
    const isConnected = await this.finaleApi.testConnection()
    if (!isConnected) {
      throw new ExternalServiceError('Finale API', 'Failed to connect')
    }
  }

  /**
   * Execute sync with specified strategy
   */
  async executeSync(options: SyncOptions = {}): Promise<SyncResult> {
    const {
      strategy = 'smart',
      dryRun = false,
      filterYear = new Date().getFullYear(),
      batchSize = 50,
      maxRetries = 3
    } = options

    // Check for running syncs
    const isRunning = await isAnySyncRunning()
    if (isRunning) {
      throw new SyncError(strategy, 'A sync is already in progress')
    }

    // Clean up stuck syncs
    await markStuckSyncsAsFailed(30)

    // Create sync log
    const syncLog = await createSyncLog(strategy)
    const startTime = Date.now()
    
    // Initialize logger
    this.logger = new SyncLogger(strategy)
    await this.logger.startSync({
      dryRun,
      filterYear,
      batchSize,
      maxRetries
    })

    try {
      // Initialize if needed
      if (!this.finaleApi) {
        this.logger.log('initialization', 'retry')
        await this.initialize()
        this.logger.log('initialization', 'success')
      }

      let result: SyncResult

      // Execute strategy
      switch (strategy) {
        case 'smart':
          result = await this.executeSmartSync(options)
          break
        case 'full':
          result = await this.executeFullSync(options)
          break
        case 'inventory':
          result = await this.executeInventorySync(options)
          break
        case 'critical':
          result = await this.executeCriticalSync(options)
          break
        case 'active':
          result = await this.executeActiveSync(options)
          break
        default:
          throw new SyncError(strategy, `Unknown sync strategy: ${strategy}`)
      }

      // Complete sync log
      await completeSyncLog(syncLog.id, result.itemsSynced)
      
      // Log completion
      const duration = Date.now() - startTime
      await this.logger.completeSync(true, {
        itemsProcessed: result.itemsSynced,
        itemsFailed: result.itemsFailed,
        duration
      })

      return result
    } catch (error) {
      // Fail sync log
      await failSyncLog(syncLog.id, error)
      
      // Log failure
      const duration = Date.now() - startTime
      await this.logger.completeSync(false, {
        duration,
        error: error instanceof Error ? error.message : 'Unknown error'
      })
      
      throw error
    }
  }

  /**
   * Smart sync - determines what to sync based on last sync time
   */
  private async executeSmartSync(options: SyncOptions): Promise<SyncResult> {
    const lastSync = await getLastSuccessfulSync()
    
    if (!lastSync) {
      // No previous sync, do full sync
      return this.executeFullSync(options)
    }

    const hoursSinceLastSync = (Date.now() - new Date(lastSync.completed_at!).getTime()) / 1000 / 60 / 60

    if (hoursSinceLastSync < 6) {
      // Recent sync, only update inventory levels
      return this.executeInventorySync(options)
    } else if (hoursSinceLastSync < 24) {
      // Within a day, sync critical items
      return this.executeCriticalSync(options)
    } else {
      // More than a day, do full sync
      return this.executeFullSync(options)
    }
  }

  /**
   * Full sync - all products and vendors
   */
  private async executeFullSync(options: SyncOptions): Promise<SyncResult> {
    const startTime = Date.now()
    let itemsSynced = 0
    let itemsFailed = 0
    const errors: string[] = []

    try {
      // Sync vendors first

      const vendors = await this.finaleApi!.getVendors()
      
      for (const vendor of vendors) {
        try {
          await syncVendorFromFinale(vendor)
          itemsSynced++
        } catch (error) {
          itemsFailed++
          errors.push(`Vendor ${vendor.name}: ${error}`)
        }
      }

      // Sync all products

      const products = await this.finaleApi!.getAllProducts({
        filterYear: options.filterYear
      })

      // Process in batches
      const batchSize = options.batchSize || 50
      const totalBatches = Math.ceil(products.length / batchSize)
      
      for (let i = 0; i < products.length; i += batchSize) {
        const batch = products.slice(i, i + batchSize)
        const batchNumber = Math.floor(i / batchSize) + 1
        
        if (this.logger) {
          this.logger.logBatch(batchNumber, totalBatches, batch.length, 'started')
        }
        
        await retryWithBackoff(async () => {
          await this.processBatch(batch, options)
        }, {
          maxRetries: options.maxRetries || 3,
          shouldRetry: (error, attempt) => {
            const shouldRetry = error instanceof ExternalServiceError || 
                              (error instanceof Error && error.message.includes('rate limit'))
            
            if (shouldRetry && this.logger) {
              this.logger.logRetry('processBatch', attempt + 1, options.maxRetries || 3, 
                error instanceof Error ? error.message : 'Unknown error',
                Math.min(1000 * Math.pow(2, attempt), 10000)
              )
            }
            
            return shouldRetry
          }
        })

        itemsSynced += batch.length
        
        if (this.logger) {
          this.logger.logBatch(batchNumber, totalBatches, batch.length, 'completed')
        }
        
        // Log progress
        const progress = Math.round((i + batch.length) / products.length * 100)

      }

      const duration = Date.now() - startTime
      return {
        success: true,
        itemsSynced,
        itemsFailed,
        duration,
        errors: errors.length > 0 ? errors : undefined
      }
    } catch (error) {
      throw new SyncError('full', `Full sync failed: ${error}`)
    }
  }

  /**
   * Inventory sync - only update stock levels
   */
  private async executeInventorySync(options: SyncOptions): Promise<SyncResult> {
    const startTime = Date.now()
    let itemsSynced = 0
    let itemsFailed = 0
    const errors: string[] = []

    try {

      // Get all current items from database
      const { items: dbItems } = await getInventoryItems({}, { limit: 10000 })
      const skuMap = new Map(dbItems.map(item => [item.sku, item]))

      // Get inventory levels from Finale
      const finaleInventory = await this.finaleApi!.getInventoryLevels()

      // Update only stock levels
      for (const finaleItem of finaleInventory) {
        try {
          const dbItem = skuMap.get(finaleItem.sku)
          if (dbItem) {
            await updateInventoryItem(dbItem.id, {
              stock: finaleItem.quantity,
              last_updated: new Date().toISOString()
            })
            itemsSynced++
          }
        } catch (error) {
          itemsFailed++
          errors.push(`SKU ${finaleItem.sku}: ${error}`)
        }
      }

      const duration = Date.now() - startTime
      return {
        success: true,
        itemsSynced,
        itemsFailed,
        duration,
        errors: errors.length > 0 ? errors : undefined
      }
    } catch (error) {
      throw new SyncError('inventory', `Inventory sync failed: ${error}`)
    }
  }

  /**
   * Critical sync - items below reorder point
   */
  private async executeCriticalSync(options: SyncOptions): Promise<SyncResult> {
    const startTime = Date.now()
    let itemsSynced = 0
    let itemsFailed = 0

    try {

      // Get critical items from database
      const { items: criticalItems } = await getInventoryItems(
        { status: 'critical' },
        { limit: 1000 }
      )

      // Get their current data from Finale
      const skus = criticalItems.map(item => item.sku)
      const finaleItems = await this.finaleApi!.getProductsBySKUs(skus)

      // Update critical items
      await this.processBatch(finaleItems, options)
      itemsSynced = finaleItems.length

      const duration = Date.now() - startTime
      return {
        success: true,
        itemsSynced,
        itemsFailed,
        duration
      }
    } catch (error) {
      throw new SyncError('critical', `Critical sync failed: ${error}`)
    }
  }

  /**
   * Active sync - non-discontinued items
   */
  private async executeActiveSync(options: SyncOptions): Promise<SyncResult> {
    const startTime = Date.now()
    let itemsSynced = 0
    let itemsFailed = 0

    try {

      // Get active products from Finale
      const products = await this.finaleApi!.getActiveProducts({
        filterYear: options.filterYear
      })

      // Process in batches
      const batchSize = options.batchSize || 50
      const totalBatches = Math.ceil(products.length / batchSize)
      
      for (let i = 0; i < products.length; i += batchSize) {
        const batch = products.slice(i, i + batchSize)
        const batchNumber = Math.floor(i / batchSize) + 1
        
        if (this.logger) {
          this.logger.logBatch(batchNumber, totalBatches, batch.length, 'started')
        }
        await this.processBatch(batch, options)
        itemsSynced += batch.length
      }

      const duration = Date.now() - startTime
      return {
        success: true,
        itemsSynced,
        itemsFailed,
        duration
      }
    } catch (error) {
      throw new SyncError('active', `Active sync failed: ${error}`)
    }
  }

  /**
   * Process a batch of items
   */
  private async processBatch(items: any[], options: SyncOptions): Promise<void> {
    if (options.dryRun) {

      return
    }

    // Get existing items by SKU
    const skus = items.map(item => item.itemSKU || item.sku)
    const { items: existingItems } = await getInventoryItems(
      { search: skus.join(' ') },
      { limit: items.length * 2 }
    )
    
    const existingMap = new Map(
      existingItems.map(item => [item.sku, item])
    )

    // Process each item
    for (const finaleItem of items) {
      const sku = finaleItem.itemSKU || finaleItem.sku
      const existing = existingMap.get(sku)

      const itemData = {
        sku,
        product_name: finaleItem.itemName || finaleItem.name,
        stock: finaleItem.quantityOnHand || finaleItem.quantity || 0,
        cost: finaleItem.unitPrice || finaleItem.cost || 0,
        vendor: finaleItem.primarySupplierName || finaleItem.supplier || finaleItem.vendor,
        location: finaleItem.location || 'Default',
        finale_id: finaleItem.itemID || finaleItem.id,
        last_updated: new Date().toISOString()
      }

      if (existing) {
        await updateInventoryItem(existing.id, itemData)
      } else {
        await createInventoryItem(itemData)
      }
    }
  }
}

/**
 * Factory function to create and execute sync
 */
export async function executeSync(options: SyncOptions = {}): Promise<SyncResult> {
  const syncService = new SyncService()
  return syncService.executeSync(options)
}
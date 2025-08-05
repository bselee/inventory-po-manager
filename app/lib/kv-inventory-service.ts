import { redis, getRedisClient } from './redis-client'
import { FinaleReportApiService } from './finale-report-api'
import { getFinaleConfig } from './finale-api'
import { withRedisRetry, withApiRetry } from './retry-utils'

// Cache keys
const CACHE_KEYS = {
  INVENTORY_FULL: 'inventory:full',
  INVENTORY_BY_SKU: 'inventory:sku:',
  INVENTORY_VENDORS: 'inventory:vendors',
  INVENTORY_SUMMARY: 'inventory:summary',
  LAST_SYNC: 'inventory:last_sync',
  SYNC_STATUS: 'inventory:sync_status'
} as const

// Cache TTL (in seconds)
const CACHE_TTL = {
  INVENTORY: 900, // 15 minutes
  VENDORS: 3600, // 1 hour
  SUMMARY: 300, // 5 minutes
  SYNC_STATUS: 60 // 1 minute
} as const

export interface CachedInventoryItem {
  sku: string
  product_name: string
  vendor: string | null
  current_stock: number
  cost: number
  location: string
  reorder_point?: number
  sales_velocity?: number
  days_until_stockout?: number
  stock_status_level?: 'critical' | 'low' | 'adequate' | 'overstocked'
  last_updated: string
  finale_id?: string
}

export interface InventorySummary {
  total_items: number
  total_inventory_value: number
  out_of_stock_count: number
  low_stock_count: number
  critical_reorder_count: number
  vendors_count: number
  last_sync: string | null
}

export interface SyncStatus {
  is_syncing: boolean
  last_sync: string | null
  next_sync: string | null
  error: string | null
}

/**
 * KV-based Inventory Service
 * Fetches from Finale Reporting API and caches in Vercel KV
 */
export class KVInventoryService {
  private reportApi: FinaleReportApiService | null = null
  
  /**
   * Initialize the service with Finale credentials
   */
  private async initialize() {
    if (!this.reportApi) {
      const config = await getFinaleConfig()
      if (!config) {
        throw new Error('Finale API credentials not configured')
      }
      
      this.reportApi = new FinaleReportApiService({
        apiKey: config.apiKey,
        apiSecret: config.apiSecret,
        accountPath: config.accountPath
      })
    }
  }
  
  /**
   * Get all inventory items (with caching)
   */
  async getInventory(forceRefresh = false): Promise<CachedInventoryItem[]> {
    try {
      // Check cache first with retry
      if (!forceRefresh) {
        const cached = await withRedisRetry(
          () => redis.get<CachedInventoryItem[]>(CACHE_KEYS.INVENTORY_FULL),
          'getInventory:cache-check'
        )
        if (cached) {
          console.log('[KV Inventory] Serving from cache')
          return cached
        }
      }
      
      // Fetch fresh data
      console.log('[KV Inventory] Cache miss or force refresh, fetching from Finale...')
      return await this.refreshInventoryCache()
    } catch (error) {
      console.error('[KV Inventory] Error getting inventory:', error)
      // Try to return stale cache if available
      const stale = await withRedisRetry(
        () => redis.get<CachedInventoryItem[]>(CACHE_KEYS.INVENTORY_FULL),
        'getInventory:stale-cache'
      ).catch(() => null)
      
      if (stale) {
        console.log('[KV Inventory] Returning stale cache due to error')
        return stale
      }
      throw error
    }
  }
  
  /**
   * Get a single inventory item by SKU
   */
  async getInventoryItem(sku: string): Promise<CachedInventoryItem | null> {
    // Try individual cache first
    const cached = await redis.get<CachedInventoryItem>(`${CACHE_KEYS.INVENTORY_BY_SKU}${sku}`)
    if (cached) {
      return cached
    }
    
    // Otherwise get from full inventory
    const inventory = await this.getInventory()
    return inventory.find(item => item.sku === sku) || null
  }
  
  /**
   * Get unique vendors list
   */
  async getVendors(): Promise<string[]> {
    const cached = await redis.get<string[]>(CACHE_KEYS.INVENTORY_VENDORS)
    if (cached) {
      return cached
    }
    
    const inventory = await this.getInventory()
    const vendors = [...new Set(inventory.map(item => item.vendor).filter(Boolean))] as string[]
    
    // Cache vendors list
    await redis.setex(CACHE_KEYS.INVENTORY_VENDORS, CACHE_TTL.VENDORS, vendors)
    
    return vendors
  }
  
  /**
   * Get inventory summary statistics
   */
  async getSummary(): Promise<InventorySummary> {
    const cached = await redis.get<InventorySummary>(CACHE_KEYS.INVENTORY_SUMMARY)
    if (cached) {
      return cached
    }
    
    const inventory = await this.getInventory()
    const vendors = await this.getVendors()
    const lastSync = await redis.get<string>(CACHE_KEYS.LAST_SYNC)
    
    const summary: InventorySummary = {
      total_items: inventory.length,
      total_inventory_value: inventory.reduce((sum, item) => 
        sum + ((item.current_stock || 0) * (item.cost || 0)), 0
      ),
      out_of_stock_count: inventory.filter(item => item.current_stock === 0).length,
      low_stock_count: inventory.filter(item => 
        item.stock_status_level === 'low' || item.stock_status_level === 'critical'
      ).length,
      critical_reorder_count: inventory.filter(item => 
        item.stock_status_level === 'critical'
      ).length,
      vendors_count: vendors.length,
      last_sync: lastSync
    }
    
    // Cache summary
    await redis.setex(CACHE_KEYS.INVENTORY_SUMMARY, CACHE_TTL.SUMMARY, summary)
    
    return summary
  }
  
  /**
   * Get sync status
   */
  async getSyncStatus(): Promise<SyncStatus> {
    const [isSync, lastSync, error] = await Promise.all([
      redis.get<boolean>(CACHE_KEYS.SYNC_STATUS),
      redis.get<string>(CACHE_KEYS.LAST_SYNC),
      redis.get<string>(`${CACHE_KEYS.SYNC_STATUS}:error`)
    ])
    
    // Calculate next sync time (15 minutes after last sync)
    let nextSync = null
    if (lastSync) {
      const lastSyncTime = new Date(lastSync).getTime()
      const nextSyncTime = lastSyncTime + (CACHE_TTL.INVENTORY * 1000)
      nextSync = new Date(nextSyncTime).toISOString()
    }
    
    return {
      is_syncing: isSync || false,
      last_sync: lastSync,
      next_sync: nextSync,
      error
    }
  }
  
  /**
   * Refresh inventory cache from Finale
   */
  private async refreshInventoryCache(): Promise<CachedInventoryItem[]> {
    await this.initialize()
    
    // Try to acquire sync lock
    const lockKey = `${CACHE_KEYS.SYNC_STATUS}:lock`
    const lockValue = `${Date.now()}-${Math.random()}`
    const lockTTL = 300 // 5 minutes max lock time
    
    // Try to set lock with NX (only if not exists)
    const client = await getRedisClient()
    const lockAcquired = await client.set(lockKey, lockValue, {
      NX: true,
      EX: lockTTL
    })
    
    if (!lockAcquired) {
      // Check if existing sync is stuck
      const lockAge = await this.checkLockAge(lockKey)
      if (lockAge > 300000) { // 5 minutes
        console.log('[KV Inventory] Clearing stuck sync lock')
        await redis.del(lockKey)
        // Try once more
        const retryLock = await client.set(lockKey, lockValue, {
          NX: true,
          EX: lockTTL
        })
        if (!retryLock) {
          throw new Error('Another sync is already in progress')
        }
      } else {
        throw new Error('Another sync is already in progress')
      }
    }
    
    // Set sync status
    await redis.setex(CACHE_KEYS.SYNC_STATUS, CACHE_TTL.SYNC_STATUS, true)
    
    try {
      // Get report URL from settings
      const settings = await this.getSettings()
      if (!settings?.finale_inventory_report_url) {
        throw new Error('Finale inventory report URL not configured')
      }
      
      // Fetch from reporting API with retry
      const reportData = await withApiRetry(
        () => this.reportApi!.fetchInventoryWithSuppliers(settings.finale_inventory_report_url),
        'finale:inventory-report'
      )
      
      // Transform to cached format
      const inventory: CachedInventoryItem[] = reportData.map(item => ({
        sku: item.sku || item['Product ID'] || '',
        product_name: item.productName || item.name || item['Product Name'] || '',
        vendor: item.supplier || item.vendor || item['Supplier 1'] || null,
        current_stock: item.totalStock || item['Units in stock'] || 0,
        cost: item.cost || 0,
        location: item.locations?.[0]?.location || item.location || 'Main',
        reorder_point: item.reorderPoint || 0,
        sales_velocity: item.salesVelocity || (item['Sales last 30 days'] ? item['Sales last 30 days'] / 30 : 0),
        days_until_stockout: item.daysUntilStockout,
        stock_status_level: this.calculateStockStatus(
          item.totalStock || item['Units in stock'] || 0,
          item.reorderPoint || 0,
          item.daysUntilStockout
        ),
        last_updated: new Date().toISOString(),
        finale_id: item.finaleId || item['Product ID']
      }))
      
      // Cache the data with retry
      await withRedisRetry(async () => {
        const client = await getRedisClient()
        
        // Prepare batch operations
        const multi = client.multi()
        
        // Full inventory cache
        multi.setEx(CACHE_KEYS.INVENTORY_FULL, CACHE_TTL.INVENTORY, JSON.stringify(inventory))
        
        // Use hash for individual SKU lookups (much more efficient)
        const inventoryHash: Record<string, string> = {}
        inventory.forEach(item => {
          inventoryHash[item.sku] = JSON.stringify(item)
        })
        
        // Store all items in a single hash
        if (Object.keys(inventoryHash).length > 0) {
          multi.hSet(CACHE_KEYS.INVENTORY_BY_SKU + 'hash', inventoryHash)
          multi.expire(CACHE_KEYS.INVENTORY_BY_SKU + 'hash', CACHE_TTL.INVENTORY)
        }
        
        // Update last sync time
        multi.set(CACHE_KEYS.LAST_SYNC, new Date().toISOString())
        
        // Clear sync status and lock
        multi.del(CACHE_KEYS.SYNC_STATUS)
        multi.del(`${CACHE_KEYS.SYNC_STATUS}:error`)
        multi.del(lockKey)
        
        // Clear summary cache to force recalculation
        multi.del(CACHE_KEYS.INVENTORY_SUMMARY)
        
        // Execute all operations atomically
        await multi.exec()
      }, 'refreshInventoryCache:save')
      
      console.log(`[KV Inventory] Cached ${inventory.length} items`)
      return inventory
      
    } catch (error) {
      // Set error status
      await redis.setex(
        `${CACHE_KEYS.SYNC_STATUS}:error`,
        CACHE_TTL.SYNC_STATUS,
        error instanceof Error ? error.message : 'Unknown error'
      )
      await redis.del(CACHE_KEYS.SYNC_STATUS)
      // Always clean up the lock on error
      await redis.del(lockKey)
      
      throw error
    }
  }
  
  /**
   * Check age of a lock
   */
  private async checkLockAge(lockKey: string): Promise<number> {
    const lockValue = await redis.get<string>(lockKey)
    if (!lockValue) return 0
    
    // Extract timestamp from lock value
    const timestamp = parseInt(lockValue.split('-')[0])
    if (isNaN(timestamp)) return 0
    
    return Date.now() - timestamp
  }
  
  /**
   * Calculate stock status level
   */
  private calculateStockStatus(
    stock: number,
    reorderPoint: number,
    daysUntilStockout?: number
  ): 'critical' | 'low' | 'adequate' | 'overstocked' {
    if (stock === 0) return 'critical'
    if (daysUntilStockout && daysUntilStockout <= 7) return 'critical'
    if (stock <= reorderPoint || (daysUntilStockout && daysUntilStockout <= 30)) return 'low'
    if (daysUntilStockout && daysUntilStockout > 180) return 'overstocked'
    return 'adequate'
  }
  
  /**
   * Get settings from KV or Supabase fallback
   */
  private async getSettings() {
    // For now, still use Supabase for settings
    // In a full migration, this would also move to KV
    const { getFinaleConfig } = await import('./finale-api')
    const config = await getFinaleConfig()
    
    // Get additional settings from Supabase
    const { supabase } = await import('./supabase')
    const { data } = await supabase
      .from('settings')
      .select('finale_inventory_report_url')
      .single()
    
    return {
      ...config,
      finale_inventory_report_url: data?.finale_inventory_report_url
    }
  }
  
  /**
   * Clear all caches
   */
  async clearCache(): Promise<void> {
    console.log('[KV Inventory] Clearing all caches...')
    
    // Get all inventory items to clear individual caches
    const inventory = await redis.get<CachedInventoryItem[]>(CACHE_KEYS.INVENTORY_FULL)
    
    await Promise.all([
      redis.del(CACHE_KEYS.INVENTORY_FULL),
      redis.del(CACHE_KEYS.INVENTORY_VENDORS),
      redis.del(CACHE_KEYS.INVENTORY_SUMMARY),
      redis.del(CACHE_KEYS.LAST_SYNC),
      redis.del(CACHE_KEYS.SYNC_STATUS),
      redis.del(`${CACHE_KEYS.SYNC_STATUS}:error`),
      redis.del(`${CACHE_KEYS.SYNC_STATUS}:lock`),
      
      // Clear the inventory hash
      redis.del(CACHE_KEYS.INVENTORY_BY_SKU + 'hash')
    ])
    
    console.log('[KV Inventory] Cache cleared')
  }
}

// Export singleton instance
export const kvInventoryService = new KVInventoryService()
/**
 * Comprehensive Redis Caching Strategy for Inventory Management System
 * 
 * This module implements a multi-tier caching strategy with intelligent
 * cache invalidation, warming, and optimization patterns.
 */

import { cache, CACHE_TTL, cacheKeys, withCache } from './redis-client'
import { supabase } from '@/app/lib/supabase'
import { InventoryItem, InventorySummary } from '@/app/types'
import { logError, logInfo } from '@/app/lib/monitoring'

/**
 * Cache Tiers and TTL Strategy
 * 
 * Tier 1 (Hot Data - 30s to 1m):
 * - Active inventory queries
 * - Current user session data
 * - Real-time metrics
 * 
 * Tier 2 (Warm Data - 5m to 10m):
 * - Inventory lists
 * - Product details
 * - Search results
 * 
 * Tier 3 (Cold Data - 1h to 24h):
 * - Vendor lists
 * - Historical data
 * - Reports
 */

export const CACHE_STRATEGY = {
  // Tier 1: Hot Data (frequently accessed, short TTL)
  HOT: {
    INVENTORY_SUMMARY: 60,        // 1 minute
    ACTIVE_FILTERS: 30,           // 30 seconds
    CURRENT_PAGE: 30,              // 30 seconds
    REAL_TIME_METRICS: 15,         // 15 seconds
    SYNC_STATUS: 10,               // 10 seconds
  },
  
  // Tier 2: Warm Data (moderate access, medium TTL)
  WARM: {
    INVENTORY_LIST: 300,           // 5 minutes
    PRODUCT_DETAILS: 600,          // 10 minutes
    SEARCH_RESULTS: 300,           // 5 minutes
    FILTER_COUNTS: 180,            // 3 minutes
    SALES_VELOCITY: 900,           // 15 minutes
  },
  
  // Tier 3: Cold Data (infrequent access, long TTL)
  COLD: {
    VENDOR_LIST: 3600,             // 1 hour
    VENDOR_DETAILS: 7200,          // 2 hours
    HISTORICAL_DATA: 86400,        // 24 hours
    REPORTS: 43200,                // 12 hours
    SETTINGS: 1800,                // 30 minutes
  }
} as const

/**
 * Cache Invalidation Strategies
 */
export class CacheInvalidator {
  /**
   * Invalidate related caches when inventory is updated
   */
  static async invalidateInventory(itemId?: string, sku?: string) {
    const patterns = [
      'inventory:summary',
      'inventory:list:*',
      'inventory:metrics:*'
    ]
    
    if (itemId) {
      patterns.push(`inventory:item:${itemId}`)
    }
    
    if (sku) {
      patterns.push(`finale:product:*:${sku}`)
    }
    
    for (const pattern of patterns) {
      await cache.deletePattern(pattern)
    }
    
    logInfo('Cache invalidated for inventory update', { itemId, sku, patterns })
  }
  
  /**
   * Invalidate vendor-related caches
   */
  static async invalidateVendor(vendorId?: string) {
    const patterns = [
      'finale:vendors:*',
      'vendor:list:*'
    ]
    
    if (vendorId) {
      patterns.push(`vendor:${vendorId}:*`)
    }
    
    for (const pattern of patterns) {
      await cache.deletePattern(pattern)
    }
  }
  
  /**
   * Invalidate all caches (nuclear option)
   */
  static async invalidateAll() {
    await cache.flush()
    logInfo('All caches flushed')
  }
  
  /**
   * Smart invalidation based on sync results
   */
  static async invalidateAfterSync(syncType: string, itemsUpdated: number) {
    if (itemsUpdated === 0) return
    
    switch (syncType) {
      case 'inventory':
        await this.invalidateInventory()
        break
      case 'vendors':
        await this.invalidateVendor()
        break
      case 'full':
        await this.invalidateAll()
        break
      default:
        // Selective invalidation based on update count
        if (itemsUpdated > 100) {
          await this.invalidateAll()
        } else {
          await this.invalidateInventory()
        }
    }
  }
}

/**
 * Cache Warming Strategies
 */
export class CacheWarmer {
  /**
   * Pre-warm critical caches on application start
   */
  static async warmOnStartup() {
    try {
      // Warm inventory summary
      await this.warmInventorySummary()
      
      // Warm vendor list
      await this.warmVendorList()
      
      // Warm first page of inventory
      await this.warmInventoryFirstPage()
      
      logInfo('Cache warming completed on startup')
    } catch (error) {
      logError('Cache warming failed', error)
    }
  }
  
  /**
   * Warm inventory summary cache
   */
  static async warmInventorySummary() {
    const key = cacheKeys.inventorySummary()
    
    const { data: items, error } = await supabase
      .from('inventory_items')
      .select('stock, cost, reorder_point, hidden')
      .eq('hidden', false)
    
    if (error) {
      logError('Failed to warm inventory summary', error)
      return
    }
    
    const summary: InventorySummary = {
      total_items: items?.length || 0,
      out_of_stock_count: items?.filter(item => item.stock === 0).length || 0,
      low_stock_count: items?.filter(item => 
        item.stock > 0 && item.stock <= item.reorder_point
      ).length || 0,
      total_inventory_value: items?.reduce((sum, item) => 
        sum + (item.stock * (item.cost || 0)), 0
      ) || 0
    }
    
    await cache.set(key, summary, CACHE_STRATEGY.HOT.INVENTORY_SUMMARY)
  }
  
  /**
   * Warm vendor list cache
   */
  static async warmVendorList() {
    const key = cacheKeys.finaleVendors(process.env.FINALE_ACCOUNT_PATH || 'default')
    
    const { data: vendors, error } = await supabase
      .from('vendors')
      .select('*')
      .order('name')
    
    if (!error && vendors) {
      await cache.set(key, vendors, CACHE_STRATEGY.COLD.VENDOR_LIST)
    }
  }
  
  /**
   * Warm first page of inventory
   */
  static async warmInventoryFirstPage() {
    const key = cacheKeys.inventoryList('default', 1, 100)
    
    const { data: items, error, count } = await supabase
      .from('inventory_items')
      .select('*', { count: 'exact' })
      .eq('hidden', false)
      .order('sku')
      .range(0, 99)
    
    if (!error && items) {
      const result = {
        items,
        page: 1,
        limit: 100,
        total: count || 0,
        totalPages: Math.ceil((count || 0) / 100)
      }
      
      await cache.set(key, result, CACHE_STRATEGY.WARM.INVENTORY_LIST)
    }
  }
  
  /**
   * Warm caches after sync completion
   */
  static async warmAfterSync(syncType: string) {
    switch (syncType) {
      case 'inventory':
        await this.warmInventorySummary()
        await this.warmInventoryFirstPage()
        break
      case 'vendors':
        await this.warmVendorList()
        break
      case 'full':
        await this.warmOnStartup()
        break
    }
  }
}

/**
 * Cache-aware data fetchers with fallback
 */
export class CachedDataFetcher {
  /**
   * Get inventory with caching
   */
  static getInventory = withCache(
    async (filters: any, page: number, limit: number) => {
      let query = supabase
        .from('inventory_items')
        .select('*', { count: 'exact' })
      
      // Apply filters
      if (filters.vendor) {
        query = query.eq('vendor', filters.vendor)
      }
      if (filters.status === 'out-of-stock') {
        query = query.eq('stock', 0)
      }
      if (filters.search) {
        query = query.or(`sku.ilike.%${filters.search}%,product_name.ilike.%${filters.search}%`)
      }
      
      // Apply pagination
      const offset = (page - 1) * limit
      query = query.range(offset, offset + limit - 1)
      
      const { data, error, count } = await query
      
      if (error) throw error
      
      return {
        items: data || [],
        page,
        limit,
        total: count || 0,
        totalPages: Math.ceil((count || 0) / limit)
      }
    },
    (filters, page, limit) => cacheKeys.inventoryList(JSON.stringify(filters), page, limit),
    CACHE_STRATEGY.WARM.INVENTORY_LIST
  )
  
  /**
   * Get inventory summary with caching
   */
  static getInventorySummary = withCache(
    async () => {
      const { data: items, error } = await supabase
        .from('inventory_items')
        .select('stock, cost, reorder_point, hidden')
        .eq('hidden', false)
      
      if (error) throw error
      
      return {
        total_items: items?.length || 0,
        out_of_stock_count: items?.filter(item => item.stock === 0).length || 0,
        low_stock_count: items?.filter(item => 
          item.stock > 0 && item.stock <= item.reorder_point
        ).length || 0,
        total_inventory_value: items?.reduce((sum, item) => 
          sum + (item.stock * (item.cost || 0)), 0
        ) || 0
      }
    },
    () => cacheKeys.inventorySummary(),
    CACHE_STRATEGY.HOT.INVENTORY_SUMMARY
  )
  
  /**
   * Get vendor list with caching
   */
  static getVendors = withCache(
    async () => {
      const { data, error } = await supabase
        .from('vendors')
        .select('*')
        .order('name')
      
      if (error) throw error
      return data || []
    },
    () => cacheKeys.finaleVendors(process.env.FINALE_ACCOUNT_PATH || 'default'),
    CACHE_STRATEGY.COLD.VENDOR_LIST
  )
}

/**
 * Cache monitoring and metrics
 */
export class CacheMonitor {
  private static metrics = {
    hits: 0,
    misses: 0,
    errors: 0,
    lastReset: new Date()
  }
  
  static recordHit() {
    this.metrics.hits++
  }
  
  static recordMiss() {
    this.metrics.misses++
  }
  
  static recordError() {
    this.metrics.errors++
  }
  
  static getMetrics() {
    const total = this.metrics.hits + this.metrics.misses
    const hitRate = total > 0 ? (this.metrics.hits / total) * 100 : 0
    
    return {
      ...this.metrics,
      total,
      hitRate: hitRate.toFixed(2) + '%',
      uptime: Date.now() - this.metrics.lastReset.getTime()
    }
  }
  
  static resetMetrics() {
    this.metrics = {
      hits: 0,
      misses: 0,
      errors: 0,
      lastReset: new Date()
    }
  }
}

/**
 * Initialize caching strategy
 */
export async function initializeCaching() {
  // Warm critical caches on startup
  if (process.env.NODE_ENV === 'production') {
    setTimeout(() => {
      CacheWarmer.warmOnStartup()
    }, 5000) // Delay to allow app initialization
  }
  
  // Set up periodic cache warming
  if (process.env.NODE_ENV === 'production') {
    setInterval(() => {
      CacheWarmer.warmInventorySummary()
    }, 5 * 60 * 1000) // Every 5 minutes
  }
  
  logInfo('Caching strategy initialized')
}

/**
 * Export unified caching interface
 */
export const CachingStrategy = {
  invalidate: CacheInvalidator,
  warm: CacheWarmer,
  fetch: CachedDataFetcher,
  monitor: CacheMonitor,
  initialize: initializeCaching
}
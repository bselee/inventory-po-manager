/**
 * Cached Finale API Service
 * Wraps the Finale API with Redis caching for improved performance
 */

import { FinaleApiService } from './finale-api'
import { cache, CACHE_TTL, cacheKeys } from './cache/redis-client'
import { logError } from './errors'

export class CachedFinaleApiService extends FinaleApiService {
  private cacheEnabled: boolean = true

  constructor(config: any) {
    super(config)
    this.cacheEnabled = cache.isAvailable()
  }

  async getInventoryData(filterYear?: number | null): Promise<any[]> {
    const cacheKey = cacheKeys.finaleInventory(this.config.accountPath) + `:${filterYear || 'all'}`

    // Try cache first
    if (this.cacheEnabled) {
      const cached = await cache.get<any[]>(cacheKey)
      if (cached) {
        console.log('[Finale Cache] Hit: Inventory data')
        return cached
      }
    }

    // Fetch from API
    console.log('[Finale Cache] Miss: Fetching inventory from API')
    const data = await super.getInventoryData(filterYear)

    // Cache the result
    if (this.cacheEnabled && data.length > 0) {
      await cache.set(cacheKey, data, CACHE_TTL.FINALE_INVENTORY)
    }

    return data
  }

  async getVendors(): Promise<any[]> {
    const cacheKey = cacheKeys.finaleVendors(this.config.accountPath)

    // Try cache first
    if (this.cacheEnabled) {
      const cached = await cache.get<any[]>(cacheKey)
      if (cached) {
        console.log('[Finale Cache] Hit: Vendors data')
        return cached
      }
    }

    // Fetch from API
    console.log('[Finale Cache] Miss: Fetching vendors from API')
    const data = await super.getVendors()

    // Cache the result
    if (this.cacheEnabled && data.length > 0) {
      await cache.set(cacheKey, data, CACHE_TTL.FINALE_VENDORS)
    }

    return data
  }

  async testConnection(): Promise<boolean> {
    // Don't cache connection tests
    return super.testConnection()
  }

  async createPurchaseOrder(orderData: any): Promise<any> {
    // Don't cache write operations
    const result = await super.createPurchaseOrder(orderData)

    // Invalidate related caches
    if (this.cacheEnabled) {
      await this.invalidateInventoryCache()
    }

    return result
  }

  async importSalesData(csvData: string): Promise<any> {
    // Don't cache write operations
    const result = await super.importSalesData(csvData)

    // Invalidate related caches
    if (this.cacheEnabled) {
      await this.invalidateInventoryCache()
    }

    return result
  }

  // Cache invalidation methods
  async invalidateInventoryCache(): Promise<void> {
    if (!this.cacheEnabled) return

    try {
      const pattern = `finale:inventory:${this.config.accountPath}:*`
      const deleted = await cache.deletePattern(pattern)
      if (deleted > 0) {
        console.log(`[Finale Cache] Invalidated ${deleted} inventory cache entries`)
      }
    } catch (error) {
      logError(error, {
        operation: 'CACHE_INVALIDATE',
        metadata: { type: 'inventory' }
      })
    }
  }

  async invalidateVendorCache(): Promise<void> {
    if (!this.cacheEnabled) return

    try {
      const key = cacheKeys.finaleVendors(this.config.accountPath)
      await cache.delete(key)
      console.log('[Finale Cache] Invalidated vendor cache')
    } catch (error) {
      logError(error, {
        operation: 'CACHE_INVALIDATE',
        metadata: { type: 'vendors' }
      })
    }
  }

  async invalidateAllCaches(): Promise<void> {
    if (!this.cacheEnabled) return

    await Promise.all([
      this.invalidateInventoryCache(),
      this.invalidateVendorCache()
    ])
  }

  // Check if caching is enabled
  isCacheEnabled(): boolean {
    return this.cacheEnabled
  }

  // Temporarily disable caching
  disableCache(): void {
    this.cacheEnabled = false
  }

  // Re-enable caching
  enableCache(): void {
    this.cacheEnabled = cache.isAvailable()
  }
}

// Factory function to create cached Finale API service
export async function createCachedFinaleApiService(config: any): Promise<CachedFinaleApiService> {
  return new CachedFinaleApiService(config)
}
import { redis, getRedisClient } from './redis-client'
import { FinaleReportApiService } from './finale-report-api'
import { getFinaleConfig } from './finale-api'
import { withRedisRetry, withApiRetry } from './retry-utils'
import { logError } from './logger'

// Cache keys
const CACHE_KEYS = {
  VENDORS_FULL: 'vendors:full',
  VENDOR_BY_ID: 'vendors:id:',
  VENDORS_SUMMARY: 'vendors:summary',
  LAST_SYNC: 'vendors:last_sync',
  SYNC_STATUS: 'vendors:sync_status'
} as const

// Cache TTL (in seconds)
const CACHE_TTL = {
  VENDORS: 3600, // 1 hour
  SUMMARY: 300, // 5 minutes
  SYNC_STATUS: 60 // 1 minute
} as const

export interface CachedVendor {
  id: string
  name: string
  email?: string
  phone?: string
  address?: string
  city?: string
  state?: string
  zip?: string
  country?: string
  website?: string
  notes?: string
  contact_name?: string
  payment_terms?: string
  lead_time_days?: number
  minimum_order?: number
  active: boolean
  last_updated: string
  finale_id?: string
}

export interface VendorsSummary {
  total_vendors: number
  active_vendors: number
  inactive_vendors: number
  last_sync: string | null
}

/**
 * KV-based Vendors Service
 * Fetches from Finale Reporting API and caches in Vercel KV
 */
export class KVVendorsService {
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
   * Get all vendors (with caching)
   */
  async getVendors(forceRefresh = false): Promise<CachedVendor[]> {
    try {
      // Check cache first with retry
      if (!forceRefresh) {
        const cached = await withRedisRetry(
          () => redis.get<CachedVendor[]>(CACHE_KEYS.VENDORS_FULL),
          'getVendors:cache-check'
        )
        if (cached) {
          return cached
        }
      }
      
      // Fetch fresh data
      return await this.refreshVendorsCache()
    } catch (error) {
      logError('[KV Vendors] Error getting vendors:', error)
      // Try to return stale cache if available
      const stale = await withRedisRetry(
        () => redis.get<CachedVendor[]>(CACHE_KEYS.VENDORS_FULL),
        'getVendors:stale-cache'
      ).catch(() => null)
      
      if (stale) {
        return stale
      }
      throw error
    }
  }
  
  /**
   * Get a single vendor by ID
   */
  async getVendor(id: string): Promise<CachedVendor | null> {
    // Try individual cache first
    const cached = await redis.get<CachedVendor>(`${CACHE_KEYS.VENDOR_BY_ID}${id}`)
    if (cached) {
      return cached
    }
    
    // Otherwise get from full vendors list
    const vendors = await this.getVendors()
    return vendors.find(vendor => vendor.id === id) || null
  }
  
  /**
   * Get vendors summary statistics
   */
  async getSummary(): Promise<VendorsSummary> {
    const cached = await redis.get<VendorsSummary>(CACHE_KEYS.VENDORS_SUMMARY)
    if (cached) {
      return cached
    }
    
    const vendors = await this.getVendors()
    const lastSync = await redis.get<string>(CACHE_KEYS.LAST_SYNC)
    
    const summary: VendorsSummary = {
      total_vendors: vendors.length,
      active_vendors: vendors.filter(v => v.active).length,
      inactive_vendors: vendors.filter(v => !v.active).length,
      last_sync: lastSync
    }
    
    // Cache summary
    await redis.setex(CACHE_KEYS.VENDORS_SUMMARY, CACHE_TTL.SUMMARY, summary)
    
    return summary
  }
  
  /**
   * Refresh vendors cache from Finale
   */
  private async refreshVendorsCache(): Promise<CachedVendor[]> {
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
      // Get report URL from environment
      const vendorsReportUrl = process.env.FINALE_VENDORS_REPORT_URL
      if (!vendorsReportUrl) {
        throw new Error('FINALE_VENDORS_REPORT_URL environment variable not configured')
      }
      
      // Fetch from reporting API with retry
      const reportData = await withApiRetry(
        () => this.reportApi!.fetchReport(vendorsReportUrl, 'jsonObject'),
        'finale:vendors-report'
      )
      
      // Transform to cached format
      const vendors: CachedVendor[] = reportData.map((item, index) => ({
        id: item['ID'] || item['Supplier ID'] || `vendor-${index}`,
        name: item['Name'] || item['Supplier Name'] || item['Company'] || '',
        email: item['Email'] || item['Email address'] || null,
        phone: item['Phone'] || item['Phone number'] || null,
        address: item['Address'] || item['Street'] || null,
        city: item['City'] || null,
        state: item['State'] || item['Province'] || null,
        zip: item['Zip'] || item['Postal Code'] || null,
        country: item['Country'] || null,
        website: item['Website'] || item['URL'] || null,
        notes: item['Notes'] || item['Description'] || null,
        contact_name: item['Contact'] || item['Contact Name'] || null,
        payment_terms: item['Payment Terms'] || item['Terms'] || null,
        lead_time_days: item['Lead Time'] ? parseInt(item['Lead Time']) : null,
        minimum_order: item['Minimum Order'] ? parseFloat(item['Minimum Order']) : null,
        active: item['Status'] !== 'Inactive' && item['Active'] !== 'No',
        last_updated: new Date().toISOString(),
        finale_id: item['ID'] || item['Supplier ID']
      }))
      
      // Cache the data with retry
      await withRedisRetry(async () => {
        const client = await getRedisClient()
        
        // Prepare batch operations
        const multi = client.multi()
        
        // Full vendors cache
        multi.setEx(CACHE_KEYS.VENDORS_FULL, CACHE_TTL.VENDORS, JSON.stringify(vendors))
        
        // Use hash for individual vendor lookups
        const vendorsHash: Record<string, string> = {}
        vendors.forEach(vendor => {
          vendorsHash[vendor.id] = JSON.stringify(vendor)
        })
        
        // Store all vendors in a single hash
        if (Object.keys(vendorsHash).length > 0) {
          multi.hSet(CACHE_KEYS.VENDOR_BY_ID + 'hash', vendorsHash)
          multi.expire(CACHE_KEYS.VENDOR_BY_ID + 'hash', CACHE_TTL.VENDORS)
        }
        
        // Update last sync time
        multi.set(CACHE_KEYS.LAST_SYNC, new Date().toISOString())
        
        // Clear sync status and lock
        multi.del(CACHE_KEYS.SYNC_STATUS)
        multi.del(`${CACHE_KEYS.SYNC_STATUS}:error`)
        multi.del(lockKey)
        
        // Clear summary cache to force recalculation
        multi.del(CACHE_KEYS.VENDORS_SUMMARY)
        
        // Execute all operations atomically
        await multi.exec()
      }, 'refreshVendorsCache:save')
      
      return vendors
      
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
   * Clear all caches
   */
  async clearCache(): Promise<void> {
    await Promise.all([
      redis.del(CACHE_KEYS.VENDORS_FULL),
      redis.del(CACHE_KEYS.VENDORS_SUMMARY),
      redis.del(CACHE_KEYS.LAST_SYNC),
      redis.del(CACHE_KEYS.SYNC_STATUS),
      redis.del(`${CACHE_KEYS.SYNC_STATUS}:error`),
      redis.del(`${CACHE_KEYS.SYNC_STATUS}:lock`),
      
      // Clear the vendors hash
      redis.del(CACHE_KEYS.VENDOR_BY_ID + 'hash')
    ])
  }
}

// Export singleton instance
export const kvVendorsService = new KVVendorsService()
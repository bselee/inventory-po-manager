import Redis from 'ioredis'
import { logError } from '@/app/lib/errors'

// Redis connection configuration
const REDIS_CONFIG = {
  host: process.env.REDIS_HOST || 'localhost',
  port: parseInt(process.env.REDIS_PORT || '6379'),
  password: process.env.REDIS_PASSWORD,
  db: parseInt(process.env.REDIS_DB || '0'),
  keyPrefix: 'inventory:',
  retryStrategy: (times: number) => {
    const delay = Math.min(times * 50, 2000)
    return delay
  },
  enableOfflineQueue: false,
  maxRetriesPerRequest: 3
}

// Cache TTL configurations (in seconds)
export const CACHE_TTL = {
  FINALE_INVENTORY: 300, // 5 minutes
  FINALE_VENDORS: 3600, // 1 hour
  FINALE_PRODUCTS: 600, // 10 minutes
  INVENTORY_SUMMARY: 60, // 1 minute
  INVENTORY_LIST: 30, // 30 seconds
  DEFAULT: 300 // 5 minutes
} as const

class CacheService {
  private client: Redis | null = null
  private isConnected: boolean = false
  private connectionPromise: Promise<void> | null = null

  constructor() {
    // Only initialize Redis if configured
    if (process.env.REDIS_HOST || process.env.NODE_ENV === 'development') {
      this.connect()
    }
  }

  private async connect(): Promise<void> {
    if (this.connectionPromise) {
      return this.connectionPromise
    }

    this.connectionPromise = new Promise((resolve) => {
      try {
        this.client = new Redis(REDIS_CONFIG)

        this.client.on('connect', () => {
          this.isConnected = true
          resolve()
        })

        this.client.on('error', (error) => {
          logError(error, {
            operation: 'REDIS_CONNECTION',
            metadata: { config: { host: REDIS_CONFIG.host, port: REDIS_CONFIG.port } }
          })
          this.isConnected = false
        })

        this.client.on('close', () => {
          this.isConnected = false
        })
      } catch (error) {
        logError(error, { operation: 'REDIS_INIT' })
        resolve() // Resolve anyway to prevent hanging
      }
    })

    return this.connectionPromise
  }

  async get<T = any>(key: string): Promise<T | null> {
    if (!this.isConnected || !this.client) {
      return null
    }

    try {
      const data = await this.client.get(key)
      if (!data) return null

      return JSON.parse(data) as T
    } catch (error) {
      logError(error, {
        operation: 'CACHE_GET',
        metadata: { key }
      })
      return null
    }
  }

  async set(key: string, value: any, ttl?: number): Promise<boolean> {
    if (!this.isConnected || !this.client) {
      return false
    }

    try {
      const serialized = JSON.stringify(value)
      const ttlSeconds = ttl || CACHE_TTL.DEFAULT

      await this.client.setex(key, ttlSeconds, serialized)
      return true
    } catch (error) {
      logError(error, {
        operation: 'CACHE_SET',
        metadata: { key, ttl }
      })
      return false
    }
  }

  async delete(key: string): Promise<boolean> {
    if (!this.isConnected || !this.client) {
      return false
    }

    try {
      await this.client.del(key)
      return true
    } catch (error) {
      logError(error, {
        operation: 'CACHE_DELETE',
        metadata: { key }
      })
      return false
    }
  }

  async deletePattern(pattern: string): Promise<number> {
    if (!this.isConnected || !this.client) {
      return 0
    }

    try {
      const keys = await this.client.keys(`${REDIS_CONFIG.keyPrefix}${pattern}`)
      if (keys.length === 0) return 0

      // Remove the prefix before deleting
      const keysWithoutPrefix = keys.map(k => k.replace(REDIS_CONFIG.keyPrefix, ''))
      const deleted = await this.client.del(...keysWithoutPrefix)
      return deleted
    } catch (error) {
      logError(error, {
        operation: 'CACHE_DELETE_PATTERN',
        metadata: { pattern }
      })
      return 0
    }
  }

  async flush(): Promise<boolean> {
    if (!this.isConnected || !this.client) {
      return false
    }

    try {
      await this.client.flushdb()
      return true
    } catch (error) {
      logError(error, { operation: 'CACHE_FLUSH' })
      return false
    }
  }

  async disconnect(): Promise<void> {
    if (this.client) {
      await this.client.quit()
      this.client = null
      this.isConnected = false
    }
  }

  isAvailable(): boolean {
    return this.isConnected
  }

  // Helper method to generate cache keys
  static generateKey(...parts: (string | number)[]): string {
    return parts.join(':')
  }
}

// Export singleton instance
export const cache = new CacheService()

// Export cache key generators
export const cacheKeys = {
  finaleInventory: (accountPath: string) => 
    CacheService.generateKey('finale', 'inventory', accountPath),
  
  finaleVendors: (accountPath: string) => 
    CacheService.generateKey('finale', 'vendors', accountPath),
  
  finaleProduct: (accountPath: string, sku: string) => 
    CacheService.generateKey('finale', 'product', accountPath, sku),
  
  inventoryList: (filters: string, page: number, limit: number) => 
    CacheService.generateKey('inventory', 'list', filters, page, limit),
  
  inventorySummary: () => 
    CacheService.generateKey('inventory', 'summary'),
  
  inventoryItem: (id: string) => 
    CacheService.generateKey('inventory', 'item', id)
}

// Cache decorator for functions
export function withCache<T extends (...args: any[]) => Promise<any>>(
  fn: T,
  keyGenerator: (...args: Parameters<T>) => string,
  ttl: number = CACHE_TTL.DEFAULT
): T {
  return (async (...args: Parameters<T>) => {
    const key = keyGenerator(...args)
    
    // Try to get from cache first
    const cached = await cache.get(key)
    if (cached !== null) {
      return cached
    }
    
    // Execute function and cache result
    const result = await fn(...args)
    await cache.set(key, result, ttl)
    
    return result
  }) as T
}
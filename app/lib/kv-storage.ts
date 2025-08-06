/**
 * Unified KV Storage Service
 * Replaces Supabase for all data storage needs
 * Using Redis Cloud backend
 */

import Redis from 'ioredis';

// Redis connection singleton
let redis: Redis | null = null;

function getRedisClient(): Redis {
  if (!redis) {
    const redisUrl = process.env.REDIS_URL;
    if (!redisUrl) {
      throw new Error('REDIS_URL environment variable is required');
    }
    
    redis = new Redis(redisUrl, {
      maxRetriesPerRequest: 3,
      connectTimeout: 60000,
      enableReadyCheck: false,
      lazyConnect: true,
    });

    redis.on('error', (error) => {
      logError('Redis connection error:', error);
    });

    redis.on('connect', () => {
    });
  }
  
  return redis;
}

// Storage keys structure
export const KV_KEYS = {
  // Settings
  SETTINGS: 'app:settings',
  USER_PREFERENCES: (userId: string) => `user:${userId}:preferences`,
  
  // Purchase Orders
  PURCHASE_ORDERS: 'purchase_orders:all',
  PURCHASE_ORDER: (id: string) => `purchase_order:${id}`,
  PO_COUNTER: 'counters:purchase_orders',
  
  // Sync Logs
  SYNC_LOGS: 'sync_logs:all',
  SYNC_LOG: (id: string) => `sync_log:${id}`,
  SYNC_STATUS: 'sync:status',
  
  // Vendors
  VENDORS: 'vendors:all',
  VENDOR: (id: string) => `vendor:${id}`,
  VENDOR_STATS: (id: string) => `vendor:${id}:stats`,
  
  // Authentication
  USER_SESSIONS: (sessionId: string) => `session:${sessionId}`,
  USER_DATA: (userId: string) => `user:${userId}`,
  
  // Cache
  FINALE_CACHE: (key: string) => `finale:cache:${key}`,
  INVENTORY_CACHE: 'inventory:cached_data',
  
  // Historical Data
  HISTORICAL: (type: string, date: string) => `historical:${type}:${date}`,
} as const

// TTL configurations (in seconds)
export const TTL = {
  SESSION: 7 * 24 * 60 * 60,     // 7 days
  CACHE: 15 * 60,                // 15 minutes
  SYNC_LOG: 30 * 24 * 60 * 60,   // 30 days
  HISTORICAL: 365 * 24 * 60 * 60, // 1 year
  STATS: 60 * 60,                // 1 hour
} as const

export interface KVStorageOptions {
  ttl?: number
  nx?: boolean  // Only set if not exists
}

/**
 * Enhanced KV Storage Service
 */
export class KVStorageService {
  // Generic storage methods
  async set<T>(key: string, value: T, options?: KVStorageOptions): Promise<void> {
    const redis = getRedisClient();
    const serialized = JSON.stringify({
      data: value,
      timestamp: Date.now(),
      version: '1.0'
    });
    
    if (options?.nx && options?.ttl) {
      await redis.set(key, serialized, 'EX', options.ttl, 'NX');
    } else if (options?.nx) {
      await redis.set(key, serialized, 'NX');
    } else if (options?.ttl) {
      await redis.set(key, serialized, 'EX', options.ttl);
    } else {
      await redis.set(key, serialized);
    }
  }

  async get<T>(key: string): Promise<T | null> {
    try {
      const redis = getRedisClient();
      const result = await redis.get(key);
      if (!result) return null;
      
      const parsed = JSON.parse(result);
      return parsed.data as T;
    } catch (error) {
      logError(`KV get error for key ${key}:`, error);
      return null;
    }
  }

  async delete(key: string): Promise<void> {
    const redis = getRedisClient();
    await redis.del(key);
  }

  async exists(key: string): Promise<boolean> {
    const redis = getRedisClient();
    return (await redis.exists(key)) === 1;
  }

  async increment(key: string, by: number = 1): Promise<number> {
    const redis = getRedisClient();
    return await redis.incrby(key, by);
  }

  // List operations
  async listAdd<T>(key: string, items: T[]): Promise<void> {
    const current = await this.get<T[]>(key) || []
    const updated = [...current, ...items]
    await this.set(key, updated)
  }

  async listGet<T>(key: string): Promise<T[]> {
    return await this.get<T[]>(key) || []
  }

  async listFilter<T>(key: string, predicate: (item: T) => boolean): Promise<T[]> {
    const items = await this.listGet<T>(key)
    return items.filter(predicate)
  }

  async listUpdate<T extends { id: string }>(key: string, updatedItem: T): Promise<void> {
    const items = await this.listGet<T>(key)
    const index = items.findIndex(item => item.id === updatedItem.id)
    
    if (index >= 0) {
      items[index] = updatedItem
    } else {
      items.push(updatedItem)
    }
    
    await this.set(key, items)
  }

  async listRemove<T extends { id: string }>(key: string, itemId: string): Promise<void> {
    const items = await this.listGet<T>(key)
    const filtered = items.filter(item => item.id !== itemId)
    await this.set(key, filtered)
  }

  // Pattern operations
  async deleteByPattern(pattern: string): Promise<number> {
    const keys = await kv.keys(pattern)
    if (keys.length === 0) return 0
    
    await kv.del(...keys)
    return keys.length
  }

  async getKeys(pattern: string): Promise<string[]> {
    return await kv.keys(pattern)
  }

  // Health check
  async healthCheck(): Promise<{ healthy: boolean; latency: number }> {
    const start = Date.now()
    
    try {
      const testKey = 'health:check'
      await this.set(testKey, { test: true }, { ttl: 60 })
      const result = await this.get(testKey)
      await this.delete(testKey)
      
      return {
        healthy: result !== null,
        latency: Date.now() - start
      }
    } catch (error) {
      return {
        healthy: false,
        latency: Date.now() - start
      }
    }
  }
}

// Export singleton instance
export const kvStorage = new KVStorageService()

// Typed interfaces for common data structures
export interface Settings {
  id: string
  finale_api_key?: string
  finale_api_secret?: string
  finale_account_path?: string
  inventory_data_source?: 'finale-cache' | 'finale-reports' | 'redis-cache'
  sync_frequency_minutes?: number
  last_sync_time?: string
  sync_enabled?: boolean
  email_notifications?: boolean
  created_at: string
  updated_at: string
}

export interface PurchaseOrder {
  id: string
  po_number: string
  vendor: string
  status: 'draft' | 'sent' | 'received' | 'cancelled'
  order_date: string
  total_amount: number
  items: PurchaseOrderItem[]
  finale_order_id?: string
  finale_sync_status?: 'pending' | 'synced' | 'error'
  finale_last_sync?: string
  created_at: string
  updated_at: string
}

export interface PurchaseOrderItem {
  id: string
  sku: string
  product_name: string
  quantity: number
  unit_cost: number
  total_cost: number
}

export interface SyncLog {
  id: string
  sync_type: string
  status: 'running' | 'completed' | 'failed'
  started_at: string
  completed_at?: string
  records_processed: number
  records_created: number
  records_updated: number
  records_failed: number
  error_message?: string
  details?: Record<string, any>
  duration_ms?: number
}

export interface Vendor {
  id: string
  name: string
  contact_name?: string
  email?: string
  phone?: string
  address?: string
  finale_vendor_id?: string
  created_at: string
  updated_at: string
}

export interface UserSession {
  id: string
  userId: string
  expiresAt: string
  createdAt: string
}

export interface UserData {
  id: string
  email?: string
  preferences: Record<string, any>
  created_at: string
  last_login: string
}

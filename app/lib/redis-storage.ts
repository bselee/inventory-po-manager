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
      console.error('Redis connection error:', error);
    });

    redis.on('connect', () => {
      console.log('Connected to Redis Cloud');
    });
  }
  
  return redis;
}

// Storage keys structure
export const KV_KEYS = {
  // Settings
  SETTINGS: 'settings',
  
  // Purchase Orders  
  PURCHASE_ORDER: (id: string) => `purchase-order:${id}`,
  PURCHASE_ORDERS_INDEX: 'purchase-orders:index',
  PURCHASE_ORDERS_BY_VENDOR: (vendorId: string) => `purchase-orders:vendor:${vendorId}`,
  
  // Vendors
  VENDOR: (id: string) => `vendor:${id}`,
  VENDORS_INDEX: 'vendors:index',
  
  // Sync Logs
  SYNC_LOG: (id: string) => `sync-log:${id}`,
  SYNC_LOGS_INDEX: 'sync-logs:index',
  
  // User Data
  USER_DATA: (userId: string) => `user:${userId}`,
  USER_SESSION: (sessionId: string) => `session:${sessionId}`,
  
  // Cache
  CACHE: (key: string) => `cache:${key}`,
} as const;

export interface KVStorageOptions {
  ttl?: number; // TTL in seconds
  nx?: boolean; // Only set if not exists
}

export interface Settings {
  [key: string]: any;
}

export interface PurchaseOrder {
  id: string;
  vendor_id: string;
  status: string;
  total: number;
  created_at: string;
  updated_at: string;
  [key: string]: any;
}

export interface Vendor {
  id: string;
  name: string;
  email?: string;
  created_at: string;
  updated_at: string;
  [key: string]: any;
}

export interface SyncLog {
  id: string;
  operation: string;
  status: string;
  message: string;
  created_at: string;
  [key: string]: any;
}

export interface UserData {
  id: string;
  email: string;
  created_at: string;
  [key: string]: any;
}

export interface UserSession {
  id: string;
  user_id: string;
  expires_at: string;
  [key: string]: any;
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
      console.error(`KV get error for key ${key}:`, error);
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
    const current = await this.get<T[]>(key) || [];
    const updated = [...current, ...items];
    await this.set(key, updated);
  }

  async listGet<T>(key: string): Promise<T[]> {
    return await this.get<T[]>(key) || [];
  }

  async listFilter<T>(key: string, predicate: (item: T) => boolean): Promise<T[]> {
    const items = await this.listGet<T>(key);
    return items.filter(predicate);
  }

  async listRemove<T>(key: string, predicate: (item: T) => boolean): Promise<void> {
    const items = await this.listGet<T>(key);
    const filtered = items.filter(item => !predicate(item));
    await this.set(key, filtered);
  }

  // Pattern operations
  async getByPattern(pattern: string): Promise<string[]> {
    const redis = getRedisClient();
    return await redis.keys(pattern);
  }

  async deleteByPattern(pattern: string): Promise<void> {
    const redis = getRedisClient();
    const keys = await redis.keys(pattern);
    if (keys.length > 0) {
      await redis.del(...keys);
    }
  }

  async getAllKeys(): Promise<string[]> {
    const redis = getRedisClient();
    return await redis.keys('*');
  }

  // Utility methods
  async clear(): Promise<void> {
    const redis = getRedisClient();
    await redis.flushdb();
  }

  async healthCheck(): Promise<{ healthy: boolean; latency?: number; error?: string }> {
    try {
      const redis = getRedisClient();
      const start = Date.now();
      await redis.ping();
      const latency = Date.now() - start;
      
      return { healthy: true, latency };
    } catch (error) {
      return { 
        healthy: false, 
        error: error instanceof Error ? error.message : 'Unknown error' 
      };
    }
  }

  // Settings methods
  async getSettings(): Promise<Settings> {
    return await this.get<Settings>(KV_KEYS.SETTINGS) || {};
  }

  async updateSettings(settings: Partial<Settings>): Promise<void> {
    const current = await this.getSettings();
    const updated = { ...current, ...settings };
    await this.set(KV_KEYS.SETTINGS, updated);
  }

  async getSetting<T>(key: string): Promise<T | null> {
    const settings = await this.getSettings();
    return settings[key] || null;
  }

  async setSetting<T>(key: string, value: T): Promise<void> {
    const settings = await this.getSettings();
    settings[key] = value;
    await this.set(KV_KEYS.SETTINGS, settings);
  }

  // Purchase Order methods
  async savePurchaseOrder(po: PurchaseOrder): Promise<void> {
    await this.set(KV_KEYS.PURCHASE_ORDER(po.id), po);
    
    // Update index
    const index = await this.listGet<string>(KV_KEYS.PURCHASE_ORDERS_INDEX);
    if (!index.includes(po.id)) {
      await this.listAdd(KV_KEYS.PURCHASE_ORDERS_INDEX, [po.id]);
    }
    
    // Update vendor index
    const vendorIndex = await this.listGet<string>(KV_KEYS.PURCHASE_ORDERS_BY_VENDOR(po.vendor_id));
    if (!vendorIndex.includes(po.id)) {
      await this.listAdd(KV_KEYS.PURCHASE_ORDERS_BY_VENDOR(po.vendor_id), [po.id]);
    }
  }

  async getPurchaseOrder(id: string): Promise<PurchaseOrder | null> {
    return await this.get<PurchaseOrder>(KV_KEYS.PURCHASE_ORDER(id));
  }

  async getAllPurchaseOrders(): Promise<PurchaseOrder[]> {
    const ids = await this.listGet<string>(KV_KEYS.PURCHASE_ORDERS_INDEX);
    const promises = ids.map(id => this.getPurchaseOrder(id));
    const results = await Promise.all(promises);
    return results.filter((po): po is PurchaseOrder => po !== null);
  }

  async getPurchaseOrdersByVendor(vendorId: string): Promise<PurchaseOrder[]> {
    const ids = await this.listGet<string>(KV_KEYS.PURCHASE_ORDERS_BY_VENDOR(vendorId));
    const promises = ids.map(id => this.getPurchaseOrder(id));
    const results = await Promise.all(promises);
    return results.filter((po): po is PurchaseOrder => po !== null);
  }

  async deletePurchaseOrder(id: string): Promise<void> {
    const po = await this.getPurchaseOrder(id);
    if (!po) return;

    // Remove from main storage
    await this.delete(KV_KEYS.PURCHASE_ORDER(id));
    
    // Remove from indexes
    await this.listRemove(KV_KEYS.PURCHASE_ORDERS_INDEX, (poId: string) => poId === id);
    await this.listRemove(KV_KEYS.PURCHASE_ORDERS_BY_VENDOR(po.vendor_id), (poId: string) => poId === id);
  }

  // Vendor methods
  async saveVendor(vendor: Vendor): Promise<void> {
    await this.set(KV_KEYS.VENDOR(vendor.id), vendor);
    
    // Update index
    const index = await this.listGet<string>(KV_KEYS.VENDORS_INDEX);
    if (!index.includes(vendor.id)) {
      await this.listAdd(KV_KEYS.VENDORS_INDEX, [vendor.id]);
    }
  }

  async getVendor(id: string): Promise<Vendor | null> {
    return await this.get<Vendor>(KV_KEYS.VENDOR(id));
  }

  async getAllVendors(): Promise<Vendor[]> {
    const ids = await this.listGet<string>(KV_KEYS.VENDORS_INDEX);
    const promises = ids.map(id => this.getVendor(id));
    const results = await Promise.all(promises);
    return results.filter((vendor): vendor is Vendor => vendor !== null);
  }

  async deleteVendor(id: string): Promise<void> {
    await this.delete(KV_KEYS.VENDOR(id));
    await this.listRemove(KV_KEYS.VENDORS_INDEX, (vendorId: string) => vendorId === id);
  }

  // Sync Log methods
  async saveSyncLog(log: SyncLog): Promise<void> {
    await this.set(KV_KEYS.SYNC_LOG(log.id), log, { ttl: 90 * 24 * 60 * 60 }); // 90 days TTL
    
    // Update index
    const index = await this.listGet<string>(KV_KEYS.SYNC_LOGS_INDEX);
    if (!index.includes(log.id)) {
      await this.listAdd(KV_KEYS.SYNC_LOGS_INDEX, [log.id]);
    }
  }

  async getSyncLog(id: string): Promise<SyncLog | null> {
    return await this.get<SyncLog>(KV_KEYS.SYNC_LOG(id));
  }

  async getAllSyncLogs(): Promise<SyncLog[]> {
    const ids = await this.listGet<string>(KV_KEYS.SYNC_LOGS_INDEX);
    const promises = ids.map(id => this.getSyncLog(id));
    const results = await Promise.all(promises);
    return results.filter((log): log is SyncLog => log !== null);
  }

  // User methods
  async saveUserData(user: UserData): Promise<void> {
    await this.set(KV_KEYS.USER_DATA(user.id), user);
  }

  async getUserData(id: string): Promise<UserData | null> {
    return await this.get<UserData>(KV_KEYS.USER_DATA(id));
  }

  async saveUserSession(session: UserSession): Promise<void> {
    const ttl = Math.floor((new Date(session.expires_at).getTime() - Date.now()) / 1000);
    await this.set(KV_KEYS.USER_SESSION(session.id), session, { ttl: Math.max(ttl, 0) });
  }

  async getUserSession(sessionId: string): Promise<UserSession | null> {
    return await this.get<UserSession>(KV_KEYS.USER_SESSION(sessionId));
  }

  async deleteUserSession(sessionId: string): Promise<void> {
    await this.delete(KV_KEYS.USER_SESSION(sessionId));
  }

  // Cache methods
  async cacheSet<T>(key: string, value: T, ttl: number = 300): Promise<void> {
    await this.set(KV_KEYS.CACHE(key), value, { ttl });
  }

  async cacheGet<T>(key: string): Promise<T | null> {
    return await this.get<T>(KV_KEYS.CACHE(key));
  }

  async cacheDelete(key: string): Promise<void> {
    await this.delete(KV_KEYS.CACHE(key));
  }

  async cacheClear(): Promise<void> {
    await this.deleteByPattern('cache:*');
  }
}

// Export singleton instance
export const kvStorage = new KVStorageService();
export default kvStorage;

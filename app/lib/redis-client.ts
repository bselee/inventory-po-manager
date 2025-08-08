import { createClient } from 'redis'
import { logError } from './logger'

// Redis client configuration
const redisUrl = process.env.REDIS_URL

// Log warning but don't crash if Redis is not configured
if (!redisUrl) {
  console.warn('[Redis] REDIS_URL not configured - Redis caching will be disabled')
}

let redisClient: ReturnType<typeof createClient> | null = null
let connectionPromise: Promise<void> | null = null

/**
 * Get or create Redis client
 */
export async function getRedisClient() {
  // Return null if Redis is not configured
  if (!redisUrl) {
    throw new Error('Redis is not configured. Please set REDIS_URL environment variable.')
  }
  
  if (!redisClient) {
    redisClient = createClient({
      url: redisUrl,
      socket: {
        connectTimeout: 10000,
        keepAlive: 30000
      }
    })
    
    redisClient.on('error', (err) => {
      logError('[Redis] Client error:', err)
    })
    
    redisClient.on('connect', () => {
    })
    
    redisClient.on('ready', () => {
    })
  }
  
  // Ensure connection with error handling
  if (!connectionPromise && !redisClient.isOpen) {
    connectionPromise = redisClient.connect()
      .catch((error) => {
        logError('[Redis] Connection failed:', error)
        connectionPromise = null
        redisClient = null
        throw new Error(`Failed to connect to Redis: ${error.message}`)
      })
    
    try {
      await connectionPromise
      connectionPromise = null
    } catch (error) {
      // Re-throw the error after cleanup
      throw error
    }
  }
  
  return redisClient
}

/**
 * Disconnect Redis client (for cleanup)
 */
export async function disconnectRedis() {
  if (redisClient && redisClient.isOpen) {
    await redisClient.disconnect()
    redisClient = null
  }
}

/**
 * Helper functions for common Redis operations
 */
export const redis = {
  async get<T>(key: string): Promise<T | null> {
    try {
      const client = await getRedisClient()
      const value = await client.get(key)
    if (!value) return null
    
    // Try to parse as JSON, but handle if it's already a string
    try {
      return JSON.parse(value)
    } catch {
      // If it fails to parse, it might be a plain string
      return value as T
    }
    } catch (error) {
      // Return null if Redis is not available
      logError('[Redis] Get failed:', error)
      return null
    }
  },
  
  async set(key: string, value: any, ttlSeconds?: number): Promise<void> {
    try {
      const client = await getRedisClient()
      const serialized = typeof value === 'string' ? value : JSON.stringify(value)
      
      if (ttlSeconds) {
        await client.setEx(key, ttlSeconds, serialized)
      } else {
        await client.set(key, serialized)
      }
    } catch (error) {
      logError('[Redis] Set failed:', error)
    }
  },
  
  async setex(key: string, ttlSeconds: number, value: any): Promise<void> {
    try {
      const client = await getRedisClient()
      const serialized = typeof value === 'string' ? value : JSON.stringify(value)
      await client.setEx(key, ttlSeconds, serialized)
    } catch (error) {
      logError('[Redis] Setex failed:', error)
    }
  },
  
  async del(key: string | string[]): Promise<void> {
    try {
      const client = await getRedisClient()
      if (Array.isArray(key)) {
        if (key.length > 0) {
          await client.del(key)
        }
      } else {
        await client.del(key)
      }
    } catch (error) {
      logError('[Redis] Del failed:', error)
    }
  },
  
  async exists(key: string): Promise<boolean> {
    try {
      const client = await getRedisClient()
      const result = await client.exists(key)
      return result === 1
    } catch (error) {
      logError('[Redis] Exists failed:', error)
      return false
    }
  },
  
  async expire(key: string, ttlSeconds: number): Promise<void> {
    try {
      const client = await getRedisClient()
      await client.expire(key, ttlSeconds)
    } catch (error) {
      logError('[Redis] Expire failed:', error)
    }
  },
  
  async ttl(key: string): Promise<number> {
    try {
      const client = await getRedisClient()
      return await client.ttl(key)
    } catch (error) {
      logError('[Redis] TTL failed:', error)
      return -1
    }
  },
  
  async keys(pattern: string): Promise<string[]> {
    try {
      const client = await getRedisClient()
      return await client.keys(pattern)
    } catch (error) {
      logError('[Redis] Keys failed:', error)
      return []
    }
  },
  
  async flushAll(): Promise<void> {
    try {
      const client = await getRedisClient()
      await client.flushAll()
    } catch (error) {
      logError('[Redis] FlushAll failed:', error)
    }
  }
}
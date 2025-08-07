import { createClient } from 'redis'
import { logError } from './logger'

// Redis client configuration
const redisUrl = process.env.REDIS_URL

if (!redisUrl) {
  throw new Error('REDIS_URL environment variable is required. Please set it in your .env file.')
}

let redisClient: ReturnType<typeof createClient> | null = null
let connectionPromise: Promise<void> | null = null

/**
 * Get or create Redis client
 */
export async function getRedisClient() {
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
  },
  
  async set(key: string, value: any, ttlSeconds?: number): Promise<void> {
    const client = await getRedisClient()
    const serialized = typeof value === 'string' ? value : JSON.stringify(value)
    
    if (ttlSeconds) {
      await client.setEx(key, ttlSeconds, serialized)
    } else {
      await client.set(key, serialized)
    }
  },
  
  async setex(key: string, ttlSeconds: number, value: any): Promise<void> {
    const client = await getRedisClient()
    const serialized = typeof value === 'string' ? value : JSON.stringify(value)
    await client.setEx(key, ttlSeconds, serialized)
  },
  
  async del(key: string | string[]): Promise<void> {
    const client = await getRedisClient()
    if (Array.isArray(key)) {
      if (key.length > 0) {
        await client.del(key)
      }
    } else {
      await client.del(key)
    }
  },
  
  async exists(key: string): Promise<boolean> {
    const client = await getRedisClient()
    const result = await client.exists(key)
    return result === 1
  },
  
  async expire(key: string, ttlSeconds: number): Promise<void> {
    const client = await getRedisClient()
    await client.expire(key, ttlSeconds)
  },
  
  async ttl(key: string): Promise<number> {
    const client = await getRedisClient()
    return await client.ttl(key)
  },
  
  async keys(pattern: string): Promise<string[]> {
    const client = await getRedisClient()
    return await client.keys(pattern)
  },
  
  async flushAll(): Promise<void> {
    const client = await getRedisClient()
    await client.flushAll()
  }
}
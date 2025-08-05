import { createClient } from 'redis'

// Redis client configuration
const redisUrl = process.env.REDIS_URL || 'redis://default:hebQ4Koq72dxMZmJVS0iLam7hJslRUPI@redis-17074.c52.us-east-1-4.ec2.redns.redis-cloud.com:17074'

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
      console.error('[Redis] Client error:', err)
    })
    
    redisClient.on('connect', () => {
      console.log('[Redis] Connected successfully')
    })
    
    redisClient.on('ready', () => {
      console.log('[Redis] Client ready')
    })
  }
  
  // Ensure connection
  if (!connectionPromise && !redisClient.isOpen) {
    connectionPromise = redisClient.connect()
    await connectionPromise
    connectionPromise = null
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
    return value ? JSON.parse(value) : null
  },
  
  async set(key: string, value: any, ttlSeconds?: number): Promise<void> {
    const client = await getRedisClient()
    const serialized = JSON.stringify(value)
    
    if (ttlSeconds) {
      await client.setEx(key, ttlSeconds, serialized)
    } else {
      await client.set(key, serialized)
    }
  },
  
  async setex(key: string, ttlSeconds: number, value: any): Promise<void> {
    const client = await getRedisClient()
    await client.setEx(key, ttlSeconds, JSON.stringify(value))
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
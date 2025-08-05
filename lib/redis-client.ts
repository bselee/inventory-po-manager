import { createClient } from 'redis'

// Redis client configuration
const redisUrl = process.env.REDIS_URL || 'redis://localhost:6379'

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
      console.error('Redis client error:', err)
    })

    redisClient.on('connect', () => {
      console.log('Redis client connected')
    })

    redisClient.on('ready', () => {
      console.log('Redis client ready')
    })

    redisClient.on('end', () => {
      console.log('Redis client disconnected')
    })
  }

  if (!redisClient.isOpen) {
    if (!connectionPromise) {
      connectionPromise = redisClient.connect()
    }
    await connectionPromise
    connectionPromise = null
  }

  return redisClient
}

/**
 * Redis wrapper with convenience methods
 */
export const redis = {
  async get<T = any>(key: string): Promise<T | null> {
    try {
      const client = await getRedisClient()
      const value = await client.get(key)
      return value ? JSON.parse(value) : null
    } catch (error) {
      console.error(`Redis GET error for key ${key}:`, error)
      return null
    }
  },

  async set(key: string, value: any, ttlSeconds?: number): Promise<boolean> {
    try {
      const client = await getRedisClient()
      const serialized = JSON.stringify(value)
      
      if (ttlSeconds) {
        await client.setEx(key, ttlSeconds, serialized)
      } else {
        await client.set(key, serialized)
      }
      
      return true
    } catch (error) {
      console.error(`Redis SET error for key ${key}:`, error)
      return false
    }
  },

  async del(key: string): Promise<boolean> {
    try {
      const client = await getRedisClient()
      await client.del(key)
      return true
    } catch (error) {
      console.error(`Redis DEL error for key ${key}:`, error)
      return false
    }
  },

  async exists(key: string): Promise<boolean> {
    try {
      const client = await getRedisClient()
      const exists = await client.exists(key)
      return exists === 1
    } catch (error) {
      console.error(`Redis EXISTS error for key ${key}:`, error)
      return false
    }
  },

  async ping(): Promise<string> {
    try {
      const client = await getRedisClient()
      return await client.ping()
    } catch (error) {
      console.error('Redis PING error:', error)
      throw error
    }
  },

  async keys(pattern: string): Promise<string[]> {
    try {
      const client = await getRedisClient()
      return await client.keys(pattern)
    } catch (error) {
      console.error(`Redis KEYS error for pattern ${pattern}:`, error)
      return []
    }
  },

  async disconnect(): Promise<void> {
    if (redisClient && redisClient.isOpen) {
      await redisClient.disconnect()
      redisClient = null
    }
  }
}

export default redis

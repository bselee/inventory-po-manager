import { cache } from './cache/redis-client'
import { NextRequest } from 'next/server'

interface RateLimitConfig {
  windowMs: number // Time window in milliseconds
  max: number // Maximum requests per window
  keyPrefix?: string // Prefix for rate limit keys
  message?: string // Custom error message
}

interface RateLimitResult {
  allowed: boolean
  remaining: number
  reset: Date
  limit: number
}

const DEFAULT_CONFIG: RateLimitConfig = {
  windowMs: 60 * 1000, // 1 minute
  max: 60, // 60 requests per minute
  keyPrefix: 'ratelimit',
  message: 'Too many requests, please try again later.'
}

export class RateLimiter {
  private config: RateLimitConfig

  constructor(config: Partial<RateLimitConfig> = {}) {
    this.config = { ...DEFAULT_CONFIG, ...config }
  }

  /**
   * Get identifier from request (IP address or user ID)
   */
  private getIdentifier(request: NextRequest): string {
    // Try to get user ID from auth header or cookie
    const authHeader = request.headers.get('authorization')
    const userId = request.headers.get('x-user-id')
    
    if (userId) {
      return `user:${userId}`
    }

    // Fall back to IP address
    const forwardedFor = request.headers.get('x-forwarded-for')
    const realIp = request.headers.get('x-real-ip')
    const ip = forwardedFor?.split(',')[0] || realIp || 'unknown'
    
    return `ip:${ip}`
  }

  /**
   * Generate cache key for rate limiting
   */
  private getKey(identifier: string, endpoint?: string): string {
    const parts = [this.config.keyPrefix, identifier]
    if (endpoint) {
      parts.push(endpoint)
    }
    return parts.join(':')
  }

  /**
   * Check if request is allowed
   */
  async check(request: NextRequest, endpoint?: string): Promise<RateLimitResult> {
    // If Redis is not available, allow all requests
    if (!cache.isAvailable()) {
      return {
        allowed: true,
        remaining: this.config.max,
        reset: new Date(Date.now() + this.config.windowMs),
        limit: this.config.max
      }
    }

    const identifier = this.getIdentifier(request)
    const key = this.getKey(identifier, endpoint)
    const now = Date.now()
    const windowStart = now - this.config.windowMs

    try {
      // Get current count from Redis
      const data = await cache.get<{ count: number; firstRequest: number }>(key)
      
      if (!data || data.firstRequest < windowStart) {
        // New window
        await cache.set(
          key, 
          { count: 1, firstRequest: now },
          Math.ceil(this.config.windowMs / 1000)
        )
        
        return {
          allowed: true,
          remaining: this.config.max - 1,
          reset: new Date(now + this.config.windowMs),
          limit: this.config.max
        }
      }

      // Existing window
      if (data.count >= this.config.max) {
        const reset = new Date(data.firstRequest + this.config.windowMs)
        return {
          allowed: false,
          remaining: 0,
          reset,
          limit: this.config.max
        }
      }

      // Increment count
      await cache.set(
        key,
        { count: data.count + 1, firstRequest: data.firstRequest },
        Math.ceil((data.firstRequest + this.config.windowMs - now) / 1000)
      )

      return {
        allowed: true,
        remaining: this.config.max - data.count - 1,
        reset: new Date(data.firstRequest + this.config.windowMs),
        limit: this.config.max
      }
    } catch (error) {
      logError('Rate limit check error:', error)
      // On error, allow the request
      return {
        allowed: true,
        remaining: this.config.max,
        reset: new Date(now + this.config.windowMs),
        limit: this.config.max
      }
    }
  }

  /**
   * Get current status without incrementing
   */
  async status(request: NextRequest, endpoint?: string): Promise<RateLimitResult> {
    if (!cache.isAvailable()) {
      return {
        allowed: true,
        remaining: this.config.max,
        reset: new Date(Date.now() + this.config.windowMs),
        limit: this.config.max
      }
    }

    const identifier = this.getIdentifier(request)
    const key = this.getKey(identifier, endpoint)
    const now = Date.now()
    const windowStart = now - this.config.windowMs

    try {
      const data = await cache.get<{ count: number; firstRequest: number }>(key)
      
      if (!data || data.firstRequest < windowStart) {
        return {
          allowed: true,
          remaining: this.config.max,
          reset: new Date(now + this.config.windowMs),
          limit: this.config.max
        }
      }

      return {
        allowed: data.count < this.config.max,
        remaining: Math.max(0, this.config.max - data.count),
        reset: new Date(data.firstRequest + this.config.windowMs),
        limit: this.config.max
      }
    } catch (error) {
      return {
        allowed: true,
        remaining: this.config.max,
        reset: new Date(now + this.config.windowMs),
        limit: this.config.max
      }
    }
  }
}

// Pre-configured rate limiters for different use cases
export const rateLimiters = {
  // General API rate limit
  api: new RateLimiter({
    windowMs: 60 * 1000, // 1 minute
    max: 100, // 100 requests per minute
    keyPrefix: 'rl:api'
  }),

  // Auth endpoints (stricter)
  auth: new RateLimiter({
    windowMs: 15 * 60 * 1000, // 15 minutes
    max: 5, // 5 attempts per 15 minutes
    keyPrefix: 'rl:auth'
  }),

  // Sync operations (very limited)
  sync: new RateLimiter({
    windowMs: 60 * 60 * 1000, // 1 hour
    max: 10, // 10 syncs per hour
    keyPrefix: 'rl:sync'
  }),

  // Search operations
  search: new RateLimiter({
    windowMs: 60 * 1000, // 1 minute
    max: 30, // 30 searches per minute
    keyPrefix: 'rl:search'
  })
}

// Middleware helper for rate limiting
export async function withRateLimit(
  request: NextRequest,
  limiter: RateLimiter = rateLimiters.api,
  endpoint?: string
): Promise<RateLimitResult> {
  const result = await limiter.check(request, endpoint)
  
  // Add rate limit headers to help clients
  const headers = new Headers()
  headers.set('X-RateLimit-Limit', result.limit.toString())
  headers.set('X-RateLimit-Remaining', result.remaining.toString())
  headers.set('X-RateLimit-Reset', result.reset.toISOString())
  
  return result
}
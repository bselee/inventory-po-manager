/**
 * Rate Limiter for Finale API
 * Ensures we don't overwhelm Finale's API with too many requests
 */

interface RateLimiterConfig {
  requestsPerSecond?: number
  minDelayMs?: number
  maxRetries?: number
  retryDelayMs?: number
  enableLogging?: boolean
}

interface QueuedRequest<T> {
  execute: () => Promise<T>
  resolve: (value: T) => void
  reject: (error: any) => void
  retries: number
  addedAt: number
}

export class FinaleRateLimiter {
  private queue: QueuedRequest<any>[] = []
  private processing = false
  private lastRequestTime = 0
  private requestCount = 0
  private windowStart = Date.now()
  
  // Configuration
  private requestsPerSecond: number
  private minDelayMs: number
  private maxRetries: number
  private retryDelayMs: number
  private enableLogging: boolean
  
  constructor(config: RateLimiterConfig = {}) {
    this.requestsPerSecond = config.requestsPerSecond || 2
    this.minDelayMs = config.minDelayMs || 500
    this.maxRetries = config.maxRetries || 3
    this.retryDelayMs = config.retryDelayMs || 1000
    this.enableLogging = config.enableLogging || true
  }
  
  /**
   * Execute a request with rate limiting
   */
  async executeRequest<T>(fn: () => Promise<T>): Promise<T> {
    return new Promise((resolve, reject) => {
      this.queue.push({
        execute: fn,
        resolve,
        reject,
        retries: 0,
        addedAt: Date.now()
      })
      
      this.processQueue()
    })
  }
  
  /**
   * Process queued requests with rate limiting
   */
  private async processQueue() {
    if (this.processing || this.queue.length === 0) return
    
    this.processing = true
    
    while (this.queue.length > 0) {
      // Check rate limit window
      const now = Date.now()
      const windowElapsed = now - this.windowStart
      
      // Reset window if more than 1 second has passed
      if (windowElapsed >= 1000) {
        this.windowStart = now
        this.requestCount = 0
      }
      
      // Check if we've exceeded rate limit
      if (this.requestCount >= this.requestsPerSecond) {
        const waitTime = 1000 - windowElapsed
        if (waitTime > 0) {
          if (this.enableLogging) {
          }
          await this.delay(waitTime)
          continue
        }
      }
      
      // Ensure minimum delay between requests
      const timeSinceLastRequest = now - this.lastRequestTime
      if (timeSinceLastRequest < this.minDelayMs && this.lastRequestTime > 0) {
        const waitTime = this.minDelayMs - timeSinceLastRequest
        if (this.enableLogging) {
        }
        await this.delay(waitTime)
      }
      
      // Process next request
      const request = this.queue.shift()
      if (!request) continue
      
      try {
        this.lastRequestTime = Date.now()
        this.requestCount++
        
        if (this.enableLogging) {
        }
        
        const result = await request.execute()
        request.resolve(result)
        
      } catch (error) {
        // Handle rate limit errors with retry
        if (this.isRateLimitError(error) && request.retries < this.maxRetries) {
          request.retries++
          const backoffDelay = this.retryDelayMs * Math.pow(2, request.retries - 1)
          
          if (this.enableLogging) {
          }
          
          // Put request back in queue with exponential backoff
          setTimeout(() => {
            this.queue.unshift(request)
            this.processQueue()
          }, backoffDelay)
          
        } else {
          // Non-retriable error or max retries reached
          if (this.enableLogging) {
            logError(`[Rate Limiter] Request failed after ${request.retries} retries:`, error)
          }
          request.reject(error)
        }
      }
    }
    
    this.processing = false
  }
  
  /**
   * Check if error is a rate limit error
   */
  private isRateLimitError(error: any): boolean {
    if (error instanceof Response) {
      return error.status === 429
    }
    
    if (error?.response?.status === 429) {
      return true
    }
    
    // Check for common rate limit error messages
    const errorMessage = error?.message?.toLowerCase() || ''
    return errorMessage.includes('rate limit') || 
           errorMessage.includes('too many requests') ||
           errorMessage.includes('429')
  }
  
  /**
   * Delay helper
   */
  private delay(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms))
  }
  
  /**
   * Get current queue status
   */
  getStatus() {
    return {
      queueLength: this.queue.length,
      processing: this.processing,
      requestCount: this.requestCount,
      windowStart: this.windowStart,
      config: {
        requestsPerSecond: this.requestsPerSecond,
        minDelayMs: this.minDelayMs,
        maxRetries: this.maxRetries
      }
    }
  }
  
  /**
   * Clear the queue
   */
  clearQueue() {
    while (this.queue.length > 0) {
      const request = this.queue.shift()
      if (request) {
        request.reject(new Error('Queue cleared'))
      }
    }
  }
  
  /**
   * Update configuration
   */
  updateConfig(config: Partial<RateLimiterConfig>) {
    if (config.requestsPerSecond !== undefined) {
      this.requestsPerSecond = config.requestsPerSecond
    }
    if (config.minDelayMs !== undefined) {
      this.minDelayMs = config.minDelayMs
    }
    if (config.maxRetries !== undefined) {
      this.maxRetries = config.maxRetries
    }
    if (config.retryDelayMs !== undefined) {
      this.retryDelayMs = config.retryDelayMs
    }
    if (config.enableLogging !== undefined) {
      this.enableLogging = config.enableLogging
    }
  }
}

// Create singleton instance
export const finaleRateLimiter = new FinaleRateLimiter({
  requestsPerSecond: 2,
  minDelayMs: 500,
  maxRetries: 3,
  retryDelayMs: 1000,
  enableLogging: true
})

// Export helper function for easy use
export async function rateLimitedFetch<T = any>(
  url: string, 
  options?: RequestInit
): Promise<Response> {
  return finaleRateLimiter.executeRequest(async () => {
    const response = await fetch(url, options)
    
    // Check for rate limit response
    if (response.status === 429) {
      const retryAfter = response.headers.get('Retry-After')
      const error: any = new Error(`Rate limit exceeded${retryAfter ? `, retry after ${retryAfter}s` : ''}`)
      error.response = response
      throw error
    }
    
    return response
  })
}
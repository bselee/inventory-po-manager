/**
 * Retry utility for handling transient failures
 */

export interface RetryOptions {
  maxAttempts?: number
  initialDelay?: number
  maxDelay?: number
  backoffMultiplier?: number
  shouldRetry?: (error: any) => boolean
  onRetry?: (error: any, attempt: number) => void
}

const DEFAULT_OPTIONS: Required<RetryOptions> = {
  maxAttempts: 3,
  initialDelay: 1000, // 1 second
  maxDelay: 10000, // 10 seconds
  backoffMultiplier: 2,
  shouldRetry: (error) => {
    // Retry on network errors or 5xx status codes
    if (error.code === 'ECONNREFUSED' || error.code === 'ETIMEDOUT' || error.code === 'ENOTFOUND') {
      return true
    }
    if (error.response?.status >= 500 && error.response?.status < 600) {
      return true
    }
    // Retry on Redis connection errors
    if (error.message?.includes('Redis') || error.message?.includes('ECONNRESET')) {
      return true
    }
    return false
  },
  onRetry: (error, attempt) => {
  }
}

/**
 * Execute a function with exponential backoff retry
 */
export async function withRetry<T>(
  fn: () => Promise<T>,
  options: RetryOptions = {}
): Promise<T> {
  const opts = { ...DEFAULT_OPTIONS, ...options }
  let lastError: any
  
  for (let attempt = 1; attempt <= opts.maxAttempts; attempt++) {
    try {
      return await fn()
    } catch (error) {
      lastError = error
      
      // Check if we should retry
      if (attempt === opts.maxAttempts || !opts.shouldRetry(error)) {
        throw error
      }
      
      // Calculate delay with exponential backoff
      const delay = Math.min(
        opts.initialDelay * Math.pow(opts.backoffMultiplier, attempt - 1),
        opts.maxDelay
      )
      
      // Call retry callback
      opts.onRetry(error, attempt)
      
      // Wait before retrying
      await new Promise(resolve => setTimeout(resolve, delay))
    }
  }
  
  throw lastError
}

/**
 * Retry specifically for Redis operations
 */
export async function withRedisRetry<T>(
  operation: () => Promise<T>,
  operationName: string
): Promise<T> {
  return withRetry(operation, {
    maxAttempts: 3,
    initialDelay: 500,
    shouldRetry: (error) => {
      // Always retry Redis connection errors
      if (error.message?.includes('Redis') || 
          error.message?.includes('ECONNRESET') ||
          error.message?.includes('ETIMEDOUT')) {
        return true
      }
      return false
    },
    onRetry: (error, attempt) => {
    }
  })
}

/**
 * Retry specifically for API calls
 */
export async function withApiRetry<T>(
  apiCall: () => Promise<T>,
  endpoint: string
): Promise<T> {
  return withRetry(apiCall, {
    maxAttempts: 3,
    initialDelay: 1000,
    shouldRetry: (error) => {
      // Don't retry client errors (4xx)
      if (error.response?.status >= 400 && error.response?.status < 500) {
        return false
      }
      // Retry network and server errors
      return true
    },
    onRetry: (error, attempt) => {
    }
  })
}
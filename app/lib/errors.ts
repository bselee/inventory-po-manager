/**
 * Unified error handling system
 * Provides consistent error types and handling across the application
 */

// =============================================================================
// ERROR CLASSES
// =============================================================================

/**
 * Base application error
 */
export class AppError extends Error {
  constructor(
    message: string,
    public statusCode: number = 500,
    public code: string = 'INTERNAL_ERROR',
    public details?: any
  ) {
    super(message)
    this.name = 'AppError'
    Error.captureStackTrace(this, this.constructor)
  }

  toJSON() {
    return {
      name: this.name,
      message: this.message,
      code: this.code,
      statusCode: this.statusCode,
      details: this.details
    }
  }
}

/**
 * Validation error for invalid input
 */
export class ValidationError extends AppError {
  constructor(message: string, details?: any) {
    super(message, 400, 'VALIDATION_ERROR', details)
    this.name = 'ValidationError'
  }
}

/**
 * Not found error
 */
export class NotFoundError extends AppError {
  constructor(resource: string, id?: string) {
    const message = id 
      ? `${resource} with id ${id} not found`
      : `${resource} not found`
    super(message, 404, 'NOT_FOUND')
    this.name = 'NotFoundError'
  }
}

/**
 * Authentication error
 */
export class AuthenticationError extends AppError {
  constructor(message: string = 'Authentication required') {
    super(message, 401, 'UNAUTHORIZED')
    this.name = 'AuthenticationError'
  }
}

/**
 * Authorization error
 */
export class AuthorizationError extends AppError {
  constructor(message: string = 'Insufficient permissions') {
    super(message, 403, 'FORBIDDEN')
    this.name = 'AuthorizationError'
  }
}

/**
 * Conflict error for duplicate resources
 */
export class ConflictError extends AppError {
  constructor(message: string, details?: any) {
    super(message, 409, 'CONFLICT', details)
    this.name = 'ConflictError'
  }
}

/**
 * External service error
 */
export class ExternalServiceError extends AppError {
  constructor(service: string, message: string, originalError?: any) {
    super(`${service} error: ${message}`, 503, 'EXTERNAL_SERVICE_ERROR', {
      service,
      originalError
    })
    this.name = 'ExternalServiceError'
  }
}

/**
 * Database error
 */
export class DatabaseError extends AppError {
  constructor(operation: string, message: string, originalError?: any) {
    super(`Database ${operation} failed: ${message}`, 500, 'DATABASE_ERROR', {
      operation,
      originalError
    })
    this.name = 'DatabaseError'
  }
}

/**
 * Sync error
 */
export class SyncError extends AppError {
  constructor(
    syncType: string, 
    message: string, 
    itemsFailed?: number,
    originalError?: any
  ) {
    super(`Sync ${syncType} failed: ${message}`, 500, 'SYNC_ERROR', {
      syncType,
      itemsFailed,
      originalError
    })
    this.name = 'SyncError'
  }
}

// =============================================================================
// ERROR HANDLERS
// =============================================================================

/**
 * Global error handler for API routes
 */
export function handleApiError(error: unknown): {
  error: string
  code?: string
  statusCode: number
  details?: any
} {
  // Log error
  console.error('API Error:', error)

  // Handle known error types
  if (error instanceof AppError) {
    return {
      error: error.message,
      code: error.code,
      statusCode: error.statusCode,
      details: error.details
    }
  }

  // Handle Zod validation errors
  if (error && typeof error === 'object' && 'name' in error && error.name === 'ZodError') {
    return {
      error: 'Validation failed',
      code: 'VALIDATION_ERROR',
      statusCode: 400,
      details: (error as any).errors
    }
  }

  // Handle database errors
  if (error && typeof error === 'object' && 'code' in error) {
    const dbError = error as any
    
    // Unique constraint violation
    if (dbError.code === '23505') {
      return {
        error: 'Resource already exists',
        code: 'DUPLICATE_RESOURCE',
        statusCode: 409,
        details: dbError.detail
      }
    }
    
    // Foreign key violation
    if (dbError.code === '23503') {
      return {
        error: 'Referenced resource not found',
        code: 'INVALID_REFERENCE',
        statusCode: 400,
        details: dbError.detail
      }
    }
  }

  // Handle generic errors
  if (error instanceof Error) {
    return {
      error: error.message,
      statusCode: 500
    }
  }

  // Unknown error
  return {
    error: 'An unexpected error occurred',
    code: 'UNKNOWN_ERROR',
    statusCode: 500
  }
}

/**
 * Client-side error handler
 */
export function handleClientError(error: unknown): string {
  if (error instanceof AppError) {
    return error.message
  }
  
  if (error instanceof Error) {
    return error.message
  }
  
  if (typeof error === 'string') {
    return error
  }
  
  return 'An unexpected error occurred'
}

// =============================================================================
// ERROR UTILITIES
// =============================================================================

/**
 * Check if error is a network error
 */
export function isNetworkError(error: unknown): boolean {
  return error instanceof Error && (
    error.message.includes('fetch') ||
    error.message.includes('network') ||
    error.message.includes('ECONNREFUSED')
  )
}

/**
 * Check if error is a timeout error
 */
export function isTimeoutError(error: unknown): boolean {
  return error instanceof Error && (
    error.message.includes('timeout') ||
    error.message.includes('ETIMEDOUT')
  )
}

/**
 * Create error from API response
 */
export async function createErrorFromResponse(response: Response): Promise<AppError> {
  let errorData: any = {}
  
  try {
    errorData = await response.json()
  } catch {
    // Response might not be JSON
  }
  
  const message = errorData.error || errorData.message || response.statusText
  const code = errorData.code || 'API_ERROR'
  const details = errorData.details
  
  return new AppError(message, response.status, code, details)
}

/**
 * Retry with exponential backoff
 */
export async function retryWithBackoff<T>(
  fn: () => Promise<T>,
  options: {
    maxRetries?: number
    initialDelay?: number
    maxDelay?: number
    shouldRetry?: (error: unknown, attempt: number) => boolean
  } = {}
): Promise<T> {
  const {
    maxRetries = 3,
    initialDelay = 1000,
    maxDelay = 10000,
    shouldRetry = (error) => isNetworkError(error) || isTimeoutError(error)
  } = options

  let lastError: unknown
  
  for (let attempt = 0; attempt <= maxRetries; attempt++) {
    try {
      return await fn()
    } catch (error) {
      lastError = error
      
      if (attempt === maxRetries || !shouldRetry(error, attempt)) {
        throw error
      }
      
      const delay = Math.min(initialDelay * Math.pow(2, attempt), maxDelay)
      await new Promise(resolve => setTimeout(resolve, delay))
    }
  }
  
  throw lastError
}

// =============================================================================
// ERROR LOGGING
// =============================================================================

/**
 * Log error with context
 */
export function logError(
  error: unknown,
  context: {
    operation?: string
    userId?: string
    metadata?: Record<string, any>
  } = {}
) {
  const errorInfo = {
    timestamp: new Date().toISOString(),
    ...context,
    error: error instanceof Error ? {
      name: error.name,
      message: error.message,
      stack: error.stack
    } : error
  }
  
  console.error('Application Error:', JSON.stringify(errorInfo, null, 2))
  
  // In production, send to error tracking service
  // e.g., Sentry, LogRocket, etc.
}
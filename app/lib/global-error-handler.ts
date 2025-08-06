/**
 * Global Error Handler for unhandled promise rejections and errors
 * Provides centralized error handling and logging
 */

import { NextResponse } from 'next/server'
import { logError } from './monitoring'

export interface ErrorDetails {
  message: string
  code?: string
  statusCode?: number
  stack?: string
  context?: Record<string, any>
}

class GlobalErrorHandler {
  private isDevelopment = process.env.NODE_ENV === 'development'
  private errorQueue: ErrorDetails[] = []
  private maxQueueSize = 100

  constructor() {
    this.setupGlobalHandlers()
  }

  /**
   * Setup global handlers for unhandled errors
   */
  private setupGlobalHandlers() {
    // Handle unhandled promise rejections
    if (typeof process !== 'undefined') {
      process.on('unhandledRejection', (reason: any, promise: Promise<any>) => {
        logError('Unhandled Promise Rejection:', reason)
        this.handleError(new Error(reason?.message || 'Unhandled promise rejection'), {
          context: { promise: promise.toString(), reason }
        })
      })

      process.on('uncaughtException', (error: Error) => {
        logError('Uncaught Exception:', error)
        this.handleError(error, {
          context: { fatal: true }
        })
        // Give time to log before exit
        setTimeout(() => process.exit(1), 1000)
      })
    }

    // Browser error handling
    if (typeof window !== 'undefined') {
      window.addEventListener('unhandledrejection', (event) => {
        logError('Unhandled Promise Rejection:', event.reason)
        this.handleError(new Error(event.reason?.message || 'Unhandled promise rejection'), {
          context: { reason: event.reason }
        })
        event.preventDefault()
      })

      window.addEventListener('error', (event) => {
        logError('Global Error:', event.error)
        this.handleError(event.error || new Error(event.message), {
          context: { 
            filename: event.filename,
            lineno: event.lineno,
            colno: event.colno
          }
        })
      })
    }
  }

  /**
   * Handle an error with logging and optional reporting
   */
  public handleError(error: Error | unknown, options?: Partial<ErrorDetails>) {
    const errorDetails = this.formatError(error, options)
    
    // Log to console
    if (this.isDevelopment) {
      logError('Error Details:', errorDetails)
    } else {
      // In production, log without stack trace
      logError(`Error: ${errorDetails.message} (Code: ${errorDetails.code})`)
    }

    // Add to error queue for potential reporting
    this.addToQueue(errorDetails)

    // Send to monitoring service if configured
    this.reportToMonitoring(errorDetails)

    return errorDetails
  }

  /**
   * Format error into standardized structure
   */
  private formatError(error: Error | unknown, options?: Partial<ErrorDetails>): ErrorDetails {
    if (error instanceof Error) {
      return {
        message: error.message,
        code: options?.code || 'UNKNOWN_ERROR',
        statusCode: options?.statusCode || 500,
        stack: this.isDevelopment ? error.stack : undefined,
        context: options?.context
      }
    }

    return {
      message: String(error),
      code: options?.code || 'UNKNOWN_ERROR',
      statusCode: options?.statusCode || 500,
      context: options?.context
    }
  }

  /**
   * Add error to queue for batch reporting
   */
  private addToQueue(error: ErrorDetails) {
    this.errorQueue.push(error)
    
    // Maintain queue size limit
    if (this.errorQueue.length > this.maxQueueSize) {
      this.errorQueue.shift()
    }
  }

  /**
   * Report error to monitoring service (Sentry, DataDog, etc.)
   */
  private reportToMonitoring(error: ErrorDetails) {
    // Use unified monitoring interface
    logError(new Error(error.message), {
      code: error.code,
      statusCode: error.statusCode,
      context: error.context
    })
  }

  /**
   * Get recent errors from queue
   */
  public getRecentErrors(limit: number = 10): ErrorDetails[] {
    return this.errorQueue.slice(-limit)
  }

  /**
   * Clear error queue
   */
  public clearErrorQueue() {
    this.errorQueue = []
  }

  /**
   * Create HTTP error response
   */
  public createErrorResponse(error: Error | unknown, statusCode: number = 500): NextResponse {
    const errorDetails = this.handleError(error, { statusCode })
    
    return NextResponse.json(
      {
        error: errorDetails.message,
        code: errorDetails.code,
        ...(this.isDevelopment && { stack: errorDetails.stack })
      },
      { status: statusCode }
    )
  }
}

// Export singleton instance
export const globalErrorHandler = new GlobalErrorHandler()

// Export convenience functions
export const handleError = (error: Error | unknown, options?: Partial<ErrorDetails>) => 
  globalErrorHandler.handleError(error, options)

export const createErrorResponse = (error: Error | unknown, statusCode?: number) =>
  globalErrorHandler.createErrorResponse(error, statusCode)

// Async error wrapper for API routes
export function asyncHandler<T extends (...args: any[]) => Promise<any>>(fn: T): T {
  return (async (...args: Parameters<T>) => {
    try {
      return await fn(...args)
    } catch (error) {
      logError('Async Handler Error:', error)
      return globalErrorHandler.createErrorResponse(error)
    }
  }) as T
}

// Promise wrapper with error handling
export async function safePromise<T>(
  promise: Promise<T>,
  defaultValue?: T
): Promise<[T | undefined, Error | undefined]> {
  try {
    const result = await promise
    return [result, undefined]
  } catch (error) {
    handleError(error)
    return [defaultValue, error as Error]
  }
}
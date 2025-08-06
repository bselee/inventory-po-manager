/**
 * Unified Monitoring Interface
 * Provides a single interface for application monitoring
 * Can use either Sentry, DataDog, or both
 */

import { monitoring as sentryMonitoring } from './sentry'
import { datadog as datadogMonitoring } from './datadog'

export type MonitoringProvider = 'sentry' | 'datadog' | 'both'

export interface MonitoringContext {
  userId?: string
  sessionId?: string
  requestId?: string
  [key: string]: any
}

export class UnifiedMonitoring {
  private static instance: UnifiedMonitoring
  private provider: MonitoringProvider
  private context: MonitoringContext = {}

  private constructor() {
    // Determine which provider to use based on environment variables
    if (process.env.SENTRY_DSN && process.env.DATADOG_API_KEY) {
      this.provider = 'both'
    } else if (process.env.SENTRY_DSN) {
      this.provider = 'sentry'
    } else if (process.env.DATADOG_API_KEY) {
      this.provider = 'datadog'
    } else {
      this.provider = 'sentry' // Default to Sentry
    }
  }

  public static getInstance(): UnifiedMonitoring {
    if (!UnifiedMonitoring.instance) {
      UnifiedMonitoring.instance = new UnifiedMonitoring()
    }
    return UnifiedMonitoring.instance
  }

  /**
   * Initialize monitoring services
   */
  public async init() {
    if (this.provider === 'sentry' || this.provider === 'both') {
      sentryMonitoring.init()
    }

    if (this.provider === 'datadog' || this.provider === 'both') {
      await datadogMonitoring.init()
    }
  }

  /**
   * Set global context for all monitoring
   */
  public setContext(context: MonitoringContext) {
    this.context = { ...this.context, ...context }
    
    // Set user in Sentry if available
    if (context.userId) {
      sentryMonitoring.setUser({
        id: context.userId,
        email: context.userEmail,
        role: context.userRole
      })
    }
  }

  /**
   * Clear context
   */
  public clearContext() {
    this.context = {}
    sentryMonitoring.setUser(null)
  }

  /**
   * Log an error with full context
   */
  public error(error: Error | unknown, additionalContext?: Record<string, any>) {
    const fullContext = { ...this.context, ...additionalContext }

    if (this.provider === 'sentry' || this.provider === 'both') {
      sentryMonitoring.captureException(error, {
        tags: fullContext,
        level: 'error'
      })
    }

    if (this.provider === 'datadog' || this.provider === 'both') {
      datadogMonitoring.logError(error, fullContext)
    }
  }

  /**
   * Log a warning
   */
  public warn(message: string, context?: Record<string, any>) {
    const fullContext = { ...this.context, ...context }

    if (this.provider === 'sentry' || this.provider === 'both') {
      sentryMonitoring.captureMessage(message, 'warning')
    }

    if (this.provider === 'datadog' || this.provider === 'both') {
      datadogMonitoring.log('warn', message, fullContext)
    }
  }

  /**
   * Log info message
   */
  public info(message: string, context?: Record<string, any>) {
    const fullContext = { ...this.context, ...context }

    if (this.provider === 'sentry' || this.provider === 'both') {
      sentryMonitoring.captureMessage(message, 'info')
    }

    if (this.provider === 'datadog' || this.provider === 'both') {
      datadogMonitoring.log('info', message, fullContext)
    }
  }

  /**
   * Track a custom metric
   */
  public metric(name: string, value: number, tags?: Record<string, string>) {
    if (this.provider === 'sentry' || this.provider === 'both') {
      sentryMonitoring.captureMetric(name, value)
    }

    if (this.provider === 'datadog' || this.provider === 'both') {
      datadogMonitoring.metric(name, value, 'gauge', { tags })
    }
  }

  /**
   * Increment a counter
   */
  public increment(name: string, value: number = 1, tags?: Record<string, string>) {
    if (this.provider === 'datadog' || this.provider === 'both') {
      datadogMonitoring.increment(name, value, tags)
    }

    if (this.provider === 'sentry' || this.provider === 'both') {
      sentryMonitoring.captureMetric(`${name}.count`, value)
    }
  }

  /**
   * Track timing of an operation
   */
  public async time<T>(
    operation: string,
    fn: () => Promise<T>,
    tags?: Record<string, string>
  ): Promise<T> {
    const startTime = Date.now()
    
    try {
      const result = await fn()
      const duration = Date.now() - startTime
      
      this.metric(`${operation}.duration`, duration, tags)
      this.increment(`${operation}.success`, 1, tags)
      
      return result
    } catch (error) {
      const duration = Date.now() - startTime
      
      this.metric(`${operation}.duration`, duration, tags)
      this.increment(`${operation}.error`, 1, tags)
      this.error(error, { operation, duration, tags })
      
      throw error
    }
  }

  /**
   * Create a breadcrumb for debugging
   */
  public breadcrumb(message: string, category: string, data?: Record<string, any>) {
    if (this.provider === 'sentry' || this.provider === 'both') {
      sentryMonitoring.addBreadcrumb({
        message,
        category,
        level: 'info',
        data
      })
    }

    if (this.provider === 'datadog' || this.provider === 'both') {
      datadogMonitoring.log('debug', message, { category, ...data })
    }
  }

  /**
   * Track API performance
   */
  public trackApiCall(
    endpoint: string,
    method: string,
    statusCode: number,
    duration: number
  ) {
    const tags = {
      endpoint,
      method,
      status: statusCode.toString(),
      statusGroup: `${Math.floor(statusCode / 100)}xx`
    }

    this.metric('api.request.duration', duration, tags)
    this.increment('api.request.count', 1, tags)

    if (statusCode >= 400) {
      this.increment('api.request.error', 1, tags)
    }
  }

  /**
   * Track database query performance
   */
  public trackDbQuery(
    table: string,
    operation: string,
    duration: number,
    success: boolean
  ) {
    const tags = {
      table,
      operation,
      success: success.toString()
    }

    this.metric('db.query.duration', duration, tags)
    this.increment('db.query.count', 1, tags)

    if (!success) {
      this.increment('db.query.error', 1, tags)
    }
  }

  /**
   * Track sync operations
   */
  public trackSync(
    syncType: string,
    itemsProcessed: number,
    itemsFailed: number,
    duration: number
  ) {
    const tags = { syncType }

    this.metric('sync.duration', duration, tags)
    this.metric('sync.items.processed', itemsProcessed, tags)
    this.metric('sync.items.failed', itemsFailed, tags)
    this.increment('sync.execution', 1, tags)

    if (itemsFailed > 0) {
      this.increment('sync.with_errors', 1, tags)
    }
  }
}

// Export singleton instance
export const monitor = UnifiedMonitoring.getInstance()

// Export convenience functions
export const initMonitoring = () => monitor.init()
export const setMonitoringContext = (context: MonitoringContext) => monitor.setContext(context)
export const clearMonitoringContext = () => monitor.clearContext()
export const logError = (error: Error | unknown, context?: Record<string, any>) => monitor.error(error, context)
export const logWarn = (message: string, context?: Record<string, any>) => monitor.warn(message, context)
export const logInfo = (message: string, context?: Record<string, any>) => monitor.info(message, context)
export const trackMetric = (name: string, value: number, tags?: Record<string, string>) => monitor.metric(name, value, tags)
export const incrementCounter = (name: string, value?: number, tags?: Record<string, string>) => monitor.increment(name, value, tags)
export const timeOperation = <T>(operation: string, fn: () => Promise<T>, tags?: Record<string, string>) => monitor.time(operation, fn, tags)
export const addBreadcrumb = (message: string, category: string, data?: Record<string, any>) => monitor.breadcrumb(message, category, data)
export const trackApiCall = (endpoint: string, method: string, statusCode: number, duration: number) => monitor.trackApiCall(endpoint, method, statusCode, duration)
export const trackDbQuery = (table: string, operation: string, duration: number, success: boolean) => monitor.trackDbQuery(table, operation, duration, success)
export const trackSync = (syncType: string, itemsProcessed: number, itemsFailed: number, duration: number) => monitor.trackSync(syncType, itemsProcessed, itemsFailed, duration)
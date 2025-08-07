/**
 * Sentry Application Monitoring Configuration
 * Provides error tracking and performance monitoring (optional)
 */

// Stub implementation when Sentry is not installed
export interface MonitoringConfig {
  dsn?: string
  environment: string
  enabled: boolean
  tracesSampleRate: number
  profilesSampleRate: number
}

export class SentryMonitoring {
  private static instance: SentryMonitoring
  private initialized = false
  private config: MonitoringConfig

  private constructor() {
    this.config = {
      dsn: process.env.NEXT_PUBLIC_SENTRY_DSN || process.env.SENTRY_DSN,
      environment: process.env.NODE_ENV || 'development',
      enabled: false, // Disabled since Sentry is not installed
      tracesSampleRate: 0,
      profilesSampleRate: 0
    }
  }

  public static getInstance(): SentryMonitoring {
    if (!SentryMonitoring.instance) {
      SentryMonitoring.instance = new SentryMonitoring()
    }
    return SentryMonitoring.instance
  }

  public init() {
    // No-op when Sentry is not installed
  }

  public captureException(error: Error | unknown, context?: any) {
    console.error('[Error]:', error)
  }

  public captureMessage(message: string, level: string = 'info') {
    if (level === 'error') {
      console.error(message)
    } else {
    }
  }

  public setUser(user: { id: string; email?: string; role?: string } | null) {
    // No-op
  }

  public addBreadcrumb(breadcrumb: any) {
    // No-op
  }

  public startTransaction(name: string, op: string) {
    return null
  }

  public captureMetric(name: string, value: number, unit: string = 'none') {
    // No-op
  }

  public async withMonitoring<T>(
    operation: string,
    fn: () => Promise<T>
  ): Promise<T> {
    try {
      return await fn()
    } catch (error) {
      console.error(`[${operation}] Error:`, error)
      throw error
    }
  }
}

// Export singleton instance
export const monitoring = SentryMonitoring.getInstance()

// Helper functions for easy usage
export const captureException = (error: Error | unknown, context?: any) =>
  monitoring.captureException(error, context)

export const captureMessage = (message: string, level: string = 'info') =>
  monitoring.captureMessage(message, level)

export const setUser = (user: { id: string; email?: string; role?: string } | null) =>
  monitoring.setUser(user)

export const addBreadcrumb = (breadcrumb: any) =>
  monitoring.addBreadcrumb(breadcrumb)

export const withMonitoring = <T>(operation: string, fn: () => Promise<T>) =>
  monitoring.withMonitoring(operation, fn)
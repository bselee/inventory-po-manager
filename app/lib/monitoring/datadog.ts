/**
 * DataDog Application Monitoring Configuration
 * Provides APM, logging, and metrics
 */

export interface DataDogConfig {
  apiKey?: string
  applicationId?: string
  clientToken?: string
  site?: string
  service: string
  env: string
  version?: string
  enabled: boolean
}

export interface MetricOptions {
  tags?: Record<string, string>
  timestamp?: Date
}

export class DataDogMonitoring {
  private static instance: DataDogMonitoring
  private initialized = false
  private config: DataDogConfig
  private metricsBuffer: any[] = []
  private flushInterval?: NodeJS.Timeout

  private constructor() {
    this.config = {
      apiKey: process.env.DATADOG_API_KEY,
      applicationId: process.env.DATADOG_APPLICATION_ID,
      clientToken: process.env.DATADOG_CLIENT_TOKEN,
      site: process.env.DATADOG_SITE || 'datadoghq.com',
      service: 'inventory-po-manager',
      env: process.env.NODE_ENV || 'development',
      version: process.env.npm_package_version,
      enabled: process.env.NODE_ENV === 'production' && !!process.env.DATADOG_API_KEY
    }
  }

  public static getInstance(): DataDogMonitoring {
    if (!DataDogMonitoring.instance) {
      DataDogMonitoring.instance = new DataDogMonitoring()
    }
    return DataDogMonitoring.instance
  }

  /**
   * Initialize DataDog monitoring
   */
  public async init() {
    if (this.initialized || !this.config.enabled) {
      return
    }

    try {
      // Initialize DataDog RUM (Real User Monitoring) for browser
      if (typeof window !== 'undefined' && this.config.clientToken) {
        const { datadogRum } = await import('@datadog/browser-rum')
        
        datadogRum.init({
          applicationId: this.config.applicationId!,
          clientToken: this.config.clientToken,
          site: this.config.site,
          service: this.config.service,
          env: this.config.env,
          version: this.config.version,
          sessionSampleRate: 100,
          sessionReplaySampleRate: 20,
          trackUserInteractions: true,
          trackResources: true,
          trackLongTasks: true,
          defaultPrivacyLevel: 'mask-user-input'
        })
        
        datadogRum.startSessionReplayRecording()
      }

      // Start metrics flush interval
      this.startMetricsFlush()

      this.initialized = true
    } catch (error) {
      logError('[DataDog] Failed to initialize:', error)
    }
  }

  /**
   * Log an error
   */
  public logError(error: Error | unknown, context?: Record<string, any>) {
    if (!this.config.enabled) {
      logError('[Local Error]:', error, context)
      return
    }

    const errorData = {
      message: error instanceof Error ? error.message : String(error),
      stack: error instanceof Error ? error.stack : undefined,
      context,
      timestamp: new Date().toISOString(),
      service: this.config.service,
      env: this.config.env
    }

    this.sendLog('error', errorData)
  }

  /**
   * Log a message
   */
  public log(level: 'debug' | 'info' | 'warn' | 'error', message: string, context?: Record<string, any>) {
    if (!this.config.enabled) {
      return
    }

    this.sendLog(level, { message, context })
  }

  /**
   * Send a custom metric
   */
  public metric(name: string, value: number, type: 'count' | 'gauge' | 'histogram' = 'gauge', options?: MetricOptions) {
    if (!this.config.enabled) {
      return
    }

    const metric = {
      metric: `${this.config.service}.${name}`,
      points: [[Math.floor(Date.now() / 1000), value]],
      type,
      tags: [
        `env:${this.config.env}`,
        `service:${this.config.service}`,
        ...Object.entries(options?.tags || {}).map(([k, v]) => `${k}:${v}`)
      ]
    }

    this.metricsBuffer.push(metric)
  }

  /**
   * Increment a counter metric
   */
  public increment(name: string, value: number = 1, tags?: Record<string, string>) {
    this.metric(name, value, 'count', { tags })
  }

  /**
   * Record a gauge metric
   */
  public gauge(name: string, value: number, tags?: Record<string, string>) {
    this.metric(name, value, 'gauge', { tags })
  }

  /**
   * Record a histogram metric
   */
  public histogram(name: string, value: number, tags?: Record<string, string>) {
    this.metric(name, value, 'histogram', { tags })
  }

  /**
   * Start a timer for measuring duration
   */
  public startTimer(name: string, tags?: Record<string, string>): () => void {
    const startTime = Date.now()
    
    return () => {
      const duration = Date.now() - startTime
      this.histogram(`${name}.duration`, duration, tags)
    }
  }

  /**
   * Trace an async operation
   */
  public async trace<T>(
    operation: string,
    fn: () => Promise<T>,
    tags?: Record<string, string>
  ): Promise<T> {
    const timer = this.startTimer(operation, tags)
    
    try {
      const result = await fn()
      this.increment(`${operation}.success`, 1, tags)
      return result
    } catch (error) {
      this.increment(`${operation}.error`, 1, tags)
      this.logError(error, { operation, tags })
      throw error
    } finally {
      timer()
    }
  }

  /**
   * Send log to DataDog
   */
  private async sendLog(level: string, data: any) {
    if (!this.config.apiKey) {
      return
    }

    try {
      const logEntry = {
        ...data,
        level,
        ddsource: 'nodejs',
        ddtags: `env:${this.config.env},service:${this.config.service}`,
        hostname: typeof window !== 'undefined' ? window.location.hostname : 'server'
      }

      // In production, send to DataDog Logs API
      // For now, just console log
      // TODO: Implement actual DataDog API call
      // await fetch(`https://http-intake.logs.${this.config.site}/api/v2/logs`, {
      //   method: 'POST',
      //   headers: {
      //     'Content-Type': 'application/json',
      //     'DD-API-KEY': this.config.apiKey
      //   },
      //   body: JSON.stringify(logEntry)
      // })
    } catch (error) {
      logError('[DataDog] Failed to send log:', error)
    }
  }

  /**
   * Flush metrics buffer to DataDog
   */
  private async flushMetrics() {
    if (this.metricsBuffer.length === 0 || !this.config.apiKey) {
      return
    }

    const metrics = [...this.metricsBuffer]
    this.metricsBuffer = []

    try {
      // In production, send to DataDog Metrics API
      // For now, just console log
      // TODO: Implement actual DataDog API call
      // await fetch(`https://api.${this.config.site}/api/v1/series`, {
      //   method: 'POST',
      //   headers: {
      //     'Content-Type': 'application/json',
      //     'DD-API-KEY': this.config.apiKey
      //   },
      //   body: JSON.stringify({ series: metrics })
      // })
    } catch (error) {
      logError('[DataDog] Failed to flush metrics:', error)
      // Re-add metrics to buffer for retry
      this.metricsBuffer.unshift(...metrics)
    }
  }

  /**
   * Start periodic metrics flush
   */
  private startMetricsFlush() {
    // Flush metrics every 10 seconds
    this.flushInterval = setInterval(() => {
      this.flushMetrics()
    }, 10000)
  }

  /**
   * Stop monitoring and flush remaining data
   */
  public async shutdown() {
    if (this.flushInterval) {
      clearInterval(this.flushInterval)
    }
    
    await this.flushMetrics()
  }
}

// Export singleton instance
export const datadog = DataDogMonitoring.getInstance()

// Helper functions for easy usage
export const logError = (error: Error | unknown, context?: Record<string, any>) =>
  datadog.logError(error, context)

export const log = (level: 'debug' | 'info' | 'warn' | 'error', message: string, context?: Record<string, any>) =>
  datadog.log(level, message, context)

export const metric = (name: string, value: number, type?: 'count' | 'gauge' | 'histogram', options?: MetricOptions) =>
  datadog.metric(name, value, type, options)

export const increment = (name: string, value?: number, tags?: Record<string, string>) =>
  datadog.increment(name, value, tags)

export const gauge = (name: string, value: number, tags?: Record<string, string>) =>
  datadog.gauge(name, value, tags)

export const histogram = (name: string, value: number, tags?: Record<string, string>) =>
  datadog.histogram(name, value, tags)

export const startTimer = (name: string, tags?: Record<string, string>) =>
  datadog.startTimer(name, tags)

export const trace = <T>(operation: string, fn: () => Promise<T>, tags?: Record<string, string>) =>
  datadog.trace(operation, fn, tags)
/**
 * Performance Monitoring Metrics System
 * 
 * Comprehensive performance tracking for all critical operations
 * including API calls, database queries, and user interactions
 */

import { UnifiedMonitoring } from '@/app/lib/monitoring'

interface PerformanceMetric {
  name: string
  value: number
  unit: 'ms' | 'bytes' | 'count' | 'percent'
  timestamp: Date
  tags?: Record<string, string>
}

interface PerformanceThresholds {
  good: number
  acceptable: number
  poor: number
}

/**
 * Performance thresholds for different operations
 */
const THRESHOLDS: Record<string, PerformanceThresholds> = {
  'api.response_time': { good: 100, acceptable: 300, poor: 1000 },
  'db.query_time': { good: 50, acceptable: 150, poor: 500 },
  'page.load_time': { good: 1000, acceptable: 3000, poor: 5000 },
  'inventory.sync_time': { good: 5000, acceptable: 15000, poor: 30000 },
  'cache.hit_rate': { good: 80, acceptable: 60, poor: 40 },
  'memory.usage': { good: 100, acceptable: 200, poor: 500 }, // MB
  'cpu.usage': { good: 30, acceptable: 60, poor: 80 }, // Percent
}

/**
 * Core Performance Metrics Collector
 */
export class PerformanceMetrics {
  private static instance: PerformanceMetrics
  private monitoring: UnifiedMonitoring
  private metrics: Map<string, PerformanceMetric[]> = new Map()
  private timers: Map<string, number> = new Map()
  
  private constructor() {
    this.monitoring = new UnifiedMonitoring()
    this.startPeriodicReporting()
  }
  
  static getInstance(): PerformanceMetrics {
    if (!this.instance) {
      this.instance = new PerformanceMetrics()
    }
    return this.instance
  }
  
  /**
   * Start timing an operation
   */
  startTimer(operation: string, tags?: Record<string, string>): string {
    const id = `${operation}-${Date.now()}-${Math.random()}`
    this.timers.set(id, performance.now())
    
    this.monitoring.startTransaction(operation, 'performance')
    
    if (tags) {
      this.monitoring.setTags(tags)
    }
    
    return id
  }
  
  /**
   * End timing and record the metric
   */
  endTimer(timerId: string, metricName?: string): number {
    const startTime = this.timers.get(timerId)
    if (!startTime) {
      console.warn(`Timer ${timerId} not found`)
      return -1
    }
    
    const duration = performance.now() - startTime
    this.timers.delete(timerId)
    
    const name = metricName || timerId.split('-')[0]
    this.recordMetric(name, duration, 'ms')
    
    // Evaluate performance
    this.evaluatePerformance(name, duration)
    
    return duration
  }
  
  /**
   * Record a metric value
   */
  recordMetric(
    name: string, 
    value: number, 
    unit: PerformanceMetric['unit'] = 'ms',
    tags?: Record<string, string>
  ) {
    const metric: PerformanceMetric = {
      name,
      value,
      unit,
      timestamp: new Date(),
      tags
    }
    
    if (!this.metrics.has(name)) {
      this.metrics.set(name, [])
    }
    
    const metrics = this.metrics.get(name)!
    metrics.push(metric)
    
    // Keep only last 1000 metrics per name
    if (metrics.length > 1000) {
      metrics.shift()
    }
    
    // Send to monitoring service
    this.monitoring.trackMetric(name, value)
  }
  
  /**
   * Evaluate performance against thresholds
   */
  private evaluatePerformance(metricName: string, value: number) {
    const threshold = THRESHOLDS[metricName]
    if (!threshold) return
    
    let level: 'good' | 'acceptable' | 'poor'
    
    if (value <= threshold.good) {
      level = 'good'
    } else if (value <= threshold.acceptable) {
      level = 'acceptable'
    } else {
      level = 'poor'
    }
    
    // Alert on poor performance
    if (level === 'poor') {
      this.monitoring.captureMessage(
        `Poor performance detected: ${metricName} = ${value}ms`,
        'warning'
      )
    }
    
    return level
  }
  
  /**
   * Get aggregated metrics for a specific metric name
   */
  getAggregatedMetrics(name: string, windowMinutes: number = 5) {
    const metrics = this.metrics.get(name) || []
    const cutoff = new Date(Date.now() - windowMinutes * 60 * 1000)
    
    const recentMetrics = metrics.filter(m => m.timestamp >= cutoff)
    
    if (recentMetrics.length === 0) {
      return null
    }
    
    const values = recentMetrics.map(m => m.value)
    
    return {
      name,
      count: values.length,
      min: Math.min(...values),
      max: Math.max(...values),
      avg: values.reduce((a, b) => a + b, 0) / values.length,
      median: this.calculateMedian(values),
      p95: this.calculatePercentile(values, 95),
      p99: this.calculatePercentile(values, 99)
    }
  }
  
  /**
   * Calculate median value
   */
  private calculateMedian(values: number[]): number {
    const sorted = [...values].sort((a, b) => a - b)
    const mid = Math.floor(sorted.length / 2)
    
    if (sorted.length % 2 === 0) {
      return (sorted[mid - 1] + sorted[mid]) / 2
    }
    
    return sorted[mid]
  }
  
  /**
   * Calculate percentile value
   */
  private calculatePercentile(values: number[], percentile: number): number {
    const sorted = [...values].sort((a, b) => a - b)
    const index = Math.ceil((percentile / 100) * sorted.length) - 1
    return sorted[Math.max(0, index)]
  }
  
  /**
   * Get performance report
   */
  getPerformanceReport() {
    const report: Record<string, any> = {}
    
    for (const [name] of this.metrics) {
      report[name] = this.getAggregatedMetrics(name)
    }
    
    return report
  }
  
  /**
   * Start periodic reporting
   */
  private startPeriodicReporting() {
    // Report metrics every 5 minutes
    setInterval(() => {
      const report = this.getPerformanceReport()
      
      // Log summary
      console.info('Performance Report:', report)
      
      // Send to monitoring
      for (const [metric, stats] of Object.entries(report)) {
        if (stats && typeof stats === 'object' && 'avg' in stats) {
          this.monitoring.trackMetric(`${metric}.avg`, stats.avg)
          this.monitoring.trackMetric(`${metric}.p95`, stats.p95)
        }
      }
    }, 5 * 60 * 1000)
  }
  
  /**
   * Clear all metrics
   */
  clearMetrics() {
    this.metrics.clear()
    this.timers.clear()
  }
}

/**
 * Web Vitals Tracking
 */
export class WebVitalsTracker {
  private static metrics = new PerformanceMetrics.getInstance()
  
  /**
   * Track Largest Contentful Paint (LCP)
   */
  static trackLCP(value: number) {
    this.metrics.recordMetric('web_vitals.lcp', value, 'ms')
  }
  
  /**
   * Track First Input Delay (FID)
   */
  static trackFID(value: number) {
    this.metrics.recordMetric('web_vitals.fid', value, 'ms')
  }
  
  /**
   * Track Cumulative Layout Shift (CLS)
   */
  static trackCLS(value: number) {
    this.metrics.recordMetric('web_vitals.cls', value * 1000, 'count')
  }
  
  /**
   * Track Time to First Byte (TTFB)
   */
  static trackTTFB(value: number) {
    this.metrics.recordMetric('web_vitals.ttfb', value, 'ms')
  }
  
  /**
   * Track First Contentful Paint (FCP)
   */
  static trackFCP(value: number) {
    this.metrics.recordMetric('web_vitals.fcp', value, 'ms')
  }
}

/**
 * API Performance Tracking
 */
export class APIPerformanceTracker {
  private static metrics = new PerformanceMetrics.getInstance()
  
  /**
   * Track API request
   */
  static async trackRequest<T>(
    endpoint: string,
    method: string,
    request: () => Promise<T>
  ): Promise<T> {
    const timerId = this.metrics.startTimer('api.request', {
      endpoint,
      method
    })
    
    try {
      const result = await request()
      const duration = this.metrics.endTimer(timerId, 'api.response_time')
      
      // Track success rate
      this.metrics.recordMetric('api.success_rate', 100, 'percent', {
        endpoint,
        method
      })
      
      return result
    } catch (error) {
      const duration = this.metrics.endTimer(timerId, 'api.response_time')
      
      // Track error rate
      this.metrics.recordMetric('api.error_rate', 100, 'percent', {
        endpoint,
        method,
        error: error instanceof Error ? error.message : 'Unknown error'
      })
      
      throw error
    }
  }
  
  /**
   * Track API response size
   */
  static trackResponseSize(endpoint: string, sizeBytes: number) {
    this.metrics.recordMetric('api.response_size', sizeBytes, 'bytes', {
      endpoint
    })
  }
}

/**
 * Database Performance Tracking
 */
export class DatabasePerformanceTracker {
  private static metrics = new PerformanceMetrics.getInstance()
  
  /**
   * Track database query
   */
  static async trackQuery<T>(
    table: string,
    operation: string,
    query: () => Promise<T>
  ): Promise<T> {
    const timerId = this.metrics.startTimer('db.query', {
      table,
      operation
    })
    
    try {
      const result = await query()
      const duration = this.metrics.endTimer(timerId, 'db.query_time')
      
      // Track query count
      this.metrics.recordMetric('db.query_count', 1, 'count', {
        table,
        operation
      })
      
      return result
    } catch (error) {
      this.metrics.endTimer(timerId, 'db.query_time')
      
      // Track error
      this.metrics.recordMetric('db.error_count', 1, 'count', {
        table,
        operation,
        error: error instanceof Error ? error.message : 'Unknown error'
      })
      
      throw error
    }
  }
  
  /**
   * Track connection pool stats
   */
  static trackConnectionPool(active: number, idle: number, waiting: number) {
    this.metrics.recordMetric('db.connections.active', active, 'count')
    this.metrics.recordMetric('db.connections.idle', idle, 'count')
    this.metrics.recordMetric('db.connections.waiting', waiting, 'count')
  }
}

/**
 * Resource Usage Tracking
 */
export class ResourceUsageTracker {
  private static metrics = new PerformanceMetrics.getInstance()
  
  /**
   * Track memory usage
   */
  static trackMemoryUsage() {
    if (typeof window !== 'undefined' && 'memory' in performance) {
      const memory = (performance as any).memory
      
      this.metrics.recordMetric(
        'memory.used',
        memory.usedJSHeapSize / 1048576, // Convert to MB
        'bytes'
      )
      
      this.metrics.recordMetric(
        'memory.total',
        memory.totalJSHeapSize / 1048576,
        'bytes'
      )
      
      this.metrics.recordMetric(
        'memory.limit',
        memory.jsHeapSizeLimit / 1048576,
        'bytes'
      )
    }
  }
  
  /**
   * Start periodic resource tracking
   */
  static startTracking() {
    // Track memory every 30 seconds
    setInterval(() => {
      this.trackMemoryUsage()
    }, 30000)
  }
}

/**
 * Performance monitoring middleware for Next.js API routes
 */
export function withPerformanceTracking(
  handler: (req: Request) => Promise<Response>
) {
  return async (req: Request): Promise<Response> => {
    const metrics = PerformanceMetrics.getInstance()
    const url = new URL(req.url)
    const timerId = metrics.startTimer('api.request', {
      path: url.pathname,
      method: req.method
    })
    
    try {
      const response = await handler(req)
      metrics.endTimer(timerId, 'api.response_time')
      
      // Track response status
      metrics.recordMetric('api.status_code', response.status, 'count', {
        path: url.pathname,
        method: req.method,
        status: response.status.toString()
      })
      
      return response
    } catch (error) {
      metrics.endTimer(timerId, 'api.response_time')
      
      // Track error
      metrics.recordMetric('api.errors', 1, 'count', {
        path: url.pathname,
        method: req.method,
        error: error instanceof Error ? error.message : 'Unknown'
      })
      
      throw error
    }
  }
}

/**
 * Initialize performance monitoring
 */
export function initializePerformanceMonitoring() {
  // Start resource tracking
  if (typeof window !== 'undefined') {
    ResourceUsageTracker.startTracking()
  }
  
  // Log initialization
  console.info('Performance monitoring initialized')
}

/**
 * Export singleton instance
 */
export const performanceMetrics = PerformanceMetrics.getInstance()
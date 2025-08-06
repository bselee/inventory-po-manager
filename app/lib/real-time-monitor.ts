/**
 * Real-time Inventory Monitor with Critical Alerts
 * Provides real-time monitoring of inventory levels and immediate alerts
 */

import { supabase } from './supabase'
import { InventoryItem } from '@/app/types'
// import { sendAlert } from './email-alerts' // Temporarily disabled

export interface CriticalItem extends InventoryItem {
  daysUntilStockout: number
  urgencyLevel: 'critical' | 'high' | 'medium' | 'low'
  stockPercentage: number
}

export interface AlertMetrics {
  totalAlerts: number
  criticalAlerts: number
  outOfStock: number
  lowStock: number
  needReorder: number
  lastAlertTime: Date | null
}

export interface MonitorConfig {
  checkInterval: number // milliseconds
  alertThresholds: {
    critical: number // days until stockout
    high: number
    medium: number
  }
  enableEmailAlerts: boolean
  enableRealtimeSubscription: boolean
  maxAlertsPerHour: number
}

/**
 * Real-time critical item monitor
 */
export class CriticalItemMonitor {
  private config: MonitorConfig
  private isRunning = false
  private alertCount = 0
  private lastAlertTime: Date | null = null
  private criticalItems: Map<string, CriticalItem> = new Map()
  private subscription: any = null
  private checkInterval: NodeJS.Timeout | null = null
  private alertsSentInLastHour: Map<string, number> = new Map()

  constructor(config: MonitorConfig) {
    this.config = config
  }

  /**
   * Start monitoring
   */
  async startMonitoring(): Promise<void> {
    if (this.isRunning) {

      return
    }

    // Initial check
    await this.checkCriticalItems()
    
    // Set up periodic checks
    this.checkInterval = setInterval(
      () => this.checkCriticalItems(),
      this.config.checkInterval
    )
    
    // Set up real-time subscription if enabled
    if (this.config.enableRealtimeSubscription) {
      await this.setupRealtimeSubscription()
    }
    
    this.isRunning = true

  }

  /**
   * Stop monitoring
   */
  stopMonitoring(): void {
    if (this.checkInterval) {
      clearInterval(this.checkInterval)
      this.checkInterval = null
    }
    
    if (this.subscription) {
      supabase.removeChannel(this.subscription)
      this.subscription = null
    }
    
    this.isRunning = false

  }

  /**
   * Check for critical items
   */
  async checkCriticalItems(): Promise<CriticalItem[]> {
    try {

      // Fetch items with low stock
      const { data: items, error } = await supabase
        .from('inventory_items')
        .select('*')
        .or('stock.lte.reorder_point,stock.eq.0')
        .order('stock', { ascending: true })
        .limit(100)
      
      if (error) throw error
      
      const criticalItems: CriticalItem[] = []
      const now = Date.now()
      
      for (const item of items || []) {
        // Calculate days until stockout
        const salesVelocity = this.calculateSalesVelocity(item)
        const daysUntilStockout = salesVelocity > 0 
          ? item.stock / salesVelocity 
          : item.stock === 0 ? 0 : Infinity
        
        // Determine urgency level
        const urgencyLevel = this.determineUrgencyLevel(daysUntilStockout, item.stock)
        
        // Calculate stock percentage
        const stockPercentage = item.reorder_point > 0 
          ? (item.stock / item.reorder_point) * 100 
          : 0
        
        const criticalItem: CriticalItem = {
          ...item,
          daysUntilStockout,
          urgencyLevel,
          stockPercentage
        }
        
        criticalItems.push(criticalItem)
        
        // Update cache
        this.criticalItems.set(item.sku, criticalItem)
        
        // Send alert if needed
        if (urgencyLevel === 'critical' && this.shouldSendAlert(item.sku)) {
          // await this.sendCriticalAlert(criticalItem)

        }
      }

      return criticalItems
      
    } catch (error) {
      logError('[Monitor] Error checking critical items:', error)
      return []
    }
  }

  /**
   * Calculate sales velocity (units per day)
   */
  private calculateSalesVelocity(item: InventoryItem): number {
    const days30 = item.sales_last_30_days || 0
    const days90 = item.sales_last_90_days || 0
    
    // Use 30-day velocity if available, otherwise 90-day
    if (days30 > 0) {
      return days30 / 30
    } else if (days90 > 0) {
      return days90 / 90
    }
    
    return 0
  }

  /**
   * Determine urgency level based on days until stockout
   */
  private determineUrgencyLevel(daysUntilStockout: number, stock: number): CriticalItem['urgencyLevel'] {
    if (stock === 0) return 'critical'
    if (daysUntilStockout <= this.config.alertThresholds.critical) return 'critical'
    if (daysUntilStockout <= this.config.alertThresholds.high) return 'high'
    if (daysUntilStockout <= this.config.alertThresholds.medium) return 'medium'
    return 'low'
  }

  /**
   * Check if we should send an alert for this SKU
   */
  private shouldSendAlert(sku: string): boolean {
    if (!this.config.enableEmailAlerts) return false
    
    const hourAgo = Date.now() - 60 * 60 * 1000
    const recentAlerts = this.alertsSentInLastHour.get(sku) || 0
    
    // Clean up old entries
    this.alertsSentInLastHour.forEach((count, key) => {
      if (count === 0) this.alertsSentInLastHour.delete(key)
    })
    
    // Check rate limit
    if (recentAlerts >= this.config.maxAlertsPerHour) {
      return false
    }
    
    return true
  }

  /**
   * Send critical alert
   */
  private async sendCriticalAlert(item: CriticalItem): Promise<void> {
    try {
      const message = `
CRITICAL INVENTORY ALERT
SKU: ${item.sku}
Product: ${item.product_name}
Current Stock: ${item.stock}
Days Until Stockout: ${item.daysUntilStockout.toFixed(1)}
Urgency: ${item.urgencyLevel.toUpperCase()}
Action Required: Immediate reorder needed
      `.trim()
      
      // TODO: Implement email alerts

      // Update alert tracking
      this.alertCount++
      this.lastAlertTime = new Date()
      const currentCount = this.alertsSentInLastHour.get(item.sku) || 0
      this.alertsSentInLastHour.set(item.sku, currentCount + 1)
      
      // Schedule cleanup
      setTimeout(() => {
        const count = this.alertsSentInLastHour.get(item.sku) || 0
        if (count > 0) {
          this.alertsSentInLastHour.set(item.sku, count - 1)
        }
      }, 60 * 60 * 1000)

    } catch (error) {
      logError('[Monitor] Failed to send alert:', error)
    }
  }

  /**
   * Set up real-time subscription
   */
  private async setupRealtimeSubscription(): Promise<void> {
    try {
      this.subscription = supabase
        .channel('inventory_changes')
        .on(
          'postgres_changes',
          {
            event: '*',
            schema: 'public',
            table: 'inventory_items'
          },
          async (payload) => {

            // Check if this update affects critical items
            if (payload.eventType === 'UPDATE' || payload.eventType === 'INSERT') {
              const item = payload.new as InventoryItem
              
              // Quick check if item is critical
              if ((item.stock ?? 0) <= (item.reorder_point ?? 0) || (item.stock ?? 0) === 0) {
                await this.checkCriticalItems()
              }
            }
          }
        )
        .subscribe()

    } catch (error) {
      logError('[Monitor] Failed to set up real-time subscription:', error)
    }
  }

  /**
   * Get current critical items
   */
  getCriticalItems(): CriticalItem[] {
    return Array.from(this.criticalItems.values())
      .sort((a, b) => a.daysUntilStockout - b.daysUntilStockout)
  }

  /**
   * Get alert metrics
   */
  getAlertMetrics(): AlertMetrics {
    const criticalItems = this.getCriticalItems()
    
    return {
      totalAlerts: this.alertCount,
      criticalAlerts: criticalItems.filter(i => i.urgencyLevel === 'critical').length,
      outOfStock: criticalItems.filter(i => (i.stock ?? 0) === 0).length,
      lowStock: criticalItems.filter(i => (i.stock ?? 0) > 0 && (i.stock ?? 0) <= (i.reorder_point ?? 0)).length,
      needReorder: criticalItems.filter(i => i.daysUntilStockout <= 7).length,
      lastAlertTime: this.lastAlertTime
    }
  }

  /**
   * Get monitor status
   */
  getStatus(): {
    isRunning: boolean
    criticalItemCount: number
    alertsSentToday: number
    config: MonitorConfig
  } {
    return {
      isRunning: this.isRunning,
      criticalItemCount: this.criticalItems.size,
      alertsSentToday: this.alertCount,
      config: this.config
    }
  }

  /**
   * Update configuration
   */
  updateConfig(newConfig: Partial<MonitorConfig>): void {
    this.config = { ...this.config, ...newConfig }
    
    // Restart monitoring with new config
    if (this.isRunning) {
      this.stopMonitoring()
      this.startMonitoring()
    }
  }

  /**
   * Subscribe to alerts (mock implementation)
   */
  onAlert(callback: (alert: any) => void): () => void {
    // This is a simplified implementation
    // In a real implementation, you'd want a proper event emitter

    // Return unsubscribe function
    return () => {

    }
  }
}

/**
 * Default monitor configuration
 */
export const DEFAULT_MONITOR_CONFIG: MonitorConfig = {
  checkInterval: 5 * 60 * 1000, // 5 minutes
  alertThresholds: {
    critical: 3,  // 3 days
    high: 7,      // 7 days
    medium: 14    // 14 days
  },
  enableEmailAlerts: true,
  enableRealtimeSubscription: true,
  maxAlertsPerHour: 3
}

/**
 * Global monitor instance
 */
let globalMonitor: CriticalItemMonitor | null = null

/**
 * Get or create global monitor
 */
export function getCriticalItemMonitor(config?: MonitorConfig): CriticalItemMonitor {
  if (!globalMonitor) {
    globalMonitor = new CriticalItemMonitor(config || DEFAULT_MONITOR_CONFIG)
  }
  return globalMonitor
}

/**
 * Start global monitoring
 */
export async function startGlobalMonitoring(config?: MonitorConfig): Promise<void> {
  const monitor = getCriticalItemMonitor(config)
  await monitor.startMonitoring()
}

/**
 * Stop global monitoring
 */
export function stopGlobalMonitoring(): void {
  if (globalMonitor) {
    globalMonitor.stopMonitoring()
  }
}

/**
 * Get current critical items from global monitor
 */
export function getGlobalCriticalItems(): CriticalItem[] {
  const monitor = getCriticalItemMonitor()
  return monitor.getCriticalItems()
}

/**
 * Get alert metrics from global monitor
 */
export function getGlobalAlertMetrics(): AlertMetrics {
  const monitor = getCriticalItemMonitor()
  return monitor.getAlertMetrics()
}
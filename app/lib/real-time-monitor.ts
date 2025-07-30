/**
 * Real-time Critical Item Monitoring System
 * Provides immediate alerts for stock-outs, reorder needs, and critical changes
 */

import { supabase } from './supabase'
import { emailAlerts } from './email-alerts'
import { InventoryItem } from '@/app/types'
import type { RealtimeChannel } from '@supabase/supabase-js'

export interface CriticalAlert {
  id: string
  sku: string
  productName: string
  alertType: 'out-of-stock' | 'low-stock' | 'reorder-needed' | 'price-change' | 'vendor-change'
  severity: 'low' | 'medium' | 'high' | 'critical'
  currentValue: number
  threshold: number
  previousValue?: number
  timestamp: Date
  acknowledged: boolean
}

export interface MonitoringConfig {
  enableRealTimeAlerts: boolean
  alertThresholds: {
    lowStockMultiplier: number // Multiply reorder_point by this
    criticalStockLevel: number // Absolute low level
    priceChangePercent: number // Alert on price changes > this %
  }
  channels: {
    email: boolean
    browser: boolean
    webhook: boolean
  }
}

/**
 * Real-time monitoring service for critical inventory items
 */
export class CriticalItemMonitor {
  private supabaseChannel: RealtimeChannel | null = null
  private alertCallbacks: Set<(alert: CriticalAlert) => void> = new Set()
  private config: MonitoringConfig
  private isMonitoring = false

  constructor(config: MonitoringConfig) {
    this.config = config
  }

  /**
   * Start real-time monitoring
   */
  async startMonitoring(): Promise<void> {
    if (this.isMonitoring) {
      console.log('[Monitor] Already monitoring')
      return
    }

    console.log('[Monitor] Starting real-time inventory monitoring...')

    try {
      // Set up Supabase real-time subscription
      this.supabaseChannel = supabase
        .channel('critical_inventory_monitor')
        .on('postgres_changes', {
          event: 'UPDATE',
          schema: 'public',
          table: 'inventory_items'
        }, this.handleInventoryUpdate.bind(this))
        .on('postgres_changes', {
          event: 'INSERT',
          schema: 'public',
          table: 'inventory_items'
        }, this.handleInventoryInsert.bind(this))
        .subscribe((status) => {
          console.log('[Monitor] Subscription status:', status)
          if (status === 'SUBSCRIBED') {
            this.isMonitoring = true
            console.log('[Monitor] Real-time monitoring active')
          }
        })

      // Run initial check for existing critical items
      await this.checkExistingCriticalItems()

    } catch (error) {
      console.error('[Monitor] Failed to start monitoring:', error)
      throw error
    }
  }

  /**
   * Stop monitoring
   */
  async stopMonitoring(): Promise<void> {
    if (this.supabaseChannel) {
      await supabase.removeChannel(this.supabaseChannel)
      this.supabaseChannel = null
    }
    this.isMonitoring = false
    console.log('[Monitor] Monitoring stopped')
  }

  /**
   * Add callback for alert notifications
   */
  onAlert(callback: (alert: CriticalAlert) => void): () => void {
    this.alertCallbacks.add(callback)
    return () => this.alertCallbacks.delete(callback)
  }

  /**
   * Handle inventory item updates
   */
  private async handleInventoryUpdate(payload: any): Promise<void> {
    const newItem = payload.new as InventoryItem
    const oldItem = payload.old as InventoryItem

    if (!newItem || !oldItem) return

    console.log(`[Monitor] Item updated: ${newItem.sku}`)

    // Check for critical changes
    const alerts = await this.analyzeChanges(newItem, oldItem)
    
    for (const alert of alerts) {
      await this.triggerAlert(alert)
    }
  }

  /**
   * Handle new inventory items
   */
  private async handleInventoryInsert(payload: any): Promise<void> {
    const newItem = payload.new as InventoryItem
    
    if (!newItem) return

    console.log(`[Monitor] New item added: ${newItem.sku}`)

    // Check if new item is already in critical state
    const alerts = await this.analyzeNewItem(newItem)
    
    for (const alert of alerts) {
      await this.triggerAlert(alert)
    }
  }

  /**
   * Analyze changes between old and new item
   */
  private async analyzeChanges(newItem: InventoryItem, oldItem: InventoryItem): Promise<CriticalAlert[]> {
    const alerts: CriticalAlert[] = []

    // Stock level changes
    if (newItem.stock !== oldItem.stock) {
      const stockAlerts = this.checkStockLevels(newItem, oldItem.stock)
      alerts.push(...stockAlerts)
    }

    // Cost changes
    if (newItem.cost !== oldItem.cost) {
      const costAlert = this.checkCostChange(newItem, oldItem.cost)
      if (costAlert) alerts.push(costAlert)
    }

    // Vendor changes
    if (newItem.vendor !== oldItem.vendor) {
      const vendorAlert = this.checkVendorChange(newItem, oldItem.vendor)
      if (vendorAlert) alerts.push(vendorAlert)
    }

    return alerts
  }

  /**
   * Analyze new item for critical conditions
   */
  private async analyzeNewItem(item: InventoryItem): Promise<CriticalAlert[]> {
    const alerts: CriticalAlert[] = []

    // Check stock levels
    const stockAlerts = this.checkStockLevels(item)
    alerts.push(...stockAlerts)

    return alerts
  }

  /**
   * Check stock levels for critical conditions
   */
  private checkStockLevels(item: InventoryItem, previousStock?: number): CriticalAlert[] {
    const alerts: CriticalAlert[] = []
    const stock = item.stock || 0
    const reorderPoint = item.reorder_point || 0
    const lowStockThreshold = reorderPoint * this.config.alertThresholds.lowStockMultiplier

    // Out of stock
    if (stock === 0 && (previousStock === undefined || previousStock > 0)) {
      alerts.push({
        id: `${item.sku}-out-of-stock-${Date.now()}`,
        sku: item.sku,
        productName: item.product_name || item.sku,
        alertType: 'out-of-stock',
        severity: 'critical',
        currentValue: stock,
        threshold: 1,
        previousValue: previousStock,
        timestamp: new Date(),
        acknowledged: false
      })
    }

    // Below reorder point
    if (stock > 0 && stock <= reorderPoint && (previousStock === undefined || previousStock > reorderPoint)) {
      alerts.push({
        id: `${item.sku}-reorder-needed-${Date.now()}`,
        sku: item.sku,
        productName: item.product_name || item.sku,
        alertType: 'reorder-needed',
        severity: 'high',
        currentValue: stock,
        threshold: reorderPoint,
        previousValue: previousStock,
        timestamp: new Date(),
        acknowledged: false
      })
    }

    // Low stock warning
    if (stock > reorderPoint && stock <= lowStockThreshold) {
      alerts.push({
        id: `${item.sku}-low-stock-${Date.now()}`,
        sku: item.sku,
        productName: item.product_name || item.sku,
        alertType: 'low-stock',
        severity: 'medium',
        currentValue: stock,
        threshold: lowStockThreshold,
        previousValue: previousStock,
        timestamp: new Date(),
        acknowledged: false
      })
    }

    return alerts
  }

  /**
   * Check for significant cost changes
   */
  private checkCostChange(item: InventoryItem, previousCost?: number): CriticalAlert | null {
    const currentCost = item.cost || 0
    
    if (!previousCost || previousCost === 0) return null

    const changePercent = Math.abs((currentCost - previousCost) / previousCost) * 100

    if (changePercent >= this.config.alertThresholds.priceChangePercent) {
      return {
        id: `${item.sku}-price-change-${Date.now()}`,
        sku: item.sku,
        productName: item.product_name || item.sku,
        alertType: 'price-change',
        severity: changePercent > 25 ? 'high' : 'medium',
        currentValue: currentCost,
        threshold: previousCost,
        previousValue: previousCost,
        timestamp: new Date(),
        acknowledged: false
      }
    }

    return null
  }

  /**
   * Check for vendor changes
   */
  private checkVendorChange(item: InventoryItem, previousVendor?: string): CriticalAlert | null {
    if (!previousVendor || !item.vendor) return null

    if (item.vendor !== previousVendor) {
      return {
        id: `${item.sku}-vendor-change-${Date.now()}`,
        sku: item.sku,
        productName: item.product_name || item.sku,
        alertType: 'vendor-change',
        severity: 'medium',
        currentValue: 0, // Not applicable for vendor changes
        threshold: 0,
        previousValue: 0,
        timestamp: new Date(),
        acknowledged: false
      }
    }

    return null
  }

  /**
   * Trigger alert through configured channels
   */
  private async triggerAlert(alert: CriticalAlert): Promise<void> {
    console.log(`[Monitor] CRITICAL ALERT: ${alert.alertType} for ${alert.sku}`)

    // Store alert in database
    await this.storeAlert(alert)

    // Notify callbacks (for real-time UI updates)
    this.alertCallbacks.forEach(callback => {
      try {
        callback(alert)
      } catch (error) {
        console.error('[Monitor] Alert callback error:', error)
      }
    })

    // Send email alerts if configured
    if (this.config.channels.email && alert.severity === 'critical') {
      await this.sendEmailAlert(alert)
    }

    // Could add webhook notifications here
    if (this.config.channels.webhook) {
      await this.sendWebhookAlert(alert)
    }
  }

  /**
   * Store alert in database for tracking
   */
  private async storeAlert(alert: CriticalAlert): Promise<void> {
    try {
      const { error } = await supabase
        .from('inventory_alerts')
        .insert({
          sku: alert.sku,
          product_name: alert.productName,
          alert_type: alert.alertType,
          severity: alert.severity,
          current_value: alert.currentValue,
          threshold_value: alert.threshold,
          previous_value: alert.previousValue,
          acknowledged: false,
          created_at: alert.timestamp.toISOString()
        })

      if (error) {
        console.error('[Monitor] Failed to store alert:', error)
      }
    } catch (error) {
      console.error('[Monitor] Alert storage error:', error)
    }
  }

  /**
   * Send email alert for critical items
   */
  private async sendEmailAlert(alert: CriticalAlert): Promise<void> {
    try {
      await emailAlerts.initialize()
      
      const subject = `CRITICAL: ${alert.alertType.toUpperCase()} - ${alert.productName}`
      const message = this.formatAlertMessage(alert)

      await emailAlerts.sendAlert({
        subject,
        message,
        severity: alert.severity,
        itemSku: alert.sku
      })
    } catch (error) {
      console.error('[Monitor] Failed to send email alert:', error)
    }
  }

  /**
   * Send webhook alert
   */
  private async sendWebhookAlert(alert: CriticalAlert): Promise<void> {
    // Implement webhook notification if needed
    console.log('[Monitor] Webhook alert (not implemented):', alert)
  }

  /**
   * Format alert message for notifications
   */
  private formatAlertMessage(alert: CriticalAlert): string {
    switch (alert.alertType) {
      case 'out-of-stock':
        return `${alert.productName} (${alert.sku}) is OUT OF STOCK. Immediate attention required.`
      
      case 'reorder-needed':
        return `${alert.productName} (${alert.sku}) needs reordering. Current stock: ${alert.currentValue}, Reorder point: ${alert.threshold}`
      
      case 'low-stock':
        return `${alert.productName} (${alert.sku}) is running low. Current stock: ${alert.currentValue}, Threshold: ${alert.threshold}`
      
      case 'price-change':
        const changePercent = alert.previousValue 
          ? Math.abs((alert.currentValue - alert.previousValue) / alert.previousValue) * 100
          : 0
        return `${alert.productName} (${alert.sku}) price changed by ${changePercent.toFixed(1)}%. Was: $${alert.previousValue}, Now: $${alert.currentValue}`
      
      case 'vendor-change':
        return `${alert.productName} (${alert.sku}) vendor has been changed.`
      
      default:
        return `Alert for ${alert.productName} (${alert.sku}): ${alert.alertType}`
    }
  }

  /**
   * Check existing items for critical conditions on startup
   */
  private async checkExistingCriticalItems(): Promise<void> {
    try {
      const { data: criticalItems, error } = await supabase
        .from('inventory_items')
        .select('*')
        .or('stock.eq.0,stock.lte.reorder_point')
        .limit(100)

      if (error) {
        console.error('[Monitor] Failed to check existing critical items:', error)
        return
      }

      if (criticalItems && criticalItems.length > 0) {
        console.log(`[Monitor] Found ${criticalItems.length} existing critical items`)
        
        for (const item of criticalItems) {
          const alerts = await this.analyzeNewItem(item)
          for (const alert of alerts) {
            await this.triggerAlert(alert)
          }
        }
      }
    } catch (error) {
      console.error('[Monitor] Error checking existing critical items:', error)
    }
  }

  /**
   * Get monitoring status
   */
  getStatus(): { isMonitoring: boolean; channelStatus: string } {
    return {
      isMonitoring: this.isMonitoring,
      channelStatus: this.supabaseChannel?.state || 'disconnected'
    }
  }

  /**
   * Update monitoring configuration
   */
  updateConfig(newConfig: Partial<MonitoringConfig>): void {
    this.config = { ...this.config, ...newConfig }
    console.log('[Monitor] Configuration updated')
  }
}

/**
 * Default monitoring configuration
 */
export const DEFAULT_MONITORING_CONFIG: MonitoringConfig = {
  enableRealTimeAlerts: true,
  alertThresholds: {
    lowStockMultiplier: 1.5,
    criticalStockLevel: 5,
    priceChangePercent: 10
  },
  channels: {
    email: true,
    browser: true,
    webhook: false
  }
}

/**
 * Global monitor instance
 */
let globalMonitor: CriticalItemMonitor | null = null

/**
 * Get or create global monitor instance
 */
export function getCriticalItemMonitor(config?: MonitoringConfig): CriticalItemMonitor {
  if (!globalMonitor) {
    globalMonitor = new CriticalItemMonitor(config || DEFAULT_MONITORING_CONFIG)
  }
  return globalMonitor
}

/**
 * Start global monitoring
 */
export async function startGlobalMonitoring(config?: MonitoringConfig): Promise<void> {
  const monitor = getCriticalItemMonitor(config)
  await monitor.startMonitoring()
}

/**
 * Stop global monitoring
 */
export async function stopGlobalMonitoring(): Promise<void> {
  if (globalMonitor) {
    await globalMonitor.stopMonitoring()
  }
}

/**
 * Utility function to get critical items summary
 */
export async function getCriticalItemsSummary(): Promise<{
  outOfStock: number
  needReorder: number
  lowStock: number
  totalCritical: number
}> {
  try {
    const { data: outOfStock } = await supabase
      .from('inventory_items')
      .select('id', { count: 'exact', head: true })
      .eq('stock', 0)

    const { data: needReorder } = await supabase
      .from('inventory_items')
      .select('id', { count: 'exact', head: true })
      .filter('stock', 'lte', 'reorder_point')
      .gt('stock', 0)

    const { data: lowStock } = await supabase
      .from('inventory_items')
      .select('id', { count: 'exact', head: true })
      .filter('stock', 'lte', 'reorder_point * 1.5')
      .gt('stock', 'reorder_point')

    return {
      outOfStock: (outOfStock as any)?.count || 0,
      needReorder: (needReorder as any)?.count || 0,
      lowStock: (lowStock as any)?.count || 0,
      totalCritical: ((outOfStock as any)?.count || 0) + ((needReorder as any)?.count || 0)
    }
  } catch (error) {
    console.error('Failed to get critical items summary:', error)
    return {
      outOfStock: 0,
      needReorder: 0,
      lowStock: 0,
      totalCritical: 0
    }
  }
}

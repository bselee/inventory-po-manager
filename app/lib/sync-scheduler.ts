/**
 * Intelligent Sync Scheduler
 * Optimizes sync timing based on business patterns and data analysis
 */

import { supabase } from './supabase'
import { executeSync } from './sync-service'
import { detectChanges } from './change-detection'
import { getCriticalItemMonitor } from './real-time-monitor'

export interface SyncScheduleConfig {
  businessHours: {
    start: number // Hour 0-23
    end: number   // Hour 0-23
    timezone: string
  }
  syncStrategies: {
    critical: {
      frequency: number // Minutes
      duringBusinessHours: boolean
      triggers: string[]
    }
    inventory: {
      frequency: number
      duringBusinessHours: boolean
    }
    smart: {
      frequency: number
      duringBusinessHours: boolean
    }
    full: {
      frequency: number // Days
      preferredTime: number // Hour 0-23
    }
  }
  adaptiveThresholds: {
    highChangeRate: number // Percentage
    lowChangeRate: number  // Percentage
    criticalItemCount: number
  }
}

export interface SyncAnalysis {
  recommendedStrategy: string
  urgency: 'low' | 'medium' | 'high' | 'critical'
  reasoning: string[]
  estimatedDuration: number
  businessImpact: string
}

/**
 * Intelligent sync scheduler with business-aware timing
 */
export class IntelligentSyncScheduler {
  private config: SyncScheduleConfig
  private isRunning = false
  private intervals: Map<string, NodeJS.Timeout> = new Map()

  constructor(config: SyncScheduleConfig) {
    this.config = config
  }

  /**
   * Start intelligent scheduling
   */
  async startScheduling(): Promise<void> {
    if (this.isRunning) {
      console.log('[Scheduler] Already running')
      return
    }

    console.log('[Scheduler] Starting intelligent sync scheduling...')

    // Set up different sync strategies with intelligent timing
    this.scheduleStrategy('critical', this.config.syncStrategies.critical)
    this.scheduleStrategy('inventory', this.config.syncStrategies.inventory) 
    this.scheduleStrategy('smart', this.config.syncStrategies.smart)
    this.scheduleStrategy('full', this.config.syncStrategies.full)

    this.isRunning = true
    console.log('[Scheduler] Intelligent scheduling active')
  }

  /**
   * Stop all scheduling
   */
  stopScheduling(): void {
    this.intervals.forEach((interval, strategy) => {
      clearInterval(interval)
      console.log(`[Scheduler] Stopped ${strategy} sync schedule`)
    })
    
    this.intervals.clear()
    this.isRunning = false
    console.log('[Scheduler] Scheduling stopped')
  }

  /**
   * Analyze current situation and recommend optimal sync strategy
   */
  async analyzeAndRecommend(): Promise<SyncAnalysis> {
    console.log('[Scheduler] Analyzing sync requirements...')

    const [
      criticalSummary,
      lastSyncData,
      recentChanges,
      businessHourStatus
    ] = await Promise.all([
      getCriticalItemMonitor().getAlertMetrics(),
      this.getLastSyncData(),
      this.analyzeRecentChanges(),
      this.isBusinessHours()
    ])

    const reasoning: string[] = []
    let recommendedStrategy = 'smart'
    let urgency: SyncAnalysis['urgency'] = 'low'
    let estimatedDuration = 300 // 5 minutes default

    // Critical items analysis
    if (criticalSummary.outOfStock > 0) {
      urgency = 'critical'
      recommendedStrategy = 'critical'
      reasoning.push(`${criticalSummary.outOfStock} items out of stock`)
      estimatedDuration = 120
    } else if (criticalSummary.needReorder > this.config.adaptiveThresholds.criticalItemCount) {
      urgency = 'high'
      recommendedStrategy = 'critical'
      reasoning.push(`${criticalSummary.needReorder} items need reordering`)
      estimatedDuration = 180
    }

    // Time-based analysis
    const hoursSinceLastSync = lastSyncData.hoursSinceLastSync
    if (hoursSinceLastSync > 24) {
      urgency = Math.max(urgency === 'low' ? 1 : urgency === 'medium' ? 2 : urgency === 'high' ? 3 : 4, 2) as any
      recommendedStrategy = hoursSinceLastSync > 48 ? 'full' : 'smart'
      reasoning.push(`${Math.round(hoursSinceLastSync)} hours since last sync`)
      estimatedDuration = hoursSinceLastSync > 48 ? 1800 : 600
    }

    // Change rate analysis
    if (recentChanges.estimatedChangeRate > this.config.adaptiveThresholds.highChangeRate) {
      urgency = 'high'
      reasoning.push(`High change rate detected (${recentChanges.estimatedChangeRate.toFixed(1)}%)`)
      estimatedDuration *= 1.5
    } else if (recentChanges.estimatedChangeRate < this.config.adaptiveThresholds.lowChangeRate) {
      reasoning.push(`Low change rate detected (${recentChanges.estimatedChangeRate.toFixed(1)}%)`)
      estimatedDuration *= 0.7
    }

    // Business hours consideration
    const businessImpact = this.assessBusinessImpact(recommendedStrategy, businessHourStatus, estimatedDuration)

    return {
      recommendedStrategy,
      urgency,
      reasoning,
      estimatedDuration: Math.round(estimatedDuration),
      businessImpact
    }
  }

  /**
   * Execute sync based on intelligent analysis
   */
  async executeIntelligentSync(): Promise<{
    success: boolean
    strategy: string
    duration: number
    analysis: SyncAnalysis
  }> {
    const analysis = await this.analyzeAndRecommend()
    
    console.log(`[Scheduler] Executing ${analysis.recommendedStrategy} sync (${analysis.urgency} urgency)`)
    console.log(`[Scheduler] Reasoning: ${analysis.reasoning.join(', ')}`)

    const startTime = Date.now()

    try {
      const result = await executeSync({
        strategy: analysis.recommendedStrategy as any,
        dryRun: false
      })

      const duration = Date.now() - startTime

      // Log analysis results for learning
      await this.logSyncAnalysis(analysis, result, duration)

      return {
        success: result.success,
        strategy: analysis.recommendedStrategy,
        duration,
        analysis
      }
    } catch (error) {
      const duration = Date.now() - startTime
      console.error('[Scheduler] Intelligent sync failed:', error)

      return {
        success: false,
        strategy: analysis.recommendedStrategy,
        duration,
        analysis
      }
    }
  }

  /**
   * Determine optimal sync time for a strategy
   */
  determineOptimalSyncTime(strategy: string): Date {
    const now = new Date()
    const businessHours = this.config.businessHours
    
    // Convert business hours to current timezone
    const currentHour = now.getHours()
    
    switch (strategy) {
      case 'critical':
        // Critical syncs can run anytime
        return now
        
      case 'inventory':
        // Inventory syncs prefer off-hours but can run during business hours
        if (this.isBusinessHours() && currentHour > businessHours.start + 2) {
          // Wait until after business hours
          const nextSync = new Date()
          nextSync.setHours(businessHours.end + 1, 0, 0, 0)
          return nextSync
        }
        return now
        
      case 'smart':
        // Smart syncs prefer early morning or late evening
        if (currentHour >= 6 && currentHour <= 22) {
          const nextSync = new Date()
          nextSync.setHours(2, 0, 0, 0)
          if (nextSync <= now) {
            nextSync.setDate(nextSync.getDate() + 1)
          }
          return nextSync
        }
        return now
        
      case 'full':
        // Full syncs only during deep off-hours
        const nextSync = new Date()
        nextSync.setHours(this.config.syncStrategies.full.preferredTime, 0, 0, 0)
        if (nextSync <= now) {
          nextSync.setDate(nextSync.getDate() + 1)
        }
        return nextSync
        
      default:
        return now
    }
  }

  /**
   * Schedule a specific sync strategy
   */
  private scheduleStrategy(strategy: string, config: any): void {
    const executeWithAnalysis = async () => {
      try {
        // Check if we should skip based on business hours
        if (!config.duringBusinessHours && this.isBusinessHours()) {
          console.log(`[Scheduler] Skipping ${strategy} sync during business hours`)
          return
        }

        // For critical strategy, always check if it's actually needed
        if (strategy === 'critical') {
          const analysis = await this.analyzeAndRecommend()
          if (analysis.urgency === 'low') {
            console.log('[Scheduler] No critical sync needed')
            return
          }
        }

        console.log(`[Scheduler] Executing scheduled ${strategy} sync`)
        await executeSync({ strategy: strategy as any })
        
      } catch (error) {
        console.error(`[Scheduler] Scheduled ${strategy} sync failed:`, error)
      }
    }

    // Convert frequency to milliseconds
    let intervalMs: number
    
    if ('frequency' in config && strategy !== 'full') {
      intervalMs = config.frequency * 60 * 1000 // Convert minutes to ms
    } else if (strategy === 'full') {
      intervalMs = config.frequency * 24 * 60 * 60 * 1000 // Convert days to ms
    } else {
      intervalMs = 60 * 60 * 1000 // Default 1 hour
    }

    // Schedule the first execution based on optimal timing
    const optimalTime = this.determineOptimalSyncTime(strategy)
    const delayMs = Math.max(0, optimalTime.getTime() - Date.now())

    setTimeout(() => {
      // Execute immediately when optimal time is reached
      executeWithAnalysis()
      
      // Then set up regular interval
      const interval = setInterval(executeWithAnalysis, intervalMs)
      this.intervals.set(strategy, interval)
    }, delayMs)

    console.log(`[Scheduler] Scheduled ${strategy} sync every ${intervalMs / 60000} minutes`)
  }

  /**
   * Check if current time is within business hours
   */
  private isBusinessHours(): boolean {
    const now = new Date()
    const currentHour = now.getHours()
    
    return currentHour >= this.config.businessHours.start && 
           currentHour < this.config.businessHours.end
  }

  /**
   * Get data about last sync
   */
  private async getLastSyncData(): Promise<{
    lastSyncTime: Date | null
    hoursSinceLastSync: number
    lastSyncStrategy: string | null
    lastSyncSuccess: boolean
  }> {
    try {
      const { data: lastSync } = await supabase
        .from('sync_logs')
        .select('synced_at, sync_type, status, metadata')
        .eq('sync_type', 'finale_inventory')
        .order('synced_at', { ascending: false })
        .limit(1)
        .maybeSingle()

      if (!lastSync) {
        return {
          lastSyncTime: null,
          hoursSinceLastSync: Infinity,
          lastSyncStrategy: null,
          lastSyncSuccess: false
        }
      }

      const lastSyncTime = new Date(lastSync.synced_at)
      const hoursSinceLastSync = (Date.now() - lastSyncTime.getTime()) / (1000 * 60 * 60)

      return {
        lastSyncTime,
        hoursSinceLastSync,
        lastSyncStrategy: lastSync.metadata?.strategy || 'unknown',
        lastSyncSuccess: lastSync.status === 'success'
      }
    } catch (error) {
      console.error('[Scheduler] Failed to get last sync data:', error)
      return {
        lastSyncTime: null,
        hoursSinceLastSync: Infinity,
        lastSyncStrategy: null,
        lastSyncSuccess: false
      }
    }
  }

  /**
   * Analyze recent changes to estimate change rate
   */
  private async analyzeRecentChanges(): Promise<{
    estimatedChangeRate: number
    recentSyncCount: number
    averageItemsChanged: number
  }> {
    try {
      const { data: recentSyncs } = await supabase
        .from('sync_logs')
        .select('items_processed, items_updated, synced_at')
        .eq('sync_type', 'finale_inventory')
        .eq('status', 'success')
        .gte('synced_at', new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString()) // Last 7 days
        .order('synced_at', { ascending: false })
        .limit(10)

      if (!recentSyncs || recentSyncs.length === 0) {
        return {
          estimatedChangeRate: 50, // Default assumption
          recentSyncCount: 0,
          averageItemsChanged: 0
        }
      }

      const totalProcessed = recentSyncs.reduce((sum, sync) => sum + (sync.items_processed || 0), 0)
      const totalUpdated = recentSyncs.reduce((sum, sync) => sum + (sync.items_updated || 0), 0)
      
      const estimatedChangeRate = totalProcessed > 0 ? (totalUpdated / totalProcessed) * 100 : 50
      const averageItemsChanged = totalUpdated / recentSyncs.length

      return {
        estimatedChangeRate,
        recentSyncCount: recentSyncs.length,
        averageItemsChanged
      }
    } catch (error) {
      console.error('[Scheduler] Failed to analyze recent changes:', error)
      return {
        estimatedChangeRate: 50,
        recentSyncCount: 0,
        averageItemsChanged: 0
      }
    }
  }

  /**
   * Assess business impact of sync timing
   */
  private assessBusinessImpact(
    strategy: string, 
    isDuringBusinessHours: boolean, 
    estimatedDuration: number
  ): string {
    if (strategy === 'critical') {
      return 'Minimal - Critical syncs are fast and essential'
    }

    if (strategy === 'full' && isDuringBusinessHours) {
      return 'High - Full sync during business hours may affect performance'
    }

    if (estimatedDuration > 600 && isDuringBusinessHours) { // 10 minutes
      return 'Medium - Long sync during business hours'
    }

    if (!isDuringBusinessHours) {
      return 'Minimal - Off-hours sync'
    }

    return 'Low - Quick sync with minimal impact'
  }

  /**
   * Log sync analysis for machine learning
   */
  private async logSyncAnalysis(
    analysis: SyncAnalysis,
    result: any,
    actualDuration: number
  ): Promise<void> {
    try {
      const { error } = await supabase
        .from('sync_analysis_logs')
        .insert({
          recommended_strategy: analysis.recommendedStrategy,
          urgency: analysis.urgency,
          reasoning: analysis.reasoning,
          estimated_duration: analysis.estimatedDuration,
          actual_duration: actualDuration,
          success: result.success,
          items_synced: result.itemsSynced || 0,
          items_failed: result.itemsFailed || 0,
          accuracy_score: Math.abs(analysis.estimatedDuration - actualDuration) / analysis.estimatedDuration,
          created_at: new Date().toISOString()
        })

      if (error) {
        console.error('[Scheduler] Failed to log analysis:', error)
      }
    } catch (error) {
      console.error('[Scheduler] Analysis logging error:', error)
    }
  }

  /**
   * Get scheduler status
   */
  getStatus(): {
    isRunning: boolean
    activeStrategies: string[]
    nextScheduledSync: Date | null
  } {
    return {
      isRunning: this.isRunning,
      activeStrategies: Array.from(this.intervals.keys()),
      nextScheduledSync: null // Could calculate this based on schedules
    }
  }

  /**
   * Update configuration
   */
  updateConfig(newConfig: Partial<SyncScheduleConfig>): void {
    this.config = { ...this.config, ...newConfig }
    
    // Restart scheduling with new config
    if (this.isRunning) {
      this.stopScheduling()
      this.startScheduling()
    }
  }
}

/**
 * Default configuration for BuildASoil business hours
 */
export const DEFAULT_SYNC_SCHEDULE_CONFIG: SyncScheduleConfig = {
  businessHours: {
    start: 8,  // 8 AM
    end: 17,   // 5 PM
    timezone: 'America/Denver' // Mountain Time
  },
  syncStrategies: {
    critical: {
      frequency: 15, // Every 15 minutes
      duringBusinessHours: true, // Critical items need immediate attention
      triggers: ['out-of-stock', 'low-stock', 'reorder-needed']
    },
    inventory: {
      frequency: 60, // Every hour
      duringBusinessHours: false // Prefer off-hours
    },
    smart: {
      frequency: 360, // Every 6 hours
      duringBusinessHours: false
    },
    full: {
      frequency: 1, // Daily
      preferredTime: 2 // 2 AM
    }
  },
  adaptiveThresholds: {
    highChangeRate: 20, // 20% of items changed
    lowChangeRate: 5,   // 5% of items changed  
    criticalItemCount: 10 // More than 10 items need reordering
  }
}

/**
 * Global scheduler instance
 */
let globalScheduler: IntelligentSyncScheduler | null = null

/**
 * Get or create global scheduler
 */
export function getIntelligentScheduler(config?: SyncScheduleConfig): IntelligentSyncScheduler {
  if (!globalScheduler) {
    globalScheduler = new IntelligentSyncScheduler(config || DEFAULT_SYNC_SCHEDULE_CONFIG)
  }
  return globalScheduler
}

/**
 * Start global intelligent scheduling
 */
export async function startIntelligentScheduling(config?: SyncScheduleConfig): Promise<void> {
  const scheduler = getIntelligentScheduler(config)
  await scheduler.startScheduling()
}

/**
 * Stop global scheduling
 */
export function stopIntelligentScheduling(): void {
  if (globalScheduler) {
    globalScheduler.stopScheduling()
  }
}

/**
 * Execute one-time intelligent sync analysis and execution
 */
export async function executeIntelligentSync(): Promise<{
  success: boolean
  strategy: string
  duration: number
  analysis: SyncAnalysis
}> {
  const scheduler = getIntelligentScheduler()
  return await scheduler.executeIntelligentSync()
}

/**
 * Feature Flags System
 * 
 * A comprehensive feature flag implementation for controlled feature rollouts,
 * A/B testing, and gradual deployments
 */

import { supabase } from '@/app/lib/supabase'
import { cache } from '@/app/lib/cache/redis-client'
import { logInfo, logError } from '@/app/lib/monitoring'

/**
 * Feature flag types
 */
export enum FlagType {
  BOOLEAN = 'boolean',
  PERCENTAGE = 'percentage',
  VARIANT = 'variant',
  USER_LIST = 'user_list',
  ENVIRONMENT = 'environment'
}

/**
 * Feature flag status
 */
export enum FlagStatus {
  ENABLED = 'enabled',
  DISABLED = 'disabled',
  PARTIAL = 'partial'
}

/**
 * Feature flag definition
 */
export interface FeatureFlag {
  id: string
  name: string
  description: string
  type: FlagType
  status: FlagStatus
  value: any
  rules?: FlagRule[]
  variants?: FlagVariant[]
  rolloutPercentage?: number
  enabledUsers?: string[]
  enabledEnvironments?: string[]
  createdAt: Date
  updatedAt: Date
  expiresAt?: Date
}

/**
 * Flag evaluation rule
 */
export interface FlagRule {
  id: string
  attribute: string
  operator: 'equals' | 'contains' | 'greater_than' | 'less_than' | 'in' | 'not_in'
  value: any
  weight?: number
}

/**
 * Flag variant for A/B testing
 */
export interface FlagVariant {
  id: string
  name: string
  value: any
  weight: number
  isControl?: boolean
}

/**
 * User context for flag evaluation
 */
export interface UserContext {
  userId: string
  email?: string
  role?: string
  plan?: string
  createdAt?: Date
  attributes?: Record<string, any>
}

/**
 * Feature Flags Manager
 */
export class FeatureFlagsManager {
  private static instance: FeatureFlagsManager
  private flags: Map<string, FeatureFlag> = new Map()
  private userOverrides: Map<string, Map<string, any>> = new Map()
  private initialized: boolean = false
  
  private constructor() {}
  
  static getInstance(): FeatureFlagsManager {
    if (!this.instance) {
      this.instance = new FeatureFlagsManager()
    }
    return this.instance
  }
  
  /**
   * Initialize feature flags
   */
  async initialize() {
    if (this.initialized) return
    
    try {
      // Load flags from database
      await this.loadFlags()
      
      // Set up real-time updates
      this.setupRealtimeUpdates()
      
      // Schedule periodic refresh
      this.scheduleRefresh()
      
      this.initialized = true
      logInfo('Feature flags initialized')
    } catch (error) {
      logError('Failed to initialize feature flags', error)
    }
  }
  
  /**
   * Load flags from database
   */
  private async loadFlags() {
    try {
      // Try cache first
      const cachedFlags = await cache.get<FeatureFlag[]>('feature_flags')
      
      if (cachedFlags) {
        cachedFlags.forEach(flag => this.flags.set(flag.id, flag))
        return
      }
      
      // Load from database
      const { data: flags, error } = await supabase
        .from('feature_flags')
        .select('*')
        .eq('status', 'enabled')
      
      if (error) throw error
      
      if (flags) {
        flags.forEach(flag => {
          this.flags.set(flag.id, {
            ...flag,
            createdAt: new Date(flag.created_at),
            updatedAt: new Date(flag.updated_at),
            expiresAt: flag.expires_at ? new Date(flag.expires_at) : undefined
          })
        })
        
        // Cache for 5 minutes
        await cache.set('feature_flags', Array.from(this.flags.values()), 300)
      }
    } catch (error) {
      logError('Failed to load feature flags', error)
    }
  }
  
  /**
   * Set up real-time updates for flags
   */
  private setupRealtimeUpdates() {
    if (typeof window === 'undefined') return
    
    const channel = supabase
      .channel('feature_flags_changes')
      .on('postgres_changes', {
        event: '*',
        schema: 'public',
        table: 'feature_flags'
      }, (payload) => {
        this.handleFlagUpdate(payload)
      })
      .subscribe()
  }
  
  /**
   * Handle real-time flag updates
   */
  private handleFlagUpdate(payload: any) {
    const { eventType, new: newFlag, old: oldFlag } = payload
    
    switch (eventType) {
      case 'INSERT':
      case 'UPDATE':
        if (newFlag) {
          this.flags.set(newFlag.id, {
            ...newFlag,
            createdAt: new Date(newFlag.created_at),
            updatedAt: new Date(newFlag.updated_at),
            expiresAt: newFlag.expires_at ? new Date(newFlag.expires_at) : undefined
          })
          logInfo(`Feature flag ${newFlag.id} updated`)
        }
        break
      case 'DELETE':
        if (oldFlag) {
          this.flags.delete(oldFlag.id)
          logInfo(`Feature flag ${oldFlag.id} deleted`)
        }
        break
    }
    
    // Clear cache
    cache.delete('feature_flags')
  }
  
  /**
   * Schedule periodic refresh
   */
  private scheduleRefresh() {
    // Refresh every 5 minutes
    setInterval(() => {
      this.loadFlags()
    }, 5 * 60 * 1000)
  }
  
  /**
   * Check if a feature is enabled
   */
  isEnabled(flagId: string, context?: UserContext): boolean {
    const flag = this.flags.get(flagId)
    
    if (!flag) {
      return false // Default to disabled for unknown flags
    }
    
    // Check expiration
    if (flag.expiresAt && new Date() > flag.expiresAt) {
      return false
    }
    
    // Check user overrides
    if (context?.userId) {
      const userOverrides = this.userOverrides.get(context.userId)
      if (userOverrides?.has(flagId)) {
        return userOverrides.get(flagId)
      }
    }
    
    // Evaluate based on flag type
    switch (flag.type) {
      case FlagType.BOOLEAN:
        return flag.value === true
        
      case FlagType.PERCENTAGE:
        return this.evaluatePercentage(flag, context)
        
      case FlagType.VARIANT:
        return flag.status === FlagStatus.ENABLED
        
      case FlagType.USER_LIST:
        return this.evaluateUserList(flag, context)
        
      case FlagType.ENVIRONMENT:
        return this.evaluateEnvironment(flag)
        
      default:
        return false
    }
  }
  
  /**
   * Get variant for a feature
   */
  getVariant(flagId: string, context?: UserContext): string | null {
    const flag = this.flags.get(flagId)
    
    if (!flag || flag.type !== FlagType.VARIANT) {
      return null
    }
    
    if (!this.isEnabled(flagId, context)) {
      return null
    }
    
    // Check user overrides
    if (context?.userId) {
      const userOverrides = this.userOverrides.get(context.userId)
      if (userOverrides?.has(`${flagId}_variant`)) {
        return userOverrides.get(`${flagId}_variant`)
      }
    }
    
    // Select variant based on weights
    return this.selectVariant(flag, context)
  }
  
  /**
   * Evaluate percentage-based flag
   */
  private evaluatePercentage(flag: FeatureFlag, context?: UserContext): boolean {
    if (!flag.rolloutPercentage) return false
    
    // Use consistent hashing for user
    const hash = context?.userId ? this.hashString(context.userId + flag.id) : Math.random()
    return (hash % 100) < flag.rolloutPercentage
  }
  
  /**
   * Evaluate user list flag
   */
  private evaluateUserList(flag: FeatureFlag, context?: UserContext): boolean {
    if (!context?.userId || !flag.enabledUsers) return false
    return flag.enabledUsers.includes(context.userId)
  }
  
  /**
   * Evaluate environment flag
   */
  private evaluateEnvironment(flag: FeatureFlag): boolean {
    if (!flag.enabledEnvironments) return false
    const currentEnv = process.env.NODE_ENV || 'development'
    return flag.enabledEnvironments.includes(currentEnv)
  }
  
  /**
   * Select variant based on weights
   */
  private selectVariant(flag: FeatureFlag, context?: UserContext): string {
    if (!flag.variants || flag.variants.length === 0) {
      return 'control'
    }
    
    // Use consistent hashing for user
    const hash = context?.userId 
      ? this.hashString(context.userId + flag.id) 
      : Math.random() * 100
    
    let cumulativeWeight = 0
    for (const variant of flag.variants) {
      cumulativeWeight += variant.weight
      if (hash < cumulativeWeight) {
        return variant.name
      }
    }
    
    // Fallback to control
    return flag.variants.find(v => v.isControl)?.name || 'control'
  }
  
  /**
   * Hash string to number (0-99)
   */
  private hashString(str: string): number {
    let hash = 0
    for (let i = 0; i < str.length; i++) {
      const char = str.charCodeAt(i)
      hash = ((hash << 5) - hash) + char
      hash = hash & hash // Convert to 32bit integer
    }
    return Math.abs(hash) % 100
  }
  
  /**
   * Override flag for specific user
   */
  overrideForUser(userId: string, flagId: string, value: any) {
    if (!this.userOverrides.has(userId)) {
      this.userOverrides.set(userId, new Map())
    }
    this.userOverrides.get(userId)!.set(flagId, value)
  }
  
  /**
   * Clear user overrides
   */
  clearUserOverrides(userId: string) {
    this.userOverrides.delete(userId)
  }
  
  /**
   * Get all enabled flags for context
   */
  getEnabledFlags(context?: UserContext): string[] {
    const enabled: string[] = []
    
    for (const [flagId] of this.flags) {
      if (this.isEnabled(flagId, context)) {
        enabled.push(flagId)
      }
    }
    
    return enabled
  }
  
  /**
   * Get flag configuration
   */
  getFlag(flagId: string): FeatureFlag | undefined {
    return this.flags.get(flagId)
  }
  
  /**
   * Get all flags
   */
  getAllFlags(): FeatureFlag[] {
    return Array.from(this.flags.values())
  }
}

/**
 * Default feature flags
 */
export const DEFAULT_FLAGS: Record<string, Partial<FeatureFlag>> = {
  'enhanced_inventory_view': {
    name: 'Enhanced Inventory View',
    description: 'New inventory table with advanced features',
    type: FlagType.PERCENTAGE,
    status: FlagStatus.PARTIAL,
    rolloutPercentage: 50
  },
  'redis_caching': {
    name: 'Redis Caching',
    description: 'Enable Redis caching for improved performance',
    type: FlagType.ENVIRONMENT,
    status: FlagStatus.ENABLED,
    enabledEnvironments: ['production']
  },
  'ai_predictions': {
    name: 'AI Predictions',
    description: 'Enable AI-powered demand predictions',
    type: FlagType.USER_LIST,
    status: FlagStatus.PARTIAL,
    enabledUsers: []
  },
  'dark_mode': {
    name: 'Dark Mode',
    description: 'Enable dark mode theme',
    type: FlagType.BOOLEAN,
    status: FlagStatus.ENABLED,
    value: true
  },
  'export_formats': {
    name: 'Export Formats',
    description: 'Test different export format options',
    type: FlagType.VARIANT,
    status: FlagStatus.ENABLED,
    variants: [
      { id: '1', name: 'csv_only', value: ['csv'], weight: 33, isControl: true },
      { id: '2', name: 'csv_excel', value: ['csv', 'xlsx'], weight: 33 },
      { id: '3', name: 'all_formats', value: ['csv', 'xlsx', 'pdf'], weight: 34 }
    ]
  }
}

/**
 * React Hook for feature flags
 */
export function useFeatureFlag(flagId: string, context?: UserContext): boolean {
  const manager = FeatureFlagsManager.getInstance()
  return manager.isEnabled(flagId, context)
}

/**
 * React Hook for feature variants
 */
export function useFeatureVariant(flagId: string, context?: UserContext): string | null {
  const manager = FeatureFlagsManager.getInstance()
  return manager.getVariant(flagId, context)
}

/**
 * Initialize feature flags on app start
 */
export async function initializeFeatureFlags() {
  const manager = FeatureFlagsManager.getInstance()
  await manager.initialize()
}

/**
 * Export singleton instance
 */
export const featureFlags = FeatureFlagsManager.getInstance()
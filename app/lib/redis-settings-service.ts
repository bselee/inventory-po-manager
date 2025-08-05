import { redis } from './redis-client'

// Cache keys
const SETTINGS_KEY = 'settings:main'
const SETTINGS_BACKUP_KEY = 'settings:backup'

export interface RedisSettings {
  // Finale configuration
  finale_api_key?: string
  finale_api_secret?: string
  finale_account_path?: string
  finale_username?: string
  finale_password?: string
  
  // Report URLs
  finale_inventory_report_url?: string
  finale_consumption_14day_url?: string
  finale_consumption_30day_url?: string
  finale_stock_report_url?: string
  finale_purchase_orders_url?: string
  
  // Data source configuration
  inventory_data_source?: 'enhanced' | 'redis-cache' | 'finale-cache' | 'supabase'
  
  // Email configuration
  sendgrid_api_key?: string
  from_email?: string
  alert_email?: string
  
  // Sync configuration
  low_stock_threshold: number
  sync_frequency_minutes: number
  sync_enabled: boolean
  auto_generate_po: boolean
  
  // Metadata
  last_updated?: string
  version?: number
}

/**
 * Redis-based Settings Service
 * Replaces Supabase settings storage
 */
export class RedisSettingsService {
  /**
   * Get current settings
   */
  async getSettings(): Promise<RedisSettings> {
    try {
      const settings = await redis.get<RedisSettings>(SETTINGS_KEY)
      
      if (!settings) {
        // Return defaults if no settings exist
        return this.getDefaultSettings()
      }
      
      return settings
    } catch (error) {
      console.error('[Redis Settings] Error getting settings:', error)
      throw error
    }
  }
  
  /**
   * Update settings
   */
  async updateSettings(updates: Partial<RedisSettings>): Promise<RedisSettings> {
    try {
      // Get current settings
      const current = await this.getSettings()
      
      // Create backup before updating
      await this.createBackup(current)
      
      // Merge updates
      const updated: RedisSettings = {
        ...current,
        ...updates,
        last_updated: new Date().toISOString(),
        version: (current.version || 0) + 1
      }
      
      // Save updated settings
      await redis.set(SETTINGS_KEY, updated)
      
      console.log('[Redis Settings] Settings updated successfully')
      return updated
      
    } catch (error) {
      console.error('[Redis Settings] Error updating settings:', error)
      throw error
    }
  }
  
  /**
   * Reset to default settings
   */
  async resetSettings(): Promise<RedisSettings> {
    try {
      const current = await this.getSettings()
      await this.createBackup(current)
      
      const defaults = this.getDefaultSettings()
      await redis.set(SETTINGS_KEY, defaults)
      
      console.log('[Redis Settings] Settings reset to defaults')
      return defaults
      
    } catch (error) {
      console.error('[Redis Settings] Error resetting settings:', error)
      throw error
    }
  }
  
  /**
   * Get settings backup
   */
  async getBackup(): Promise<RedisSettings | null> {
    try {
      return await redis.get<RedisSettings>(SETTINGS_BACKUP_KEY)
    } catch (error) {
      console.error('[Redis Settings] Error getting backup:', error)
      return null
    }
  }
  
  /**
   * Restore from backup
   */
  async restoreFromBackup(): Promise<RedisSettings> {
    try {
      const backup = await this.getBackup()
      
      if (!backup) {
        throw new Error('No backup found')
      }
      
      await redis.set(SETTINGS_KEY, backup)
      console.log('[Redis Settings] Restored from backup')
      
      return backup
      
    } catch (error) {
      console.error('[Redis Settings] Error restoring from backup:', error)
      throw error
    }
  }
  
  /**
   * Create backup of current settings
   */
  private async createBackup(settings: RedisSettings): Promise<void> {
    try {
      await redis.set(SETTINGS_BACKUP_KEY, settings)
      console.log('[Redis Settings] Backup created')
    } catch (error) {
      console.error('[Redis Settings] Error creating backup:', error)
    }
  }
  
  /**
   * Get default settings
   */
  private getDefaultSettings(): RedisSettings {
    return {
      inventory_data_source: 'enhanced',
      low_stock_threshold: 10,
      sync_frequency_minutes: 60,
      sync_enabled: true,
      auto_generate_po: false,
      last_updated: new Date().toISOString(),
      version: 1
    }
  }
  
  /**
   * Validate settings
   */
  validateSettings(settings: Partial<RedisSettings>): { isValid: boolean; errors: string[] } {
    const errors: string[] = []
    
    // Validate Finale credentials if provided
    if (settings.finale_api_key || settings.finale_api_secret) {
      if (!settings.finale_api_key) errors.push('Finale API key is required')
      if (!settings.finale_api_secret) errors.push('Finale API secret is required')
      if (!settings.finale_account_path) errors.push('Finale account path is required')
    }
    
    // Validate email settings if provided
    if (settings.sendgrid_api_key) {
      if (!settings.from_email) errors.push('From email is required when SendGrid is configured')
      if (!settings.alert_email) errors.push('Alert email is required when SendGrid is configured')
    }
    
    // Validate thresholds
    if (settings.low_stock_threshold !== undefined && settings.low_stock_threshold < 0) {
      errors.push('Low stock threshold must be positive')
    }
    
    if (settings.sync_frequency_minutes !== undefined && settings.sync_frequency_minutes < 5) {
      errors.push('Sync frequency must be at least 5 minutes')
    }
    
    return {
      isValid: errors.length === 0,
      errors
    }
  }
  
  /**
   * Get Finale configuration
   */
  async getFinaleConfig(): Promise<{
    apiKey: string
    apiSecret: string
    accountPath: string
  } | null> {
    const settings = await this.getSettings()
    
    if (!settings.finale_api_key || !settings.finale_api_secret || !settings.finale_account_path) {
      return null
    }
    
    return {
      apiKey: settings.finale_api_key,
      apiSecret: settings.finale_api_secret,
      accountPath: settings.finale_account_path
    }
  }
  
  /**
   * Get all report URLs
   */
  async getReportUrls(): Promise<{
    inventory?: string
    consumption14?: string
    consumption30?: string
    stock?: string
    purchaseOrders?: string
  }> {
    const settings = await this.getSettings()
    
    return {
      inventory: settings.finale_inventory_report_url,
      consumption14: settings.finale_consumption_14day_url,
      consumption30: settings.finale_consumption_30day_url,
      stock: settings.finale_stock_report_url,
      purchaseOrders: settings.finale_purchase_orders_url
    }
  }
  
  /**
   * Migrate settings from Supabase
   */
  async migrateFromSupabase(supabaseSettings: any): Promise<RedisSettings> {
    const migrated: RedisSettings = {
      ...this.getDefaultSettings(),
      finale_api_key: supabaseSettings.finale_api_key,
      finale_api_secret: supabaseSettings.finale_api_secret,
      finale_account_path: supabaseSettings.finale_account_path,
      finale_username: supabaseSettings.finale_username,
      finale_password: supabaseSettings.finale_password,
      finale_inventory_report_url: supabaseSettings.finale_inventory_report_url,
      finale_consumption_14day_url: supabaseSettings.finale_consumption_14day_url,
      finale_consumption_30day_url: supabaseSettings.finale_consumption_30day_url,
      finale_stock_report_url: supabaseSettings.finale_stock_report_url,
      inventory_data_source: supabaseSettings.inventory_data_source || 'enhanced',
      sendgrid_api_key: supabaseSettings.sendgrid_api_key,
      from_email: supabaseSettings.from_email,
      alert_email: supabaseSettings.alert_email,
      low_stock_threshold: supabaseSettings.low_stock_threshold || 10,
      sync_frequency_minutes: supabaseSettings.sync_frequency_minutes || 60,
      sync_enabled: supabaseSettings.sync_enabled !== false,
      auto_generate_po: supabaseSettings.auto_generate_po || false
    }
    
    await redis.set(SETTINGS_KEY, migrated)
    console.log('[Redis Settings] Migrated settings from Supabase')
    
    return migrated
  }
}

// Export singleton instance
export const redisSettingsService = new RedisSettingsService()
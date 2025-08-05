/**
 * Settings Service
 * Replaces Supabase settings storage with Redis Cloud
 */

import { kvStorage, Settings } from './redis-storage';

export class SettingsService {
  private static instance: SettingsService
  private settings: Settings | null = null
  private lastFetch: number = 0
  private readonly CACHE_DURATION = 5 * 60 * 1000 // 5 minutes

  static getInstance(): SettingsService {
    if (!SettingsService.instance) {
      SettingsService.instance = new SettingsService()
    }
    return SettingsService.instance
  }

  /**
   * Get application settings with caching
   */
  async getSettings(): Promise<Settings> {
    const now = Date.now()
    
    // Return cached if still valid
    if (this.settings && (now - this.lastFetch) < this.CACHE_DURATION) {
      return this.settings
    }

    try {
      const settings = await kvStorage.getSettings()
      
      if (!settings) {
        // Create default settings
        const defaultSettings: Settings = {
          id: 'default',
          inventory_data_source: 'finale-cache',
          sync_frequency_minutes: 60,
          sync_enabled: true,
          email_notifications: true,
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString()
        }
        
        await this.saveSettings(defaultSettings)
        this.settings = defaultSettings
      } else {
        this.settings = settings
      }
      
      this.lastFetch = now
      return this.settings
    } catch (error) {
      console.error('Error fetching settings:', error)
      throw new Error('Failed to fetch settings')
    }
  }

  /**
   * Save application settings
   */
  async saveSettings(settings: Partial<Settings>): Promise<Settings> {
    try {
      const current = await this.getSettings()
      const updated: Settings = {
        ...current,
        ...settings,
        updated_at: new Date().toISOString()
      }
      
      await kvStorage.setSetting('default', updated)
      
      // Update cache
      this.settings = updated
      this.lastFetch = Date.now()
      
      return updated
    } catch (error) {
      console.error('Error saving settings:', error)
      throw new Error('Failed to save settings')
    }
  }

  /**
   * Get Finale API configuration
   */
  async getFinaleConfig(): Promise<{
    apiKey?: string
    apiSecret?: string
    accountPath?: string
  } | null> {
    try {
      const settings = await this.getSettings()
      
      if (!settings.finale_api_key || !settings.finale_api_secret || !settings.finale_account_path) {
        return null
      }
      
      return {
        apiKey: settings.finale_api_key,
        apiSecret: settings.finale_api_secret,
        accountPath: settings.finale_account_path
      }
    } catch (error) {
      console.error('Error getting Finale config:', error)
      return null
    }
  }

  /**
   * Update sync status
   */
  async updateSyncStatus(lastSyncTime: string, enabled?: boolean): Promise<void> {
    const updates: Partial<Settings> = {
      last_sync_time: lastSyncTime
    }
    
    if (enabled !== undefined) {
      updates.sync_enabled = enabled
    }
    
    await this.saveSettings(updates)
  }

  /**
   * Clear settings cache
   */
  clearCache(): void {
    this.settings = null
    this.lastFetch = 0
  }

  /**
   * Export settings for backup
   */
  async exportSettings(): Promise<Settings> {
    return await this.getSettings()
  }

  /**
   * Import settings from backup
   */
  async importSettings(settings: Partial<Settings>): Promise<Settings> {
    const imported = {
      ...settings,
      id: 'default',
      updated_at: new Date().toISOString()
    } as Settings
    
    await kvStorage.setSetting('default', imported)
    this.clearCache()
    
    return await this.getSettings()
  }
}

// Export singleton instance
export const settingsService = SettingsService.getInstance()

// Legacy compatibility functions for existing code
export async function getFinaleConfig() {
  return await settingsService.getFinaleConfig()
}

export async function getSettings() {
  return await settingsService.getSettings()
}

export async function saveSettings(settings: Partial<Settings>) {
  return await settingsService.saveSettings(settings)
}

/**
 * Consolidated Finale API Service
 * This combines the best features from all Finale API implementations
 * while maintaining backward compatibility with the existing codebase
 */

import { supabase } from './supabase'
import { emailAlerts } from './email-alerts'

// Re-export all types from the main implementation
export * from './finale-api'

// Import the base implementation and extensions
import { FinaleApiService } from './finale-api'
import { OptimizedFinaleSync, SyncStrategy, type SyncOptions } from './finale-api-optimized'
import { FinaleSessionApiService } from './finale-session-api'

// Configuration types
export interface FinaleAuthConfig {
  method: 'api-key' | 'session'
  apiKey?: string
  apiSecret?: string
  username?: string
  password?: string
  accountPath: string
}

/**
 * Unified Finale API Service that supports multiple authentication methods
 * and sync strategies while maintaining the existing API surface
 */
export class UnifiedFinaleApiService {
  private service: FinaleApiService | OptimizedFinaleSync | FinaleSessionApiService
  private authMethod: 'api-key' | 'session'
  
  constructor(config: FinaleAuthConfig) {
    this.authMethod = config.method
    
    if (config.method === 'api-key' && config.apiKey && config.apiSecret) {
      // Use optimized sync which extends the base service
      this.service = new OptimizedFinaleSync({
        apiKey: config.apiKey,
        apiSecret: config.apiSecret,
        accountPath: config.accountPath
      })
    } else if (config.method === 'session' && config.username && config.password) {
      // Use session-based authentication
      this.service = new FinaleSessionApiService({
        username: config.username,
        password: config.password,
        accountPath: config.accountPath
      })
    } else {
      throw new Error('Invalid authentication configuration')
    }
  }
  
  /**
   * Test the connection to Finale API
   */
  async testConnection(): Promise<boolean> {
    if (this.service instanceof FinaleSessionApiService) {
      return await this.service.authenticate()
    }
    return await this.service.testConnection()
  }
  
  /**
   * Get inventory data with optional filtering
   */
  async getInventoryData(filterYear?: number | null) {
    if (this.service instanceof FinaleSessionApiService) {
      // Session service uses different method name
      return await this.service.getInventory()
    }
    return await this.service.getInventoryData(filterYear)
  }
  
  /**
   * Sync with strategy (only available for API key auth)
   */
  async syncWithStrategy(options: SyncOptions = {}) {
    if (this.service instanceof OptimizedFinaleSync) {
      return await this.service.syncWithStrategy(options)
    }
    throw new Error('Sync strategies are only available with API key authentication')
  }
  
  /**
   * Get vendors with smart endpoint discovery
   */
  async getVendors() {
    if ('getVendors' in this.service) {
      return await this.service.getVendors()
    }
    // Session service doesn't have vendor support
    throw new Error('Vendor operations are not available with session authentication')
  }
  
  /**
   * Create purchase order
   */
  async createPurchaseOrder(orderData: any) {
    if (this.service instanceof FinaleSessionApiService) {
      throw new Error('Purchase order creation not yet implemented for session authentication')
    }
    return await this.service.createPurchaseOrder(orderData)
  }
  
  /**
   * Import sales data from Finale report
   */
  async importSalesData(csvData: string) {
    if (this.service instanceof FinaleSessionApiService) {
      throw new Error('Sales data import not available for session authentication')
    }
    return await this.service.importSalesData(csvData)
  }
  
  /**
   * Get the underlying service instance for advanced usage
   */
  getService() {
    return this.service
  }
  
  /**
   * Check if using API key authentication
   */
  isApiKeyAuth(): boolean {
    return this.authMethod === 'api-key'
  }
  
  /**
   * Check if using session authentication
   */
  isSessionAuth(): boolean {
    return this.authMethod === 'session'
  }
}

/**
 * Factory function to create a Finale API service from settings
 */
export async function createFinaleApiService(): Promise<UnifiedFinaleApiService | null> {
  const { data: settings } = await supabase
    .from('settings')
    .select('*')
    .single()
    
  if (!settings) {
    return null
  }
  
  // Prefer API key authentication if available
  if (settings.finale_api_key && settings.finale_api_secret) {
    return new UnifiedFinaleApiService({
      method: 'api-key',
      apiKey: settings.finale_api_key,
      apiSecret: settings.finale_api_secret,
      accountPath: settings.finale_account_path
    })
  }
  
  // Fall back to session authentication if username/password are provided
  if (settings.finale_username && settings.finale_password) {
    return new UnifiedFinaleApiService({
      method: 'session',
      username: settings.finale_username,
      password: settings.finale_password,
      accountPath: settings.finale_account_path
    })
  }
  
  return null
}

/**
 * Get Finale configuration from settings (backward compatibility)
 */
export async function getFinaleConfig() {
  const { data: settings } = await supabase
    .from('settings')
    .select('finale_api_key, finale_api_secret, finale_account_path')
    .maybeSingle()

  if (!settings?.finale_api_key || !settings?.finale_api_secret || !settings?.finale_account_path) {
    return null
  }

  return {
    apiKey: settings.finale_api_key,
    apiSecret: settings.finale_api_secret,
    accountPath: settings.finale_account_path
  }
}

// Export the main service class for backward compatibility
export { FinaleApiService }

// Export optimized sync strategies
export type { SyncStrategy } from './finale-api-optimized'
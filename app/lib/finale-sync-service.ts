import { FinaleReportApiService } from './finale-report-api'
import { redis } from './redis-client'
import { supabase } from './supabase'
import { logInfo, logError, logWarn } from './logger'

interface FinaleConfig {
  apiKey: string
  apiSecret: string
  accountPath: string
  inventoryReportUrl?: string
  vendorsReportUrl?: string
}

interface SyncResult {
  success: boolean
  itemsProcessed: number
  itemsUpdated: number
  errors: string[]
  duration: number
  mode?: string
}

/**
 * Finale Sync Service - Handles syncing data from Finale to Redis and Supabase
 */
export class FinaleSyncService {
  private reportApi: FinaleReportApiService
  private config: FinaleConfig

  constructor(config: FinaleConfig) {
    this.config = config
    this.reportApi = new FinaleReportApiService({
      apiKey: config.apiKey,
      apiSecret: config.apiSecret,
      accountPath: config.accountPath
    })
  }

  /**
   * Test connection to Finale
   */
  async testConnection(): Promise<boolean> {
    try {
      // Try to fetch a small portion of inventory data
      if (this.config.inventoryReportUrl) {
        const testUrl = new URL(this.config.inventoryReportUrl)
        testUrl.searchParams.set('limit', '1')
        await this.reportApi.fetchReport(testUrl.toString())
        return true
      }
      return false
    } catch (error) {
      logError('[Finale Sync] Connection test failed:', error)
      return false
    }
  }

  /**
   * Sync inventory data from Finale to Redis and optionally to Supabase
   */
  async syncInventory(options: {
    dryRun?: boolean
    syncToSupabase?: boolean
    filterYear?: number | null
  } = {}): Promise<SyncResult> {
    const startTime = Date.now()
    const errors: string[] = []
    let itemsProcessed = 0
    let itemsUpdated = 0

    try {
      logInfo('[Finale Sync] Starting inventory sync', { options })

      // Check if inventory report URL is configured
      if (!this.config.inventoryReportUrl) {
        throw new Error('FINALE_INVENTORY_REPORT_URL not configured')
      }

      // Fetch inventory data from Finale Report API
      logInfo('[Finale Sync] Fetching inventory from Finale Report API')
      const inventoryData = await this.reportApi.fetchInventoryWithSuppliers(
        this.config.inventoryReportUrl
      )

      if (!inventoryData || inventoryData.length === 0) {
        throw new Error('No inventory data received from Finale')
      }

      logInfo(`[Finale Sync] Received ${inventoryData.length} inventory items`)

      // Apply year filter if specified
      let filteredData = inventoryData
      if (options.filterYear) {
        filteredData = inventoryData.filter(item => {
          const year = new Date(item.lastModified || item.createdDate || 0).getFullYear()
          return year >= options.filterYear!
        })
        logInfo(`[Finale Sync] Filtered to ${filteredData.length} items for year ${options.filterYear}`)
      }

      if (options.dryRun) {
        logInfo('[Finale Sync] Dry run mode - not saving data')
        return {
          success: true,
          itemsProcessed: filteredData.length,
          itemsUpdated: 0,
          errors: [],
          duration: Date.now() - startTime,
          mode: 'dry_run'
        }
      }

      // Transform data for storage
      const transformedData = filteredData.map(item => ({
        sku: item.sku || item['Product ID'] || '',
        product_name: item.productName || item['Product Name'] || '',
        stock: Number(item.totalStock || item['Units in stock'] || 0),
        location: item.locations?.[0]?.location || 'Shipping',
        reorder_point: Number(item.reorderPoint || 0),
        reorder_quantity: Number(item.reorderQuantity || 0),
        vendor: item.supplier || item['Supplier 1'] || item['Primary Supplier'] || null,
        cost: Number(item.averageCost || item.cost || 0),
        last_updated: new Date().toISOString(),
        // Include sales data if available
        sales_30_days: Number(item['Sales last 30 days'] || 0),
        sales_90_days: Number(item['Sales last 90 days'] || 0),
        on_order: Number(item.onOrder || item['On order'] || 0)
      }))

      // Store in Redis
      logInfo('[Finale Sync] Storing data in Redis')
      try {
        // Store full inventory data
        await redis.set('inventory:full', transformedData)
        
        // Store individual items for quick lookups
        for (const item of transformedData) {
          if (item.sku) {
            await redis.set(`inventory:item:${item.sku}`, item, 3600) // 1 hour TTL
          }
        }

        // Store metadata
        await redis.set('inventory:metadata', {
          lastSync: new Date().toISOString(),
          itemCount: transformedData.length,
          source: 'finale_report_api'
        })

        logInfo('[Finale Sync] Successfully stored in Redis')
        itemsUpdated = transformedData.length
      } catch (redisError) {
        logError('[Finale Sync] Redis storage failed:', redisError)
        errors.push(`Redis storage failed: ${redisError instanceof Error ? redisError.message : 'Unknown error'}`)
      }

      // Optionally sync to Supabase
      if (options.syncToSupabase) {
        logInfo('[Finale Sync] Syncing to Supabase')
        const { error: supabaseError } = await supabase
          .from('inventory_items')
          .upsert(transformedData, {
            onConflict: 'sku',
            ignoreDuplicates: false
          })

        if (supabaseError) {
          logError('[Finale Sync] Supabase sync failed:', supabaseError)
          errors.push(`Supabase sync failed: ${supabaseError.message}`)
        } else {
          logInfo('[Finale Sync] Successfully synced to Supabase')
        }
      }

      itemsProcessed = transformedData.length

      // Log sync completion
      await this.logSyncResult({
        status: errors.length === 0 ? 'success' : 'partial',
        itemsProcessed,
        itemsUpdated,
        errors,
        duration: Date.now() - startTime
      })

      return {
        success: errors.length === 0,
        itemsProcessed,
        itemsUpdated,
        errors,
        duration: Date.now() - startTime
      }

    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error'
      logError('[Finale Sync] Sync failed:', error)
      errors.push(errorMessage)

      await this.logSyncResult({
        status: 'error',
        itemsProcessed: 0,
        itemsUpdated: 0,
        errors: [errorMessage],
        duration: Date.now() - startTime
      })

      return {
        success: false,
        itemsProcessed: 0,
        itemsUpdated: 0,
        errors: [errorMessage],
        duration: Date.now() - startTime
      }
    }
  }

  /**
   * Sync vendor data from Finale to Redis
   */
  async syncVendors(options: { dryRun?: boolean } = {}): Promise<SyncResult> {
    const startTime = Date.now()
    const errors: string[] = []

    try {
      logInfo('[Finale Sync] Starting vendor sync', { options })

      // Check if vendors report URL is configured
      if (!this.config.vendorsReportUrl) {
        logWarn('[Finale Sync] FINALE_VENDORS_REPORT_URL not configured, extracting from inventory')
        
        // Extract vendors from inventory data in Redis
        const inventoryData = await redis.get<any[]>('inventory:full')
        if (!inventoryData) {
          throw new Error('No inventory data in cache to extract vendors from')
        }

        // Extract unique vendors
        const vendorMap = new Map<string, any>()
        inventoryData.forEach(item => {
          if (item.vendor && !vendorMap.has(item.vendor)) {
            vendorMap.set(item.vendor, {
              id: item.vendor.toLowerCase().replace(/\s+/g, '-'),
              name: item.vendor,
              contact_email: '',
              payment_terms: 'Net 30',
              active: true,
              created_at: new Date().toISOString(),
              updated_at: new Date().toISOString()
            })
          }
        })

        const vendors = Array.from(vendorMap.values())
        
        if (!options.dryRun) {
          await redis.set('vendors:full', vendors)
          await redis.set('vendors:metadata', {
            lastSync: new Date().toISOString(),
            vendorCount: vendors.length,
            source: 'extracted_from_inventory'
          })
        }

        return {
          success: true,
          itemsProcessed: vendors.length,
          itemsUpdated: vendors.length,
          errors: [],
          duration: Date.now() - startTime
        }
      }

      // Fetch vendor data from Finale Report API
      logInfo('[Finale Sync] Fetching vendors from Finale Report API')
      const vendorData = await this.reportApi.fetchReport(this.config.vendorsReportUrl)

      if (options.dryRun) {
        return {
          success: true,
          itemsProcessed: vendorData.length,
          itemsUpdated: 0,
          errors: [],
          duration: Date.now() - startTime,
          mode: 'dry_run'
        }
      }

      // Transform and store vendor data
      const transformedVendors = vendorData.map(vendor => ({
        id: (vendor['Vendor ID'] || vendor['ID'] || vendor.name || '').toLowerCase().replace(/\s+/g, '-'),
        name: vendor['Vendor Name'] || vendor['Name'] || vendor.name || '',
        contact_email: vendor['Email'] || vendor.email || '',
        payment_terms: vendor['Payment Terms'] || 'Net 30',
        active: vendor.active !== false,
        created_at: vendor.createdDate || new Date().toISOString(),
        updated_at: new Date().toISOString()
      }))

      // Store in Redis
      await redis.set('vendors:full', transformedVendors)
      await redis.set('vendors:metadata', {
        lastSync: new Date().toISOString(),
        vendorCount: transformedVendors.length,
        source: 'finale_report_api'
      })

      return {
        success: true,
        itemsProcessed: transformedVendors.length,
        itemsUpdated: transformedVendors.length,
        errors: [],
        duration: Date.now() - startTime
      }

    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error'
      logError('[Finale Sync] Vendor sync failed:', error)
      return {
        success: false,
        itemsProcessed: 0,
        itemsUpdated: 0,
        errors: [errorMessage],
        duration: Date.now() - startTime
      }
    }
  }

  /**
   * Log sync result to database
   */
  private async logSyncResult(result: {
    status: string
    itemsProcessed: number
    itemsUpdated: number
    errors: string[]
    duration: number
  }) {
    try {
      await supabase
        .from('sync_logs')
        .insert({
          sync_type: 'finale_inventory',
          status: result.status,
          synced_at: new Date().toISOString(),
          items_processed: result.itemsProcessed,
          items_updated: result.itemsUpdated,
          errors: result.errors,
          duration_ms: result.duration,
          metadata: {
            source: 'finale_report_api',
            timestamp: new Date().toISOString()
          }
        })
    } catch (error) {
      logError('[Finale Sync] Failed to log sync result:', error)
    }
  }
}

/**
 * Get Finale configuration from environment or database
 */
export async function getFinaleConfig(): Promise<FinaleConfig | null> {
  try {
    // First try environment variables
    const apiKey = process.env.FINALE_API_KEY
    const apiSecret = process.env.FINALE_API_SECRET
    const accountPath = process.env.FINALE_ACCOUNT_PATH || 'buildasoilorganics'
    const inventoryReportUrl = process.env.FINALE_INVENTORY_REPORT_URL
    const vendorsReportUrl = process.env.FINALE_VENDORS_REPORT_URL

    if (apiKey && apiSecret) {
      return {
        apiKey,
        apiSecret,
        accountPath,
        inventoryReportUrl,
        vendorsReportUrl
      }
    }

    // Fall back to database settings
    const { data: settings } = await supabase
      .from('settings')
      .select('finale_api_key, finale_api_secret, finale_account_path')
      .single()

    if (settings?.finale_api_key && settings?.finale_api_secret) {
      return {
        apiKey: settings.finale_api_key,
        apiSecret: settings.finale_api_secret,
        accountPath: settings.finale_account_path || accountPath,
        inventoryReportUrl,
        vendorsReportUrl
      }
    }

    return null
  } catch (error) {
    logError('[Finale Config] Failed to get configuration:', error)
    return null
  }
}
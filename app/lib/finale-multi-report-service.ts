import { FinaleReportApiService } from './finale-report-api'
import { getFinaleConfig } from './finale-api'
import { redis } from './redis-client'

// Cache keys for different report types
const CACHE_KEYS = {
  INVENTORY: 'finale:inventory',
  CONSUMPTION_14: 'finale:consumption:14day',
  CONSUMPTION_30: 'finale:consumption:30day',
  STOCK_DETAIL: 'finale:stock_detail',
  PURCHASE_ORDERS: 'finale:purchase_orders',
  COMBINED_METRICS: 'finale:combined_metrics',
  LAST_SYNC: 'finale:last_sync',
  SYNC_STATUS: 'finale:sync_status'
} as const

// Cache TTL (in seconds)
const CACHE_TTL = {
  INVENTORY: 900, // 15 minutes
  CONSUMPTION: 1800, // 30 minutes (changes less frequently)
  METRICS: 300, // 5 minutes
  SYNC_STATUS: 60 // 1 minute
} as const

export interface FinaleReportConfig {
  inventory_report_url?: string
  consumption_14day_report_url?: string
  consumption_30day_report_url?: string
  stock_report_url?: string
  purchase_orders_report_url?: string
}

export interface EnhancedInventoryItem {
  sku: string
  product_name: string
  vendor: string | null
  current_stock: number
  cost: number
  location: string
  
  // Stock details
  units_on_hand: number
  units_packed: number
  units_in_transit: number
  units_wip: number
  units_available: number // on_hand - packed
  total_pipeline: number // on_hand + packed + transit + wip
  
  // Sales data
  sales_last_30_days: number
  sales_last_90_days: number
  sales_velocity: number // units per day
  
  // Consumption data
  consumed_last_14_days: number
  consumed_last_30_days: number
  consumption_velocity: number // units per day
  
  // Combined metrics
  total_velocity: number // sales + consumption
  days_until_stockout: number
  true_reorder_point: number
  stock_status: 'critical' | 'low' | 'adequate' | 'overstocked'
  
  // Metadata
  last_updated: string
  finale_id: string
  is_manufactured: boolean
  is_consumed: boolean
  standard_packaging?: string
}

export interface ConsumptionData {
  sku: string
  supplier: string | null
  quantity_consumed: number
  period_days: number
}

export interface StockData {
  sku: string
  supplier: string | null
  units_on_hand: number
  units_packed: number
  units_in_transit: number
  units_wip: number
  standard_packaging?: string
  location?: string
}

export interface CombinedMetrics {
  total_items: number
  total_inventory_value: number
  items_with_sales: number
  items_with_consumption: number
  items_with_both: number
  critical_items: number
  vendors_count: number
  avg_sales_velocity: number
  avg_consumption_velocity: number
  last_sync: string | null
}

/**
 * Multi-Report Finale Service
 * Combines inventory, consumption, and purchase order data
 */
export class FinaleMultiReportService {
  private reportApi: FinaleReportApiService | null = null
  
  /**
   * Initialize the service
   */
  private async initialize() {
    if (!this.reportApi) {
      const config = await getFinaleConfig()
      if (!config) {
        throw new Error('Finale API credentials not configured')
      }
      
      this.reportApi = new FinaleReportApiService({
        apiKey: config.apiKey,
        apiSecret: config.apiSecret,
        accountPath: config.accountPath
      })
    }
  }
  
  /**
   * Get combined inventory data with sales and consumption metrics
   */
  async getCombinedInventory(forceRefresh = false): Promise<EnhancedInventoryItem[]> {
    try {
      // Check cache first
      if (!forceRefresh) {
        try {
          const cached = await redis.get<EnhancedInventoryItem[]>(CACHE_KEYS.COMBINED_METRICS)
          if (cached) {
            console.log('[Multi-Report] Serving from cache')
            return cached
          }
        } catch (error) {
          console.log('[Multi-Report] Cache check failed:', error)
        }
      }
      
      // Fetch fresh data
      console.log('[Multi-Report] Cache miss or force refresh, fetching all reports...')
      return await this.refreshAllData()
    } catch (error) {
      console.error('[Multi-Report] Error getting combined inventory:', error)
      
      // Try to return stale cache if available
      try {
        const stale = await redis.get<EnhancedInventoryItem[]>(CACHE_KEYS.COMBINED_METRICS)
        if (stale) {
          console.log('[Multi-Report] Returning stale cache due to error')
          return stale
        }
      } catch (cacheError) {
        console.log('[Multi-Report] Stale cache check failed:', cacheError)
      }
      throw error
    }
  }
  
  /**
   * Refresh all data from multiple reports
   */
  private async refreshAllData(): Promise<EnhancedInventoryItem[]> {
    await this.initialize()
    
    // Set sync status
    try {
      await redis.setex(CACHE_KEYS.SYNC_STATUS, CACHE_TTL.SYNC_STATUS, { is_syncing: true })
    } catch (error) {
      console.log('[Multi-Report] Failed to set sync status:', error)
    }
    
    try {
      // Get report URLs from settings
      const settings = await this.getReportSettings()
      
      // Fetch all reports in parallel
      const [inventoryData, consumption14Data, consumption30Data, stockData] = await Promise.all([
        this.fetchInventoryReport(settings.inventory_report_url),
        this.fetchConsumptionReport(settings.consumption_14day_report_url, 14),
        this.fetchConsumptionReport(settings.consumption_30day_report_url, 30),
        this.fetchStockReport(settings.stock_report_url)
      ])
      
      // Create lookup maps
      const consumption14Map = new Map<string, ConsumptionData>()
      const consumption30Map = new Map<string, ConsumptionData>()
      const stockMap = new Map<string, StockData>()
      
      consumption14Data.forEach(item => {
        consumption14Map.set(item.sku, item)
      })
      
      consumption30Data.forEach(item => {
        consumption30Map.set(item.sku, item)
      })
      
      stockData.forEach(item => {
        stockMap.set(item.sku, item)
      })
      
      // Combine all data
      const enhancedInventory: EnhancedInventoryItem[] = inventoryData.map(item => {
        const consumption14 = consumption14Map.get(item.sku)
        const consumption30 = consumption30Map.get(item.sku)
        const stock = stockMap.get(item.sku)
        
        // Stock details with defaults
        const unitsOnHand = stock?.units_on_hand || item.current_stock
        const unitsPacked = stock?.units_packed || 0
        const unitsInTransit = stock?.units_in_transit || 0
        const unitsWip = stock?.units_wip || 0
        const unitsAvailable = unitsOnHand - unitsPacked
        const totalPipeline = unitsOnHand + unitsPacked + unitsInTransit + unitsWip
        
        // Calculate velocities
        const salesVelocity = item.sales_last_30_days / 30
        const consumptionVelocity14 = consumption14 ? consumption14.quantity_consumed / 14 : 0
        const consumptionVelocity30 = consumption30 ? consumption30.quantity_consumed / 30 : 0
        const consumptionVelocity = Math.max(consumptionVelocity14, consumptionVelocity30)
        const totalVelocity = salesVelocity + consumptionVelocity
        
        // Calculate days until stockout based on available units (not packed)
        const daysUntilStockout = totalVelocity > 0 ? unitsAvailable / totalVelocity : 999
        
        // Calculate true reorder point (considering both sales and consumption)
        const trueReorderPoint = totalVelocity * 30 // 30-day buffer
        
        // Determine stock status based on available units
        let stockStatus: 'critical' | 'low' | 'adequate' | 'overstocked' = 'adequate'
        if (unitsAvailable === 0) {
          stockStatus = 'critical'
        } else if (daysUntilStockout <= 7) {
          stockStatus = 'critical'
        } else if (daysUntilStockout <= 30 || unitsAvailable <= trueReorderPoint) {
          stockStatus = 'low'
        } else if (daysUntilStockout > 180) {
          stockStatus = 'overstocked'
        }
        
        return {
          sku: item.sku,
          product_name: item.product_name,
          vendor: item.vendor || stock?.supplier || null,
          current_stock: unitsOnHand,
          cost: item.cost,
          location: stock?.location || item.location,
          
          // Stock details
          units_on_hand: unitsOnHand,
          units_packed: unitsPacked,
          units_in_transit: unitsInTransit,
          units_wip: unitsWip,
          units_available: unitsAvailable,
          total_pipeline: totalPipeline,
          
          // Sales data
          sales_last_30_days: item.sales_last_30_days,
          sales_last_90_days: item.sales_last_90_days,
          sales_velocity: salesVelocity,
          
          // Consumption data
          consumed_last_14_days: consumption14?.quantity_consumed || 0,
          consumed_last_30_days: consumption30?.quantity_consumed || 0,
          consumption_velocity: consumptionVelocity,
          
          // Combined metrics
          total_velocity: totalVelocity,
          days_until_stockout: Math.round(daysUntilStockout),
          true_reorder_point: Math.round(trueReorderPoint),
          stock_status: stockStatus,
          
          // Metadata
          last_updated: new Date().toISOString(),
          finale_id: item.finale_id,
          is_manufactured: false, // TODO: Determine from product data
          is_consumed: consumption30 !== undefined,
          standard_packaging: stock?.standard_packaging
        }
      })
      
      // Cache all data
      try {
        await Promise.all([
          redis.setex(CACHE_KEYS.INVENTORY, CACHE_TTL.INVENTORY, inventoryData),
          redis.setex(CACHE_KEYS.CONSUMPTION_14, CACHE_TTL.CONSUMPTION, consumption14Data),
          redis.setex(CACHE_KEYS.CONSUMPTION_30, CACHE_TTL.CONSUMPTION, consumption30Data),
          redis.setex(CACHE_KEYS.STOCK_DETAIL, CACHE_TTL.INVENTORY, stockData),
          redis.setex(CACHE_KEYS.COMBINED_METRICS, CACHE_TTL.METRICS, enhancedInventory),
          redis.set(CACHE_KEYS.LAST_SYNC, new Date().toISOString())
        ])
        
        // Clear sync status
        await redis.del(CACHE_KEYS.SYNC_STATUS)
      } catch (error) {
        console.log('[Multi-Report] Failed to cache data:', error)
      }
      
      console.log(`[Multi-Report] Cached ${enhancedInventory.length} items with combined metrics`)
      
      return enhancedInventory
      
    } catch (error) {
      try {
        await redis.del(CACHE_KEYS.SYNC_STATUS)
      } catch (redisError) {
        console.log('[Multi-Report] Failed to clear sync status:', redisError)
      }
      throw error
    }
  }
  
  /**
   * Fetch inventory report
   */
  private async fetchInventoryReport(reportUrl?: string): Promise<any[]> {
    if (!reportUrl) {
      console.warn('[Multi-Report] No inventory report URL configured')
      return []
    }
    
    try {
      const data = await this.reportApi!.fetchInventoryWithSuppliers(reportUrl)
      return data.map(item => ({
        sku: item.sku || item['Product ID'],
        product_name: item.productName || item['Product Name'] || '',
        vendor: item.supplier || item['Supplier 1'] || null,
        current_stock: Number(item.totalStock || item['Units in stock'] || 0),
        cost: Number(item.cost || 0),
        location: item.location || 'Main',
        sales_last_30_days: Number(item['Sales last 30 days'] || 0),
        sales_last_90_days: Number(item['Sales last 90 days'] || 0),
        finale_id: item.sku || item['Product ID']
      }))
    } catch (error) {
      console.error('[Multi-Report] Error fetching inventory report:', error)
      throw error
    }
  }
  
  /**
   * Fetch consumption report
   */
  private async fetchConsumptionReport(reportUrl?: string, periodDays: number): Promise<ConsumptionData[]> {
    if (!reportUrl) {
      console.warn(`[Multi-Report] No ${periodDays}-day consumption report URL configured`)
      return []
    }
    
    try {
      const rows = await this.reportApi!.fetchReport(reportUrl, 'jsonObject')
      
      // Group by Product ID and sum quantities
      const consumptionMap = new Map<string, ConsumptionData>()
      
      rows.forEach(row => {
        const sku = row['Product ID']
        if (sku) {
          const existing = consumptionMap.get(sku)
          const quantity = Number(row['Quantity\nsum'] || row['Quantity'] || 0)
          
          if (existing) {
            existing.quantity_consumed += quantity
          } else {
            consumptionMap.set(sku, {
              sku,
              supplier: row['Supplier 1'] || null,
              quantity_consumed: quantity,
              period_days: periodDays
            })
          }
        }
      })
      
      const consumptionData = Array.from(consumptionMap.values())
      console.log(`[Multi-Report] Processed ${consumptionData.length} products from ${periodDays}-day consumption`)
      
      return consumptionData
    } catch (error) {
      console.error(`[Multi-Report] Error fetching ${periodDays}-day consumption:`, error)
      return []
    }
  }
  
  /**
   * Fetch stock detail report
   */
  private async fetchStockReport(reportUrl?: string): Promise<StockData[]> {
    if (!reportUrl) {
      console.warn('[Multi-Report] No stock report URL configured')
      return []
    }
    
    try {
      const rows = await this.reportApi!.fetchReport(reportUrl, 'jsonObject')
      
      // Process stock data
      const stockMap = new Map<string, StockData>()
      
      rows.forEach(row => {
        const sku = row['Product ID']
        if (sku) {
          const existing = stockMap.get(sku)
          
          // Parse numeric values safely
          const onHand = Number(row['Units\nQoH'] || row['Units QoH'] || 0)
          const packed = Number(row['Units\nPacked'] || row['Units Packed'] || 0)
          const transit = Number(row['Units\nTransit'] || row['Units Transit'] || 0)
          const wip = Number(row['Units\nWIP'] || row['Units WIP'] || 0)
          
          if (existing) {
            // Aggregate if multiple locations
            existing.units_on_hand += onHand
            existing.units_packed += packed
            existing.units_in_transit += transit
            existing.units_wip += wip
          } else {
            stockMap.set(sku, {
              sku,
              supplier: row['Supplier 1'] || null,
              units_on_hand: onHand,
              units_packed: packed,
              units_in_transit: transit,
              units_wip: wip,
              standard_packaging: row['Std\nPkng'] || row['Std Pkng'] || undefined,
              location: row['Location'] || undefined
            })
          }
        }
      })
      
      const stockData = Array.from(stockMap.values())
      console.log(`[Multi-Report] Processed ${stockData.length} products from stock report`)
      
      return stockData
    } catch (error) {
      console.error('[Multi-Report] Error fetching stock report:', error)
      return []
    }
  }
  
  /**
   * Get combined metrics summary
   */
  async getMetricsSummary(): Promise<CombinedMetrics> {
    const inventory = await this.getCombinedInventory()
    
    const summary: CombinedMetrics = {
      total_items: inventory.length,
      total_inventory_value: inventory.reduce((sum, item) => 
        sum + (item.current_stock * item.cost), 0
      ),
      items_with_sales: inventory.filter(item => item.sales_velocity > 0).length,
      items_with_consumption: inventory.filter(item => item.consumption_velocity > 0).length,
      items_with_both: inventory.filter(item => 
        item.sales_velocity > 0 && item.consumption_velocity > 0
      ).length,
      critical_items: inventory.filter(item => item.stock_status === 'critical').length,
      vendors_count: new Set(inventory.map(item => item.vendor).filter(Boolean)).size,
      avg_sales_velocity: inventory.reduce((sum, item) => sum + item.sales_velocity, 0) / inventory.length,
      avg_consumption_velocity: inventory.reduce((sum, item) => sum + item.consumption_velocity, 0) / inventory.length,
      last_sync: await redis.get<string>(CACHE_KEYS.LAST_SYNC).catch(() => null)
    }
    
    return summary
  }
  
  /**
   * Get report settings
   */
  private async getReportSettings(): Promise<FinaleReportConfig> {
    try {
      // Try Redis settings service first
      const { redisSettingsService } = await import('./redis-settings-service')
      const reportUrls = await redisSettingsService.getReportUrls()
      
      if (reportUrls.inventory || reportUrls.consumption14 || reportUrls.consumption30 || reportUrls.stock) {
        console.log('[Multi-Report] Using report URLs from Redis settings')
        return {
          inventory_report_url: reportUrls.inventory,
          consumption_14day_report_url: reportUrls.consumption14,
          consumption_30day_report_url: reportUrls.consumption30,
          stock_report_url: reportUrls.stock,
          purchase_orders_report_url: reportUrls.purchaseOrders
        }
      }
    } catch (error) {
      console.log('[Multi-Report] Redis settings not available, falling back to Supabase')
    }
    
    // Fallback to Supabase settings
    const { supabase } = await import('./supabase')
    const { data: settings } = await supabase
      .from('settings')
      .select('finale_inventory_report_url, finale_consumption_14day_url, finale_consumption_30day_url, finale_stock_report_url')
      .limit(1)
      .maybeSingle()
    
    if (settings) {
      console.log('[Multi-Report] Using report URLs from Supabase settings')
      return {
        inventory_report_url: settings.finale_inventory_report_url,
        consumption_14day_report_url: settings.finale_consumption_14day_url,
        consumption_30day_report_url: settings.finale_consumption_30day_url,
        stock_report_url: settings.finale_stock_report_url,
        purchase_orders_report_url: undefined
      }
    }
    
    return {}
  }
  
  /**
   * Clear all caches
   */
  async clearCache(): Promise<void> {
    console.log('[Multi-Report] Clearing all caches...')
    
    try {
      await redis.del([
        CACHE_KEYS.INVENTORY,
        CACHE_KEYS.CONSUMPTION_14,
        CACHE_KEYS.CONSUMPTION_30,
        CACHE_KEYS.STOCK_DETAIL,
        CACHE_KEYS.PURCHASE_ORDERS,
        CACHE_KEYS.COMBINED_METRICS,
        CACHE_KEYS.LAST_SYNC,
        CACHE_KEYS.SYNC_STATUS
      ])
      
      console.log('[Multi-Report] Cache cleared')
    } catch (error) {
      console.log('[Multi-Report] Failed to clear cache:', error)
    }
  }
}

// Export singleton instance
export const finaleMultiReportService = new FinaleMultiReportService()
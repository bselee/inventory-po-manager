import { FinaleReportApiService } from './finale-report-api'
import { supabase } from './supabase'

/**
 * Hybrid Inventory Data Service
 * Uses Finale Reporting API as primary source with Supabase as cache/fallback
 */
export class HybridInventoryService {
  private reportApi: FinaleReportApiService
  private cacheTimeout = 5 * 60 * 1000 // 5 minutes

  constructor(config: any) {
    this.reportApi = new FinaleReportApiService(config)
  }

  /**
   * Get inventory data with intelligent caching
   */
  async getInventoryData(reportUrl?: string): Promise<any[]> {
    try {
      // Strategy 1: Use Reporting API if URL is configured
      if (reportUrl) {
        console.log('[Hybrid Service] Using Finale Reporting API')
        const data = await this.fetchFromReportingAPI(reportUrl)
        
        // Cache the results in Supabase for faster subsequent loads
        await this.cacheInventoryData(data)
        return data
      }

      // Strategy 2: Fallback to cached Supabase data
      console.log('[Hybrid Service] Using cached Supabase data')
      return await this.fetchFromCache()

    } catch (error) {
      console.error('[Hybrid Service] Reporting API failed, trying cache:', error)
      
      // Strategy 3: Fallback to cache if API fails
      const cachedData = await this.fetchFromCache()
      if (cachedData.length > 0) {
        return cachedData
      }
      
      throw error
    }
  }

  /**
   * Fetch from Finale Reporting API with vendor data
   */
  private async fetchFromReportingAPI(reportUrl: string): Promise<any[]> {
    const rawData = await this.reportApi.fetchInventoryWithSuppliers(reportUrl)
    
    // Transform to standardized format
    return rawData.map(item => ({
      id: item['Product ID'] || item.id,
      sku: item['Product ID'] || item.sku,
      product_name: item['Product Name'] || item.name,
      current_stock: this.parseNumber(item['Available Stock'] || item.stock),
      cost: this.parseNumber(item['Cost'] || item.cost),
      vendor: item['Supplier'] || item['Vendor'] || item.vendor,
      location: item['Location'] || item.location,
      // Additional fields from report
      reorder_point: this.parseNumber(item['Reorder Point']),
      max_stock: this.parseNumber(item['Max Stock']),
      last_updated: new Date().toISOString(),
      data_source: 'finale_report',
      // Store original data for flexibility
      finale_data: item
    }))
  }

  /**
   * Cache inventory data in Supabase
   */
  private async cacheInventoryData(data: any[]): Promise<void> {
    try {
      // Clear existing cache
      await supabase.from('inventory_cache').delete().neq('id', '')
      
      // Insert fresh data
      const cacheData = data.map(item => ({
        ...item,
        cached_at: new Date().toISOString()
      }))
      
      await supabase.from('inventory_cache').insert(cacheData)
      console.log(`[Hybrid Service] Cached ${data.length} items`)
    } catch (error) {
      console.warn('[Hybrid Service] Failed to cache data:', error)
      // Don't throw - caching failure shouldn't break the main flow
    }
  }

  /**
   * Fetch from Supabase cache
   */
  private async fetchFromCache(): Promise<any[]> {
    const { data, error } = await supabase
      .from('inventory_cache')
      .select('*')
      .order('cached_at', { ascending: false })

    if (error) throw error
    
    // Check if cache is fresh
    if (data.length > 0) {
      const cacheAge = Date.now() - new Date(data[0].cached_at).getTime()
      if (cacheAge > this.cacheTimeout) {
        console.warn('[Hybrid Service] Cache is stale, data may be outdated')
      }
    }
    
    return data || []
  }

  /**
   * Get data freshness information
   */
  async getDataFreshness(): Promise<{
    source: 'finale_report' | 'cache' | 'unknown'
    lastUpdated: string | null
    age: number
    isStale: boolean
  }> {
    const { data } = await supabase
      .from('inventory_cache')
      .select('cached_at')
      .order('cached_at', { ascending: false })
      .limit(1)

    if (!data || data.length === 0) {
      return {
        source: 'unknown',
        lastUpdated: null,
        age: 0,
        isStale: true
      }
    }

    const lastUpdated = data[0].cached_at
    const age = Date.now() - new Date(lastUpdated).getTime()
    
    return {
      source: age < this.cacheTimeout ? 'finale_report' : 'cache',
      lastUpdated,
      age,
      isStale: age > this.cacheTimeout
    }
  }

  private parseNumber(value: any): number {
    if (typeof value === 'number') return value
    if (typeof value === 'string') {
      const parsed = parseFloat(value.replace(/[^0-9.-]/g, ''))
      return isNaN(parsed) ? 0 : parsed
    }
    return 0
  }
}

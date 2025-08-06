import { redis } from './redis-client';
import { FinaleReportApiService } from './finale-report-api';

interface CachedInventoryItem {
  sku: string;
  name: string;
  vendor: string;
  stock: number;
  cost: number;
  location: string;
  reorderPoint: number;
  maxStock: number;
  lastUpdated: string;
  dataSource: 'finale_report';
}

interface CacheMetrics {
  totalItems: number;
  lastFetch: string;
  cacheHits: number;
  cacheMisses: number;
  apiCalls: number;
}

export class FinaleCacheService {
  private static instance: FinaleCacheService;
  private reportApi: FinaleReportApiService;
  private metrics: CacheMetrics = {
    totalItems: 0,
    lastFetch: '',
    cacheHits: 0,
    cacheMisses: 0,
    apiCalls: 0
  };

  private constructor() {
    const config = {
      apiKey: process.env.FINALE_API_KEY || '',
      apiSecret: process.env.FINALE_API_SECRET || '',
      accountPath: process.env.FINALE_ACCOUNT_PATH || '',
      reportUrl: process.env.FINALE_REPORT_URL || ''
    };
    this.reportApi = new FinaleReportApiService(config);
  }

  static getInstance(): FinaleCacheService {
    if (!FinaleCacheService.instance) {
      FinaleCacheService.instance = new FinaleCacheService();
    }
    return FinaleCacheService.instance;
  }

  /**
   * Get full inventory data with cache-first approach
   */
  async getInventoryData(options: {
    forceRefresh?: boolean;
    ttlMinutes?: number;
  } = {}): Promise<CachedInventoryItem[]> {
    const { forceRefresh = false, ttlMinutes = 15 } = options;
    const cacheKey = 'inventory:full';

    try {
      // Check cache first unless force refresh
      if (!forceRefresh) {
        const cached = await redis.get<CachedInventoryItem[]>(cacheKey);
        if (cached && Array.isArray(cached)) {
          this.metrics.cacheHits++;
          return cached;
        }
      }

      // Cache miss or force refresh - fetch from Finale
      this.metrics.cacheMisses++;
      this.metrics.apiCalls++;
      const reportUrl = await this.getReportUrl();
      const freshData = await this.reportApi.fetchInventoryWithSuppliers(reportUrl);

      // Transform to simplified cache format
      const simplified = this.transformToCache(freshData);

      // Store in cache with TTL
      const ttlSeconds = ttlMinutes * 60;
      await redis.set(cacheKey, simplified, ttlSeconds);

      // Update metrics
      this.metrics.totalItems = simplified.length;
      this.metrics.lastFetch = new Date().toISOString();
      await redis.set('inventory:metrics', this.metrics, 86400); // 24h
      return simplified;

    } catch (error) {
      logError('❌ Error in getInventoryData:', error);
      
      // Try to return stale cache as fallback
      const staleCache = await redis.get<CachedInventoryItem[]>(cacheKey);
      if (staleCache && Array.isArray(staleCache)) {
        return staleCache;
      }

      throw new Error(`Failed to fetch inventory data: ${error}`);
    }
  }

  /**
   * Search inventory with cache optimization
   */
  async searchInventory(
    query: string, 
    options: { fields?: string[]; maxResults?: number } = {}
  ): Promise<CachedInventoryItem[]> {
    const { fields = [], maxResults = 100 } = options;
    
    // Get cached data first
    const allItems = await this.getInventoryData();
    
    if (!query.trim()) {
      return allItems.slice(0, maxResults);
    }

    const searchTerm = query.toLowerCase();
    const filtered = allItems.filter(item => {
      return item.sku.toLowerCase().includes(searchTerm) ||
             item.name.toLowerCase().includes(searchTerm) ||
             item.vendor.toLowerCase().includes(searchTerm);
    });

    return filtered.slice(0, maxResults);
  }

  /**
   * Get inventory by vendor with caching
   */
  async getInventoryByVendor(vendor: string): Promise<CachedInventoryItem[]> {
    const allItems = await this.getInventoryData();
    return allItems.filter(item => 
      item.vendor.toLowerCase().includes(vendor.toLowerCase())
    );
  }

  /**
   * Get low stock items with caching
   */
  async getLowStockItems(): Promise<CachedInventoryItem[]> {
    const allItems = await this.getInventoryData();
    return allItems.filter(item => 
      item.stock <= item.reorderPoint && item.reorderPoint > 0
    );
  }

  /**
   * Clear cache manually
   */
  async clearCache(): Promise<void> {
    await redis.del('inventory:full');
  }

  /**
   * Get cache metrics and health
   */
  async getCacheMetrics(): Promise<CacheMetrics & { cacheExists: boolean; cacheAge?: string }> {
    const cachedMetrics = await redis.get<CacheMetrics>('inventory:metrics');
    const currentMetrics = cachedMetrics || this.metrics;
    
    const cacheExists = await redis.exists('inventory:full');
    let cacheAge;
    
    if (cacheExists && currentMetrics.lastFetch) {
      const ageMs = Date.now() - new Date(currentMetrics.lastFetch).getTime();
      const ageMinutes = Math.floor(ageMs / (1000 * 60));
      cacheAge = `${ageMinutes} minutes ago`;
    }

    return {
      ...currentMetrics,
      cacheExists,
      cacheAge
    };
  }

  /**
   * Health check for cache service
   */
  async healthCheck(): Promise<{
    cache: 'healthy' | 'degraded' | 'down';
    api: 'healthy' | 'degraded' | 'down';
    metrics: CacheMetrics;
  }> {
    const metrics = await this.getCacheMetrics();
    
    let cacheStatus: 'healthy' | 'degraded' | 'down' = 'healthy';
    let apiStatus: 'healthy' | 'degraded' | 'down' = 'healthy';

    // Check cache health
    if (!metrics.cacheExists) {
      cacheStatus = 'down';
    } else if (metrics.cacheAge && metrics.cacheAge.includes('hour')) {
      cacheStatus = 'degraded';
    }

    // Check API health with a quick test
    try {
      const reportUrl = await this.getReportUrl();
      if (!reportUrl) {
        apiStatus = 'down';
      }
    } catch (error) {
      apiStatus = 'down';
    }

    return {
      cache: cacheStatus,
      api: apiStatus,
      metrics
    };
  }

  /**
   * Warm up cache (useful for cron jobs)
   */
  async warmUpCache(): Promise<void> {
    await this.getInventoryData({ forceRefresh: true });
  }

  /**
   * Transform Finale data to cache format
   */
  private transformToCache(data: any[]): CachedInventoryItem[] {
    return data.map(item => ({
      sku: item.sku || '',
      name: item.productName || item.product_name || '',
      vendor: item.supplier || item.vendor || 'Unknown',
      stock: parseInt(item.totalStock || item.current_stock || '0'),
      cost: parseFloat(item.cost || item.unit_cost || '0'),
      location: item.location || 'Main',
      reorderPoint: parseInt(item.reorderPoint || item.reorder_point || '0'),
      maxStock: parseInt(item.maxStock || item.max_stock || '0'),
      lastUpdated: new Date().toISOString(),
      dataSource: 'finale_report'
    }));
  }

  /**
   * Get report URL from settings or environment
   */
  private async getReportUrl(): Promise<string> {
    // First try to get from environment
    if (process.env.FINALE_REPORT_URL) {
      return process.env.FINALE_REPORT_URL;
    }

    // Fallback to settings API (you'll need to implement this)
    try {
      const response = await fetch('/api/settings/finale-report-url');
      if (response.ok) {
        const { reportUrl } = await response.json();
        return reportUrl;
      }
    } catch (error) {
      logWarn('Could not fetch report URL from settings');
    }

    throw new Error('Finale Report URL not configured');
  }
}

// Export singleton instance
export const finaleCacheService = FinaleCacheService.getInstance();

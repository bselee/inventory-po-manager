// Finale Reporting API Integration
import { FinaleApiConfig } from './finale-api'

interface ReportOptions {
  format?: 'csv' | 'jsonObject' | 'pdf'
  filters?: Record<string, any>
  metrics?: string[]
  dimensions?: string[]
  dateRange?: {
    start: Date
    end: Date
  }
}

export class FinaleReportingService {
  private config: FinaleApiConfig
  private baseUrl: string
  private authHeader: string

  constructor(config: FinaleApiConfig) {
    this.config = config
    this.baseUrl = `https://app.finaleinventory.com/${config.accountPath}/doc/report`
    
    const authString = Buffer.from(`${config.apiKey}:${config.apiSecret}`).toString('base64')
    this.authHeader = `Basic ${authString}`
  }

  // Get low stock report
  async getLowStockReport(threshold: number = 10): Promise<any> {
    const filters = {
      quantityOnHand: { $lte: threshold },
      active: true
    }
    
    return this.getReport('inventory_status', {
      format: 'jsonObject',
      filters,
      metrics: ['quantityOnHand', 'quantityReserved', 'reorderPoint'],
      dimensions: ['productId', 'productName', 'facilityName']
    })
  }

  // Get sales velocity report
  async getSalesVelocityReport(days: number = 30): Promise<any> {
    const endDate = new Date()
    const startDate = new Date()
    startDate.setDate(startDate.getDate() - days)
    
    return this.getReport('sales_by_product', {
      format: 'jsonObject',
      dateRange: { start: startDate, end: endDate },
      metrics: ['quantitySold', 'revenue', 'averagePrice'],
      dimensions: ['productId', 'productName']
    })
  }

  // Get inventory valuation report
  async getInventoryValuation(): Promise<any> {
    return this.getReport('inventory_valuation', {
      format: 'jsonObject',
      metrics: ['quantityOnHand', 'averageCost', 'totalValue'],
      dimensions: ['productId', 'productName', 'categoryName']
    })
  }

  // Get reorder suggestions
  async getReorderSuggestions(): Promise<any> {
    // Products below reorder point
    const filters = {
      $expr: { $lt: ['$quantityOnHand', '$reorderPoint'] },
      active: true
    }
    
    return this.getReport('reorder_report', {
      format: 'jsonObject',
      filters,
      metrics: ['quantityOnHand', 'reorderPoint', 'reorderQuantity', 'quantityOnOrder'],
      dimensions: ['productId', 'productName', 'primarySupplierName']
    })
  }

  // Generic report fetcher
  private async getReport(reportId: string, options: ReportOptions): Promise<any> {
    try {
      // Build URL with parameters
      const params = new URLSearchParams()
      params.append('format', options.format || 'jsonObject')
      
      if (options.filters) {
        params.append('filters', Buffer.from(JSON.stringify(options.filters)).toString('base64'))
      }
      
      if (options.metrics) {
        params.append('metrics', options.metrics.join(','))
      }
      
      if (options.dimensions) {
        params.append('rowDimensions', options.dimensions.join(','))
      }

      const url = `${this.baseUrl}/pivotTable/${reportId}/report?${params}`
      
      const response = await fetch(url, {
        headers: {
          'Authorization': this.authHeader,
          'Accept': 'application/json'
        }
      })

      if (!response.ok) {
        throw new Error(`Report API error: ${response.status}`)
      }

      const data = await response.json()
      
      // Transform the pivot table format to something more usable
      return this.transformReportData(data)
    } catch (error) {
      console.error(`Error fetching report ${reportId}:`, error)
      throw error
    }
  }

  // Transform Finale's pivot table format to regular objects
  private transformReportData(data: any): any[] {
    if (!data.rows || !data.columns) {
      return []
    }

    const results = []
    const columns = data.columns

    for (const row of data.rows) {
      const item: any = {}
      
      columns.forEach((col: string, index: number) => {
        item[col] = row[index]
      })
      
      results.push(item)
    }

    return results
  }
}

// Integration with existing sync system
export async function syncWithReports(config: FinaleApiConfig) {
  const reporting = new FinaleReportingService(config)
  
  // 1. Get low stock items for priority sync
  const lowStock = await reporting.getLowStockReport(20)
  console.log(`Found ${lowStock.length} low stock items`)
  
  // 2. Get fast-moving items
  const salesVelocity = await reporting.getSalesVelocityReport(30)
  const fastMovers = salesVelocity
    .sort((a, b) => b.quantitySold - a.quantitySold)
    .slice(0, 100) // Top 100 fast movers
  
  // 3. Combine for smart sync
  const prioritySKUs = new Set([
    ...lowStock.map(i => i.productId),
    ...fastMovers.map(i => i.productId)
  ])
  
  console.log(`Syncing ${prioritySKUs.size} priority items`)
  
  // Now sync only these priority items
  return prioritySKUs
}

// Example: Daily smart sync using reports
export async function dailySmartSync() {
  console.log('🤖 Running daily smart sync with reporting data...')
  
  const config = await getFinaleConfig()
  if (!config) return
  
  const reporting = new FinaleReportingService(config)
  
  // 1. Get items that need attention
  const reorderNeeded = await reporting.getReorderSuggestions()
  const lowStock = await reporting.getLowStockReport()
  
  // 2. Alert on critical items
  const criticalItems = reorderNeeded.filter(item => 
    item.quantityOnHand === 0 && item.quantityOnOrder === 0
  )
  
  if (criticalItems.length > 0) {
    console.log(`⚠️  CRITICAL: ${criticalItems.length} items are out of stock with no orders!`)
    // Send email alert
  }
  
  // 3. Sync only items that matter
  const itemsToSync = [...reorderNeeded, ...lowStock]
  console.log(`Syncing ${itemsToSync.length} items based on report data`)
  
  // Continue with targeted sync...
}
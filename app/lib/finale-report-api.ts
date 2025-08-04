import { rateLimitedFetch } from './finale-rate-limiter'

interface ReportConfig {
  apiKey: string
  apiSecret: string
  accountPath: string
  reportUrl?: string
}

interface ReportRow {
  [key: string]: string | number | null
}

/**
 * Finale Reporting API Service
 * Uses Finale's reporting API to fetch data in table format
 */
export class FinaleReportApiService {
  private authHeader: string
  private accountPath: string
  
  constructor(config: ReportConfig) {
    this.authHeader = `Basic ${Buffer.from(`${config.apiKey}:${config.apiSecret}`).toString('base64')}`
    this.accountPath = config.accountPath
  }

  /**
   * Fetch report data from Finale
   * @param reportUrl Full report URL from Finale (should use pivotTable, not pivotTableStream)
   * @param format 'csv' or 'jsonObject'
   */
  async fetchReport(reportUrl: string, format: 'csv' | 'jsonObject' = 'jsonObject'): Promise<ReportRow[]> {
    try {
      // Ensure URL uses pivotTable instead of pivotTableStream
      const modifiedUrl = reportUrl.replace('pivotTableStream', 'pivotTable')
      
      // Update format parameter
      const url = new URL(modifiedUrl)
      url.searchParams.set('format', format)
      
      // Update file extension
      const pathParts = url.pathname.split('.')
      if (pathParts.length > 1) {
        pathParts[pathParts.length - 1] = format === 'jsonObject' ? 'json' : 'csv'
        url.pathname = pathParts.join('.')
      }
      
      console.log('[Report API] Fetching report:', url.toString().replace(/api\/.*\/doc/, 'api/***/doc'))
      
      const response = await rateLimitedFetch(url.toString(), {
        headers: {
          'Authorization': this.authHeader,
          'Accept': format === 'jsonObject' ? 'application/json' : 'text/csv'
        }
      })
      
      if (!response.ok) {
        throw new Error(`Report API error: ${response.status} ${response.statusText}`)
      }
      
      if (format === 'jsonObject') {
        const data = await response.json()
        return Array.isArray(data) ? data : []
      } else {
        // Parse CSV
        const text = await response.text()
        return this.parseCSV(text)
      }
    } catch (error) {
      console.error('[Report API] Error fetching report:', error)
      throw error
    }
  }

  /**
   * Fetch inventory report with supplier data
   * This assumes you have a report configured in Finale that includes:
   * - Product ID (SKU)
   * - Product Name
   * - Supplier/Vendor
   * - Stock levels
   * - Cost
   * - etc.
   */
  async fetchInventoryWithSuppliers(reportUrl: string): Promise<any[]> {
    try {
      const rows = await this.fetchReport(reportUrl, 'jsonObject')
      
      // Process the hierarchical report data
      // Reports with grouping will have null values for repeated fields
      const products = []
      let currentProduct: any = null
      
      for (const row of rows) {
        // Check if this is a new product (has Product ID)
        if (row['Product ID']) {
          // Save previous product if exists
          if (currentProduct) {
            products.push(currentProduct)
          }
          
          // Start new product
          currentProduct = {
            sku: row['Product ID'],
            productName: row['Description'] || row['Product Name'] || '',
            supplier: row['Supplier'] || row['Vendor'] || row['Primary Supplier'] || '',
            totalStock: 0,
            locations: []
          }
        }
        
        // Add location/stock data if present
        if (currentProduct && row['Location'] && row['On hand'] !== undefined) {
          currentProduct.locations.push({
            location: row['Location'],
            stock: Number(row['On hand']) || 0,
            onOrder: Number(row['On order']) || 0
          })
          currentProduct.totalStock += Number(row['On hand']) || 0
        }
        
        // Update supplier if found in sub-rows
        if (currentProduct && !currentProduct.supplier && (row['Supplier'] || row['Vendor'])) {
          currentProduct.supplier = row['Supplier'] || row['Vendor'] || ''
        }
      }
      
      // Don't forget the last product
      if (currentProduct) {
        products.push(currentProduct)
      }
      
      console.log(`[Report API] Processed ${products.length} products from report`)
      
      // Log sample to see supplier data
      if (products.length > 0) {
        const withSuppliers = products.filter(p => p.supplier).length
        console.log(`[Report API] ${withSuppliers} of ${products.length} products have supplier data`)
        console.log('[Report API] Sample product:', {
          sku: products[0].sku,
          name: products[0].productName,
          supplier: products[0].supplier,
          stock: products[0].totalStock
        })
      }
      
      return products
    } catch (error) {
      console.error('[Report API] Error fetching inventory report:', error)
      throw error
    }
  }

  /**
   * Parse CSV data into array of objects
   */
  private parseCSV(csvText: string): ReportRow[] {
    const lines = csvText.trim().split('\n')
    if (lines.length === 0) return []
    
    // Parse headers
    const headers = this.parseCSVLine(lines[0])
    const rows: ReportRow[] = []
    
    // Parse data rows
    for (let i = 1; i < lines.length; i++) {
      const values = this.parseCSVLine(lines[i])
      const row: ReportRow = {}
      
      headers.forEach((header, index) => {
        const value = values[index]
        // Try to parse numbers
        if (value && !isNaN(Number(value))) {
          row[header] = Number(value)
        } else {
          row[header] = value || null
        }
      })
      
      rows.push(row)
    }
    
    return rows
  }

  /**
   * Parse a single CSV line handling quoted values
   */
  private parseCSVLine(line: string): string[] {
    const values: string[] = []
    let current = ''
    let inQuotes = false
    
    for (let i = 0; i < line.length; i++) {
      const char = line[i]
      const nextChar = line[i + 1]
      
      if (char === '"') {
        if (inQuotes && nextChar === '"') {
          // Escaped quote
          current += '"'
          i++ // Skip next quote
        } else {
          // Toggle quote mode
          inQuotes = !inQuotes
        }
      } else if (char === ',' && !inQuotes) {
        // End of value
        values.push(current)
        current = ''
      } else {
        current += char
      }
    }
    
    // Don't forget last value
    values.push(current)
    
    return values
  }

  /**
   * Get report configuration from URL
   */
  static parseReportUrl(reportUrl: string): {
    accountPath: string
    reportId: string
    format: string
    filters: any
  } {
    const url = new URL(reportUrl)
    const pathMatch = url.pathname.match(/\/([^\/]+)\/doc\/report\//)
    
    return {
      accountPath: pathMatch ? pathMatch[1] : '',
      reportId: url.pathname.split('/').pop()?.split('.')[0] || '',
      format: url.searchParams.get('format') || 'pdf',
      filters: url.searchParams.get('filters') ? 
        JSON.parse(Buffer.from(url.searchParams.get('filters')!, 'base64').toString()) : 
        null
    }
  }
}
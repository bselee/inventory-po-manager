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
      logError('[Report API] Error fetching report:', error)
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
      
      // For flat reports (not hierarchical), each row is a complete product
      const products = rows.map(row => {
        // Map common field variations
        const product: any = {
          sku: row['Product ID'] || row['SKU'] || row['Item ID'] || '',
          productName: row['Product Name'] || row['Description'] || row['Name'] || '',
          supplier: row['Supplier 1'] || row['Supplier'] || row['Vendor'] || row['Primary Supplier'] || '',
          totalStock: Number(row['Units in stock'] || row['On hand'] || row['Stock'] || 0),
          locations: []
        }
        
        // Add location data if available
        if (row['Location']) {
          product.locations.push({
            location: row['Location'],
            stock: Number(row['Units in stock'] || row['On hand'] || 0),
            onOrder: Number(row['On order'] || 0)
          })
        }
        
        // Add additional fields that might be useful
        product['Sales last 30 days'] = Number(row['Sales last 30 days'] || 0)
        product['Sales last 90 days'] = Number(row['Sales last 90 days'] || 0)
        product.url = row['url'] || ''
        
        // Pass through all original fields for flexibility
        return { ...row, ...product }
      })
      // Log sample to see supplier data
      if (products.length > 0) {
        const withSuppliers = products.filter(p => p.supplier).length
      }
      
      return products
    } catch (error) {
      logError('[Report API] Error fetching inventory report:', error)
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
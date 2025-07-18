// lib/finale-api.ts
import { supabase } from './supabase'

interface FinaleProduct {
  productId: string
  productName: string
  productSku: string
  quantityOnHand: number
  quantityAvailable: number
  reorderPoint?: number
  reorderQuantity?: number
  primarySupplierName?: string
  averageCost?: number
  facilityName?: string
  lastModifiedDate?: string
}

interface FinaleApiConfig {
  apiKey: string
  apiSecret: string
  accountPath: string
}

interface FinalePurchaseOrder {
  orderNumber?: string
  vendorId?: string
  vendorName?: string
  orderDate?: string
  expectedDate?: string
  status?: string
  items: FinalePurchaseOrderItem[]
  notes?: string
}

interface FinalePurchaseOrderItem {
  productId: string
  productSku: string
  quantity: number
  unitCost?: number
  description?: string
}

export class FinaleApiService {
  private config: FinaleApiConfig
  private baseUrl: string
  private authHeader: string

  constructor(config: FinaleApiConfig) {
    this.config = config
    // Clean the account path - remove any URL parts if provided
    const cleanPath = config.accountPath
      .replace(/^https?:\/\//, '')
      .replace(/\.finaleinventory\.com.*$/, '')
      .replace(/^app\./, '')
      .replace(/\/$/, '')
      .replace(/\/api$/, '') // Remove /api if included
      .trim()
    
    // The correct URL structure is: https://app.finaleinventory.com/{account}/api/
    this.baseUrl = `https://app.finaleinventory.com/${cleanPath}/api`
    
    // Create Basic Auth header
    const authString = Buffer.from(`${config.apiKey}:${config.apiSecret}`).toString('base64')
    this.authHeader = `Basic ${authString}`
  }

  // Test connection
  async testConnection(): Promise<boolean> {
    try {
      const response = await fetch(`${this.baseUrl}/product?limit=1`, {
        headers: {
          'Authorization': this.authHeader,
          'Content-Type': 'application/json'
        }
      })
      return response.ok
    } catch (error) {
      console.error('Finale connection test failed:', error)
      return false
    }
  }

  // Get all products with inventory data (with optional date filtering)
  async getInventoryData(filterYear?: number | null): Promise<FinaleProduct[]> {
    const products: FinaleProduct[] = []
    let offset = 0
    const limit = 100 // Finale's typical page size
    let hasMore = true
    
    // Use provided year or current year for filtering (null means no filter)
    const yearFilter = filterYear === undefined ? new Date().getFullYear() : filterYear
    
    if (yearFilter) {
      console.log(`[Finale Sync] Fetching products modified since year ${yearFilter}`)
    } else {
      console.log(`[Finale Sync] Fetching all products (no date filter)`)
    }

    try {
      while (hasMore) {
        // Note: The filter parameter syntax may vary - adjust if needed
        const url = `${this.baseUrl}/product?limit=${limit}&offset=${offset}`
        console.log(`[Finale Sync] Fetching page: offset=${offset}, limit=${limit}`)
        
        const response = await fetch(url, {
          headers: {
            'Authorization': this.authHeader,
            'Content-Type': 'application/json',
            'Accept': 'application/json'
          }
        })

        if (!response.ok) {
          const errorText = await response.text()
          console.error(`[Finale Sync] API error: ${response.status}`, errorText)
          throw new Error(`Finale API error: ${response.status}`)
        }

        const data = await response.json()
        
        // Log response structure for debugging
        if (offset === 0) {
          console.log(`[Finale Sync] Response structure:`, {
            isArray: Array.isArray(data),
            sampleKeys: Array.isArray(data) ? 'array response' : Object.keys(data).slice(0, 5)
          })
        }
        
        // Finale API returns different formats based on the query
        let pageProducts: any[] = []
        
        if (Array.isArray(data)) {
          // Multiple products returned as array
          pageProducts = data
        } else if (data.products && Array.isArray(data.products)) {
          // Handle object with products array
          pageProducts = data.products
        } else if (data.productId) {
          // Single product returned as object - convert to array
          pageProducts = [data]
        } else {
          console.log(`[Finale Sync] Unexpected response format:`, Object.keys(data).slice(0, 10))
          hasMore = false
          continue
        }
        
        // Transform Finale's format to our expected format
        const transformedProducts = pageProducts.map(p => {
          // Handle both array properties and direct properties
          const getId = (val: any) => Array.isArray(val) ? val[0] : val
          
          return {
            productId: getId(p.productId),
            productName: getId(p.internalName) || getId(p.productName),
            productSku: getId(p.productId), // Using productId as SKU
            quantityOnHand: parseInt(getId(p.quantityOnHand) || '0'),
            quantityAvailable: parseInt(getId(p.quantityAvailable) || '0'),
            reorderPoint: parseInt(getId(p.reorderPoint) || '0'),
            reorderQuantity: parseInt(getId(p.reorderQuantity) || '0'),
            primarySupplierName: getId(p.primarySupplierName),
            averageCost: parseFloat(getId(p.averageCost) || '0'),
            facilityName: getId(p.facilityName),
            lastModifiedDate: getId(p.lastUpdatedDate) || getId(p.lastModifiedDate)
          }
        })
        
        // Filter by year if specified
        const filteredProducts = yearFilter ? transformedProducts.filter(product => {
          if (!product.lastModifiedDate) return true
          const modifiedYear = new Date(product.lastModifiedDate).getFullYear()
          return modifiedYear >= yearFilter
        }) : transformedProducts
        
        products.push(...filteredProducts)
        hasMore = pageProducts.length === limit
        
        console.log(`[Finale Sync] Page retrieved: ${pageProducts.length} items, transformed: ${filteredProducts.length}`)
        
        offset += limit
      }

      console.log(`[Finale Sync] Total products fetched: ${products.length}`)
      return products
    } catch (error) {
      console.error('[Finale Sync] Error fetching inventory:', error)
      throw error
    }
  }

  // Get inventory by facility/location
  async getInventoryByFacility(): Promise<any> {
    try {
      const response = await fetch(
        `${this.baseUrl}/facility/inventory`, 
        {
          headers: {
            'Authorization': this.authHeader,
            'Content-Type': 'application/json'
          }
        }
      )

      if (!response.ok) {
        throw new Error(`Finale API error: ${response.status}`)
      }

      return await response.json()
    } catch (error) {
      console.error('Error fetching facility inventory:', error)
      throw error
    }
  }

  // Transform Finale data to match our database schema
  transformToInventoryItem(finaleProduct: FinaleProduct) {
    return {
      sku: finaleProduct.productSku,
      product_name: finaleProduct.productName,
      stock: finaleProduct.quantityOnHand || 0,
      location: 'Shipping', // Always use "Shipping" as the single location
      reorder_point: finaleProduct.reorderPoint || 0,
      reorder_quantity: finaleProduct.reorderQuantity || 0,
      vendor: finaleProduct.primarySupplierName || null,
      cost: finaleProduct.averageCost || 0,
      last_updated: new Date().toISOString()
    }
  }

  // Sync inventory data to Supabase
  async syncToSupabase(dryRun = false, filterYear?: number | null) {
    console.log('Starting Finale to Supabase sync...')
    
    try {
      // Get all products from Finale with optional year filter
      const finaleProducts = await this.getInventoryData(filterYear)
      console.log(`Fetched ${finaleProducts.length} products from Finale`)

      if (dryRun) {
        console.log('DRY RUN - No data will be written')
        return {
          success: true,
          totalProducts: finaleProducts.length,
          sample: finaleProducts.slice(0, 5).map(p => this.transformToInventoryItem(p)),
          dryRun: true,
          filterYear: filterYear === undefined ? new Date().getFullYear() : filterYear
        }
      }

      // Transform and prepare for upsert
      const inventoryItems = finaleProducts.map(p => this.transformToInventoryItem(p))

      // Batch upsert to Supabase (update existing, insert new)
      const batchSize = 50
      let processed = 0
      const results = []

      for (let i = 0; i < inventoryItems.length; i += batchSize) {
        const batch = inventoryItems.slice(i, i + batchSize)
        
        const { data, error } = await supabase
          .from('inventory_items')
          .upsert(batch, { 
            onConflict: 'sku',
            ignoreDuplicates: false 
          })
          .select()

        if (error) {
          console.error(`Error upserting batch ${i / batchSize + 1}:`, error)
          results.push({ batch: i / batchSize + 1, error: error.message })
        } else {
          processed += batch.length
          results.push({ batch: i / batchSize + 1, success: true, count: batch.length })
        }
      }

      console.log(`Sync complete. Processed ${processed} items.`)

      return {
        success: true,
        totalProducts: finaleProducts.length,
        processed,
        results,
        filterYear: filterYear === undefined ? new Date().getFullYear() : filterYear
      }
    } catch (error) {
      console.error('Sync failed:', error)
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error'
      }
    }
  }

  // Create a purchase order in Finale
  async createPurchaseOrder(purchaseOrder: FinalePurchaseOrder): Promise<any> {
    try {
      const response = await fetch(`${this.baseUrl}/purchaseOrder`, {
        method: 'POST',
        headers: {
          'Authorization': this.authHeader,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          orderDate: purchaseOrder.orderDate || new Date().toISOString(),
          expectedDate: purchaseOrder.expectedDate,
          vendorName: purchaseOrder.vendorName,
          notes: purchaseOrder.notes,
          items: purchaseOrder.items.map(item => ({
            productSku: item.productSku,
            quantity: item.quantity,
            unitCost: item.unitCost
          }))
        })
      })

      if (!response.ok) {
        const errorData = await response.text()
        throw new Error(`Finale API error: ${response.status} - ${errorData}`)
      }

      return await response.json()
    } catch (error) {
      console.error('Error creating purchase order in Finale:', error)
      throw error
    }
  }

  // Get purchase order status from Finale
  async getPurchaseOrder(orderNumber: string): Promise<any> {
    try {
      const response = await fetch(`${this.baseUrl}/purchaseOrder/${orderNumber}`, {
        headers: {
          'Authorization': this.authHeader,
          'Content-Type': 'application/json'
        }
      })

      if (!response.ok) {
        throw new Error(`Finale API error: ${response.status}`)
      }

      return await response.json()
    } catch (error) {
      console.error('Error fetching purchase order from Finale:', error)
      throw error
    }
  }

  // Get all vendors from Finale
  async getVendors(): Promise<any[]> {
    const vendors: any[] = []
    let offset = 0
    const limit = 100
    let hasMore = true

    console.log('[Finale Sync] Starting vendor fetch...')

    try {
      while (hasMore) {
        // Finale API uses plural 'vendors' not 'vendor'
        const url = `${this.baseUrl}/vendors?limit=${limit}&offset=${offset}`
        console.log(`[Finale Sync] Fetching vendors from URL: ${url}`)
        
        const response = await fetch(url, {
          headers: {
            'Authorization': this.authHeader,
            'Content-Type': 'application/json',
            'Accept': 'application/json'
          }
        })

        if (!response.ok) {
          const errorText = await response.text()
          console.error(`[Finale Sync] Vendor API error: ${response.status}`, errorText)
          throw new Error(`Finale API error: ${response.status} - ${errorText.substring(0, 200)}`)
        }

        const data = await response.json()
        
        // Log response structure for debugging
        if (offset === 0) {
          console.log(`[Finale Sync] Vendor response structure:`, {
            isArray: Array.isArray(data),
            sampleKeys: Array.isArray(data) ? 'array response' : Object.keys(data).slice(0, 5)
          })
        }
        
        // Handle direct array response (like products endpoint)
        if (Array.isArray(data)) {
          vendors.push(...data)
          hasMore = data.length === limit
          console.log(`[Finale Sync] Vendor page retrieved: ${data.length} items`)
        } else if (data.vendors && Array.isArray(data.vendors)) {
          // Handle object with vendors array
          vendors.push(...data.vendors)
          hasMore = data.vendors.length === limit
          console.log(`[Finale Sync] Vendor page retrieved: ${data.vendors.length} items`)
        } else {
          console.log(`[Finale Sync] Unexpected vendor response format`, data)
          hasMore = false
        }
        
        offset += limit
      }

      console.log(`[Finale Sync] Total vendors fetched: ${vendors.length}`)
      return vendors
    } catch (error) {
      console.error('[Finale Sync] Error fetching vendors:', error)
      throw error
    }
  }

  // Update purchase order status in Finale
  async updatePurchaseOrderStatus(orderNumber: string, status: string): Promise<any> {
    try {
      const response = await fetch(`${this.baseUrl}/purchaseOrder/${orderNumber}`, {
        method: 'PATCH',
        headers: {
          'Authorization': this.authHeader,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ status })
      })

      if (!response.ok) {
        throw new Error(`Finale API error: ${response.status}`)
      }

      return await response.json()
    } catch (error) {
      console.error('Error updating purchase order in Finale:', error)
      throw error
    }
  }

  // Create a new vendor in Finale
  async createVendor(vendor: any): Promise<any> {
    try {
      const response = await fetch(`${this.baseUrl}/vendors`, {
        method: 'POST',
        headers: {
          'Authorization': this.authHeader,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          vendorName: vendor.name,
          contactName: vendor.contact_name,
          email: vendor.email,
          phone: vendor.phone,
          address: vendor.address,
          notes: vendor.notes
        })
      })

      if (!response.ok) {
        const errorData = await response.text()
        throw new Error(`Finale API error: ${response.status} - ${errorData}`)
      }

      return await response.json()
    } catch (error) {
      console.error('Error creating vendor in Finale:', error)
      throw error
    }
  }

  // Update an existing vendor in Finale
  async updateVendor(vendorId: string, vendor: any): Promise<any> {
    try {
      const response = await fetch(`${this.baseUrl}/vendors/${vendorId}`, {
        method: 'PUT',
        headers: {
          'Authorization': this.authHeader,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          vendorName: vendor.name,
          contactName: vendor.contact_name,
          email: vendor.email,
          phone: vendor.phone,
          address: vendor.address,
          notes: vendor.notes
        })
      })

      if (!response.ok) {
        const errorData = await response.text()
        throw new Error(`Finale API error: ${response.status} - ${errorData}`)
      }

      return await response.json()
    } catch (error) {
      console.error('Error updating vendor in Finale:', error)
      throw error
    }
  }
}

// Helper function to get API config from settings
export async function getFinaleConfig(): Promise<FinaleApiConfig | null> {
  try {
    // First try to get any settings record
    const { data: settings, error } = await supabase
      .from('settings')
      .select('finale_api_key, finale_api_secret, finale_account_path')
      .limit(1)
      .maybeSingle() // Use maybeSingle instead of single to handle no records

    console.log('[getFinaleConfig] Query result:', { settings, error })

    if (error) {
      console.error('[getFinaleConfig] Database error:', error)
      return null
    }

    if (!settings) {
      console.log('[getFinaleConfig] No settings found')
      return null
    }

    if (!settings.finale_api_key || !settings.finale_api_secret || !settings.finale_account_path) {
      console.log('[getFinaleConfig] Missing required fields:', {
        hasApiKey: !!settings.finale_api_key,
        hasApiSecret: !!settings.finale_api_secret,
        hasAccountPath: !!settings.finale_account_path
      })
      return null
    }

    console.log('[getFinaleConfig] Config found successfully')
    return {
      apiKey: settings.finale_api_key,
      apiSecret: settings.finale_api_secret,
      accountPath: settings.finale_account_path
    }
  } catch (error) {
    console.error('[getFinaleConfig] Unexpected error:', error)
    return null
  }
}
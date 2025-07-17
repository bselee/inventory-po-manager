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
      .trim()
    this.baseUrl = `https://app.finaleinventory.com/api/${cleanPath}`
    
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

  // Get all products with inventory data
  async getInventoryData(): Promise<FinaleProduct[]> {
    const products: FinaleProduct[] = []
    let offset = 0
    const limit = 100 // Finale's typical page size
    let hasMore = true

    try {
      while (hasMore) {
        const response = await fetch(
          `${this.baseUrl}/product?limit=${limit}&offset=${offset}`, 
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

        const data = await response.json()
        
        if (data.products && data.products.length > 0) {
          products.push(...data.products)
          offset += limit
          hasMore = data.products.length === limit
        } else {
          hasMore = false
        }
      }

      return products
    } catch (error) {
      console.error('Error fetching Finale inventory:', error)
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
  async syncToSupabase(dryRun = false) {
    console.log('Starting Finale to Supabase sync...')
    
    try {
      // Get all products from Finale
      const finaleProducts = await this.getInventoryData()
      console.log(`Fetched ${finaleProducts.length} products from Finale`)

      if (dryRun) {
        console.log('DRY RUN - No data will be written')
        return {
          success: true,
          totalProducts: finaleProducts.length,
          sample: finaleProducts.slice(0, 5).map(p => this.transformToInventoryItem(p)),
          dryRun: true
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
        results
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

    try {
      while (true) {
        const response = await fetch(
          `${this.baseUrl}/vendor?limit=${limit}&offset=${offset}`, 
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

        const data = await response.json()
        
        if (data.vendors && data.vendors.length > 0) {
          vendors.push(...data.vendors)
          offset += limit
          if (data.vendors.length < limit) break
        } else {
          break
        }
      }

      return vendors
    } catch (error) {
      console.error('Error fetching vendors from Finale:', error)
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
}

// Helper function to get API config from settings
export async function getFinaleConfig(): Promise<FinaleApiConfig | null> {
  const { data: settings, error } = await supabase
    .from('settings')
    .select('finale_api_key, finale_api_secret, finale_account_path')
    .single()

  if (error || !settings || !settings.finale_api_key || !settings.finale_api_secret || !settings.finale_account_path) {
    return null
  }

  return {
    apiKey: settings.finale_api_key,
    apiSecret: settings.finale_api_secret,
    accountPath: settings.finale_account_path
  }
}
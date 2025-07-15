// lib/finale-api.ts
import { supabase } from '@/lib/supabase'

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

export class FinaleApiService {
  private config: FinaleApiConfig
  private baseUrl: string
  private authHeader: string

  constructor(config: FinaleApiConfig) {
    this.config = config
    this.baseUrl = `https://app.finaleinventory.com/api/${config.accountPath}`
    
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
      location: finaleProduct.facilityName || null,
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
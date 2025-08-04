// lib/finale-api.ts
import { supabase } from './supabase'
import { emailAlerts } from './email-alerts'
import { rateLimitedFetch } from './finale-rate-limiter'

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
  statusId?: string
  discontinued?: boolean
  active?: boolean
}

export interface FinaleApiConfig {
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
  protected config: FinaleApiConfig
  protected baseUrl: string
  protected authHeader: string

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
      const response = await rateLimitedFetch(`${this.baseUrl}/product?limit=1`, {
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
    const productMap = new Map<string, any>()
    
    // Use provided year or current year for filtering (null means no filter)
    const yearFilter = filterYear === undefined ? new Date().getFullYear() : filterYear
    
    if (yearFilter) {
      console.log(`[Finale Sync] Fetching products modified since year ${yearFilter}`)
    } else {
      console.log(`[Finale Sync] Fetching all products (no date filter)`)
    }

    try {
      // Step 1: Get all products first
      console.log('[Finale Sync] Step 1: Fetching product catalog...')
      let offset = 0
      const limit = 100
      let hasMore = true
      
      while (hasMore) {
        const productUrl = `${this.baseUrl}/product?limit=${limit}&offset=${offset}`
        const response = await rateLimitedFetch(productUrl, {
          headers: {
            'Authorization': this.authHeader,
            'Accept': 'application/json'
          }
        })

        if (!response.ok) {
          throw new Error(`Product API error: ${response.status}`)
        }

        const data = await response.json()
        
        // Handle Finale's parallel array format
        if (data.productId && Array.isArray(data.productId)) {
          const productCount = data.productId.length
          
          for (let i = 0; i < productCount; i++) {
            const product: any = {}
            for (const [key, value] of Object.entries(data)) {
              if (Array.isArray(value) && value.length >= productCount) {
                product[key] = value[i]
              }
            }
            productMap.set(product.productId, product)
          }
          
          hasMore = productCount === limit
          offset += limit
        } else {
          hasMore = false
        }
      }
      
      console.log(`[Finale Sync] Found ${productMap.size} products`)
      
      // Step 2: Get inventory items with stock levels
      console.log('[Finale Sync] Step 2: Fetching inventory quantities...')
      const inventoryUrl = `${this.baseUrl}/inventoryitem/?limit=1000`
      const inventoryResponse = await rateLimitedFetch(inventoryUrl, {
        headers: {
          'Authorization': this.authHeader,
          'Accept': 'application/json'
        }
      })

      if (!inventoryResponse.ok) {
        throw new Error(`Inventory API error: ${inventoryResponse.status}`)
      }

      const inventoryData = await inventoryResponse.json()
      
      // Create a map of productId -> aggregated inventory
      const inventoryMap = new Map<string, any>()
      
      if (inventoryData.productId && Array.isArray(inventoryData.productId)) {
        const itemCount = inventoryData.productId.length
        
        for (let i = 0; i < itemCount; i++) {
          const productId = inventoryData.productId[i]
          const quantityOnHand = parseFloat(inventoryData.quantityOnHand?.[i] || '0')
          const quantityOnOrder = parseFloat(inventoryData.quantityOnOrder?.[i] || '0')
          const quantityReserved = parseFloat(inventoryData.quantityReserved?.[i] || '0')
          
          if (!inventoryMap.has(productId)) {
            inventoryMap.set(productId, {
              quantityOnHand: 0,
              quantityOnOrder: 0,
              quantityReserved: 0
            })
          }
          
          const existing = inventoryMap.get(productId)
          existing.quantityOnHand += quantityOnHand
          existing.quantityOnOrder += quantityOnOrder
          existing.quantityReserved += quantityReserved
        }
      }
      
      console.log(`[Finale Sync] Found inventory data for ${inventoryMap.size} products`)
      
      // Step 3: Combine product and inventory data
      console.log('[Finale Sync] Step 3: Combining product and inventory data...')
      
      for (const [productId, product] of productMap) {
        const inventory = inventoryMap.get(productId) || {
          quantityOnHand: 0,
          quantityOnOrder: 0,
          quantityReserved: 0
        }
        
        const finaleProduct: FinaleProduct = {
          productId: productId,
          productName: product.internalName || product.productName || productId,
          productSku: productId, // Using productId as SKU
          quantityOnHand: Math.round(inventory.quantityOnHand),
          quantityAvailable: Math.round(inventory.quantityOnHand - inventory.quantityReserved),
          reorderPoint: 0, // Will need to get from reorderGuidelineList if available
          reorderQuantity: 0, // Will need to get from reorderGuidelineList if available
          primarySupplierName: '', // Will need to get from supplierList if available
          averageCost: 0, // Will need to get from priceList if available
          facilityName: 'Main', // Default facility
          lastModifiedDate: product.lastUpdatedDate || product.createdDate || new Date().toISOString()
        }
        
        // Extract cost from priceList if available
        if (product.priceList && Array.isArray(product.priceList)) {
          const costPrice = product.priceList.find((p: any) => 
            p.productPriceTypeId === 'AVERAGE_COST' || 
            p.productPriceTypeId === 'DEFAULT_PRICE' ||
            p.price > 0
          )
          if (costPrice?.price) {
            finaleProduct.averageCost = parseFloat(costPrice.price)
          }
        }
        
        // Extract supplier from supplierList if available
        if (product.supplierList && Array.isArray(product.supplierList) && product.supplierList.length > 0) {
          // Check different possible supplier data structures
          const firstSupplier = product.supplierList[0]
          
          // Try different field names that might contain the supplier name
          finaleProduct.primarySupplierName = 
            firstSupplier.partyName || 
            firstSupplier.supplierName || 
            firstSupplier.name ||
            firstSupplier.vendorName ||
            firstSupplier.supplier ||
            firstSupplier.vendor ||
            ''
          
          // Log the structure for debugging
          if (firstSupplier && Object.keys(firstSupplier).length > 0) {
            console.log('[Finale Sync] Supplier structure found:', {
              productId: productId,
              supplierFields: Object.keys(firstSupplier),
              supplierData: firstSupplier
            })
          }
        }
        
        // Apply year filter if specified
        if (yearFilter) {
          const modifiedYear = new Date(finaleProduct.lastModifiedDate || 0).getFullYear()
          if (modifiedYear >= yearFilter) {
            products.push(finaleProduct)
          }
        } else {
          products.push(finaleProduct)
        }
      }

      console.log(`[Finale Sync] Total products with inventory: ${products.length}`)
      
      // Log sample for debugging
      if (products.length > 0) {
        console.log('[Finale Sync] Sample product with inventory:', {
          productId: products[0].productId,
          productName: products[0].productName,
          quantityOnHand: products[0].quantityOnHand,
          quantityAvailable: products[0].quantityAvailable
        })
      }
      
      return products
    } catch (error) {
      console.error('[Finale Sync] Error fetching inventory:', error)
      throw error
    }
  }

  // Get inventory by facility/location
  async getInventoryByFacility(): Promise<any> {
    try {
      const response = await rateLimitedFetch(
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
    const syncStartTime = Date.now()
    let syncLogId: number | null = null
    
    try {
      // Create sync log entry at start
      if (!dryRun) {
        const { data: syncLog, error: logError } = await supabase
          .from('sync_logs')
          .insert({
            sync_type: 'finale_inventory',
            status: 'running',
            synced_at: new Date().toISOString(),
            items_processed: 0,
            items_updated: 0,
            errors: [],
            metadata: {
              filterYear: filterYear === undefined ? new Date().getFullYear() : filterYear,
              dryRun: false,
              startTime: new Date().toISOString()
            }
          })
          .select()
          .single()
        
        if (logError) {
          console.error('Failed to create sync log:', logError)
        } else if (syncLog) {
          syncLogId = syncLog.id
        }
      }

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
      let failed = 0
      const results = []
      const errors: string[] = []

      for (let i = 0; i < inventoryItems.length; i += batchSize) {
        const batch = inventoryItems.slice(i, i + batchSize)
        const batchNumber = Math.floor(i / batchSize) + 1
        
        // Retry logic with exponential backoff
        let retryCount = 0
        const maxRetries = 3
        let batchSuccess = false
        let lastError: any = null

        while (retryCount <= maxRetries && !batchSuccess) {
          try {
            const { data, error } = await supabase
              .from('inventory_items')
              .upsert(batch, { 
                onConflict: 'sku',
                ignoreDuplicates: false 
              })
              .select()

            if (error) {
              lastError = error
              if (retryCount < maxRetries) {
                const backoffMs = Math.min(1000 * Math.pow(2, retryCount), 10000) // Max 10 seconds
                console.log(`Batch ${batchNumber} failed, retrying in ${backoffMs}ms... (attempt ${retryCount + 1}/${maxRetries})`)
                await new Promise(resolve => setTimeout(resolve, backoffMs))
                retryCount++
              } else {
                throw error
              }
            } else {
              batchSuccess = true
              processed += batch.length
              results.push({ 
                batch: batchNumber, 
                success: true, 
                count: batch.length,
                retries: retryCount 
              })
            }
          } catch (error) {
            if (retryCount >= maxRetries) {
              console.error(`Error upserting batch ${batchNumber} after ${maxRetries} retries:`, error)
              results.push({ 
                batch: batchNumber, 
                error: error instanceof Error ? error.message : 'Unknown error',
                retries: retryCount 
              })
              errors.push(`Batch ${batchNumber}: ${error instanceof Error ? error.message : 'Unknown error'} (after ${retryCount} retries)`)
              failed += batch.length
              break
            }
          }
        }

        // Update sync log progress periodically (every 10 batches)
        if (syncLogId && batchNumber % 10 === 0) {
          await supabase
            .from('sync_logs')
            .update({
              items_processed: i + batch.length,
              items_updated: processed,
              metadata: {
                filterYear: filterYear === undefined ? new Date().getFullYear() : filterYear,
                dryRun: false,
                startTime: new Date(syncStartTime).toISOString(),
                progress: `${Math.round((i + batch.length) / inventoryItems.length * 100)}%`,
                currentBatch: batchNumber,
                totalBatches: Math.ceil(inventoryItems.length / batchSize)
              }
            })
            .eq('id', syncLogId)
        }
      }

      const syncDuration = Date.now() - syncStartTime
      const finalStatus = errors.length === 0 ? 'success' : (processed > 0 ? 'partial' : 'error')

      // Update sync log with final results
      if (syncLogId) {
        await supabase
          .from('sync_logs')
          .update({
            status: finalStatus,
            items_processed: inventoryItems.length,
            items_updated: processed,
            errors: errors,
            duration_ms: syncDuration,
            metadata: {
              filterYear: filterYear === undefined ? new Date().getFullYear() : filterYear,
              dryRun: false,
              startTime: new Date(syncStartTime).toISOString(),
              endTime: new Date().toISOString(),
              totalProducts: finaleProducts.length,
              batchResults: results,
              itemsFailed: failed
            }
          })
          .eq('id', syncLogId)
      }

      console.log(`Sync complete. Processed ${processed} items in ${syncDuration}ms.`)

      // Send email alerts based on sync result
      await emailAlerts.initialize()
      
      if (finalStatus === 'error') {
        await emailAlerts.sendSyncAlert({
          type: 'failure',
          syncId: syncLogId || undefined,
          error: errors[0] || 'Multiple batch failures',
          details: {
            totalProducts: finaleProducts.length,
            processed,
            failed,
            errors: errors.slice(0, 5), // First 5 errors
            duration: syncDuration
          }
        })
      } else if (finalStatus === 'partial') {
        await emailAlerts.sendSyncAlert({
          type: 'warning',
          syncId: syncLogId || undefined,
          details: {
            totalProducts: finaleProducts.length,
            processed,
            itemsFailed: failed,
            errors: errors.slice(0, 5),
            duration: syncDuration
          }
        })
      } else if (finalStatus === 'success') {
        // Check if this is a recovery from previous failures
        await emailAlerts.sendSyncAlert({
          type: 'success',
          syncId: syncLogId || undefined,
          details: {
            itemsProcessed: inventoryItems.length,
            itemsUpdated: processed,
            duration: syncDuration
          }
        })
      }

      return {
        success: finalStatus !== 'error',
        totalProducts: finaleProducts.length,
        processed,
        failed,
        results,
        errors,
        duration: syncDuration,
        filterYear: filterYear === undefined ? new Date().getFullYear() : filterYear
      }
    } catch (error) {
      console.error('Sync failed:', error)
      
      // Update sync log with error status
      if (syncLogId) {
        const syncDuration = Date.now() - syncStartTime
        await supabase
          .from('sync_logs')
          .update({
            status: 'error',
            errors: [error instanceof Error ? error.message : 'Unknown error'],
            duration_ms: syncDuration,
            metadata: {
              filterYear: filterYear === undefined ? new Date().getFullYear() : filterYear,
              dryRun: false,
              startTime: new Date(syncStartTime).toISOString(),
              endTime: new Date().toISOString(),
              errorDetails: error instanceof Error ? error.stack : undefined
            }
          })
          .eq('id', syncLogId)
      }
      
      // Send failure alert
      await emailAlerts.initialize()
      await emailAlerts.sendSyncAlert({
        type: 'failure',
        syncId: syncLogId || undefined,
        error: error instanceof Error ? error.message : 'Unknown error',
        details: {
          errorStack: error instanceof Error ? error.stack : undefined,
          filterYear: filterYear === undefined ? new Date().getFullYear() : filterYear
        }
      })
      
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error'
      }
    }
  }

  // Create a purchase order in Finale
  async createPurchaseOrder(purchaseOrder: FinalePurchaseOrder): Promise<any> {
    try {
      const response = await rateLimitedFetch(`${this.baseUrl}/purchaseOrder`, {
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

  // OPTIMIZED SYNC STRATEGIES
  
  // Strategy 1: Inventory-only sync (fastest - just updates stock levels)
  async syncInventoryOnly(): Promise<any> {
    console.log('🚀 Running inventory-only sync (stock levels only)...')
    const startTime = Date.now()
    
    try {
      // Create sync log
      const { data: syncLog } = await supabase
        .from('sync_logs')
        .insert({
          sync_type: 'finale_inventory_quick',
          status: 'running',
          synced_at: new Date().toISOString(),
          metadata: { strategy: 'inventory-only' }
        })
        .select()
        .single()
      
      // Fetch inventory data only
      const inventoryUrl = `${this.baseUrl}/inventoryitem/?limit=5000`
      const response = await rateLimitedFetch(inventoryUrl, {
        headers: {
          'Authorization': this.authHeader,
          'Accept': 'application/json'
        }
      })
      
      if (!response.ok) {
        throw new Error(`Inventory API error: ${response.status}`)
      }
      
      const inventoryData = await response.json()
      
      // Aggregate inventory by product
      const inventoryMap = new Map<string, { onHand: number, reserved: number }>()
      
      if (inventoryData.productId && Array.isArray(inventoryData.productId)) {
        for (let i = 0; i < inventoryData.productId.length; i++) {
          const productId = inventoryData.productId[i]
          const onHand = parseFloat(inventoryData.quantityOnHand?.[i] || 0)
          const reserved = parseFloat(inventoryData.quantityReserved?.[i] || 0)
          
          if (!inventoryMap.has(productId)) {
            inventoryMap.set(productId, { onHand: 0, reserved: 0 })
          }
          
          const inv = inventoryMap.get(productId)!
          inv.onHand += onHand
          inv.reserved += reserved
        }
      }
      
      // Update only stock levels in database
      const updates = []
      for (const [sku, inv] of inventoryMap) {
        updates.push({
          sku,
          stock: Math.round(inv.onHand),
          last_updated: new Date().toISOString()
        })
      }
      
      // Batch update
      let updated = 0
      const batchSize = 100
      
      for (let i = 0; i < updates.length; i += batchSize) {
        const batch = updates.slice(i, i + batchSize)
        const { error } = await supabase
          .from('inventory_items')
          .upsert(batch, {
            onConflict: 'sku',
            ignoreDuplicates: false
          })
        
        if (!error) {
          updated += batch.length
        }
      }
      
      // Check for critical items
      const { data: criticalItems } = await supabase
        .from('inventory_items')
        .select('sku, product_name, stock, reorder_point')
        .or('stock.eq.0,stock.lt.reorder_point')
      
      const duration = Date.now() - startTime
      
      // Update sync log
      if (syncLog) {
        await supabase
          .from('sync_logs')
          .update({
            status: 'success',
            items_processed: inventoryMap.size,
            items_updated: updated,
            duration_ms: duration,
            metadata: {
              strategy: 'inventory-only',
              criticalItems: criticalItems?.length || 0,
              outOfStock: criticalItems?.filter(i => i.stock === 0).length || 0
            }
          })
          .eq('id', syncLog.id)
      }
      
      return {
        success: true,
        strategy: 'inventory-only',
        itemsProcessed: inventoryMap.size,
        itemsUpdated: updated,
        duration: Math.round(duration / 1000) + 's',
        criticalItems: criticalItems || [],
        message: `Quick sync complete: ${updated} stock levels updated`
      }
      
    } catch (error) {
      console.error('Inventory sync error:', error)
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error'
      }
    }
  }
  
  // Strategy 2: Critical items sync (low stock and reorder needed)
  async syncCriticalItems(): Promise<any> {
    console.log('🚨 Syncing critical items (low stock/reorder needed)...')
    
    try {
      // Get items that need attention from our database
      const { data: criticalItems } = await supabase
        .from('inventory_items')
        .select('sku')
        .or('stock.lt.10,stock.lt.reorder_point')
        .limit(200)
      
      if (!criticalItems || criticalItems.length === 0) {
        return {
          success: true,
          message: 'No critical items found',
          itemsProcessed: 0
        }
      }
      
      const criticalSKUs = criticalItems.map(item => item.sku)
      console.log(`Found ${criticalSKUs.length} critical items to sync`)
      
      // Get full product data for these SKUs
      const products = await this.getInventoryData()
      const criticalProducts = products.filter(p => 
        criticalSKUs.includes(p.productSku)
      )
      
      // Transform and update
      const updates = criticalProducts.map(p => this.transformToInventoryItem(p))
      
      // Batch update
      const { error } = await supabase
        .from('inventory_items')
        .upsert(updates, {
          onConflict: 'sku',
          ignoreDuplicates: false
        })
      
      if (error) throw error
      
      // Check for out of stock items
      const outOfStock = criticalProducts.filter(p => p.quantityOnHand === 0)
      const belowReorder = criticalProducts.filter(p => 
        p.quantityOnHand < (p.reorderPoint || 0)
      )
      
      // Send alerts if needed
      if (outOfStock.length > 0) {
        await emailAlerts.initialize()
        await emailAlerts.sendSyncAlert({
          type: 'out-of-stock',
          items: outOfStock,
          count: outOfStock.length
        })
      }
      
      return {
        success: true,
        strategy: 'critical',
        itemsProcessed: criticalProducts.length,
        itemsUpdated: updates.length,
        outOfStock: outOfStock.length,
        belowReorder: belowReorder.length,
        message: `Critical sync complete: ${outOfStock.length} out of stock, ${belowReorder.length} need reorder`
      }
      
    } catch (error) {
      console.error('Critical sync error:', error)
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error'
      }
    }
  }
  
  // Strategy 3: Smart sync (decides what to sync based on conditions)
  async syncSmart(): Promise<any> {
    console.log('🤖 Running smart sync...')
    
    // Check last sync time
    const { data: lastSync } = await supabase
      .from('sync_logs')
      .select('synced_at, metadata')
      .eq('sync_type', 'finale_inventory')
      .eq('status', 'success')
      .order('synced_at', { ascending: false })
      .limit(1)
      .maybeSingle()
    
    if (!lastSync) {
      console.log('No previous sync - running full sync')
      return this.syncToSupabase(false, new Date().getFullYear())
    }
    
    const minutesSince = (Date.now() - new Date(lastSync.synced_at).getTime()) / (1000 * 60)
    
    if (minutesSince < 30) {
      // Very recent - only critical items
      console.log(`Last sync ${Math.round(minutesSince)} min ago - syncing critical items only`)
      return this.syncCriticalItems()
    } else if (minutesSince < 120) {
      // Recent - inventory levels only
      console.log(`Last sync ${Math.round(minutesSince)} min ago - syncing inventory levels`)
      return this.syncInventoryOnly()
    } else if (minutesSince < 1440) { // 24 hours
      // Daily - active products with inventory
      console.log(`Last sync ${Math.round(minutesSince / 60)} hours ago - syncing active products`)
      return this.syncActiveProducts()
    } else {
      // Overdue - full sync
      console.log(`Last sync ${Math.round(minutesSince / 60)} hours ago - running full sync`)
      return this.syncToSupabase(false)
    }
  }
  
  // Strategy 4: Active products only (skip discontinued)
  async syncActiveProducts(): Promise<any> {
    console.log('📦 Syncing active products only...')
    
    try {
      // Get all products but filter to active only
      const allProducts = await this.getInventoryData()
      
      // Filter active products (multiple ways to check)
      const activeProducts = allProducts.filter(p => {
        // Check various fields that might indicate active status
        if (p.statusId === 'INACTIVE') return false
        if (p.discontinued === true) return false
        if (p.active === false) return false
        
        // Also skip products with no recent activity
        const lastModified = new Date(p.lastModifiedDate || 0)
        const daysSinceModified = (Date.now() - lastModified.getTime()) / (1000 * 60 * 60 * 24)
        if (daysSinceModified > 365) return false // Skip if not modified in a year
        
        return true
      })
      
      console.log(`Found ${activeProducts.length} active products (of ${allProducts.length} total)`)
      
      // Transform and update
      const updates = activeProducts.map(p => this.transformToInventoryItem(p))
      
      // Batch update
      const batchSize = 50
      let updated = 0
      
      for (let i = 0; i < updates.length; i += batchSize) {
        const batch = updates.slice(i, i + batchSize)
        const { error } = await supabase
          .from('inventory_items')
          .upsert(batch, {
            onConflict: 'sku',
            ignoreDuplicates: false
          })
        
        if (!error) {
          updated += batch.length
        }
      }
      
      return {
        success: true,
        strategy: 'active-products',
        totalProducts: allProducts.length,
        activeProducts: activeProducts.length,
        itemsUpdated: updated,
        message: `Active products sync complete: ${updated} items updated`
      }
      
    } catch (error) {
      console.error('Active products sync error:', error)
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error'
      }
    }
  }
  
  // Get purchase order status from Finale
  async getPurchaseOrder(orderNumber: string): Promise<any> {
    try {
      const response = await rateLimitedFetch(`${this.baseUrl}/purchaseOrder/${orderNumber}`, {
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

  // Get all vendors from Finale (with multiple endpoint fallbacks)
  async getVendors(): Promise<any[]> {
    const vendors: any[] = []
    let offset = 0
    const limit = 100
    let hasMore = true

    console.log('[Finale Sync] Starting vendor fetch...')

    // Try multiple endpoint patterns as Finale API varies
    const endpointPatterns = [
      'vendor',        // Singular - might work for some accounts
      'vendors',       // Plural - standard pattern  
      'party',         // Party endpoint (vendors are parties)
      'supplier'       // Some systems call them suppliers
    ]

    let successfulEndpoint = null
    let lastError = null

    for (const endpoint of endpointPatterns) {
      try {
        console.log(`[Finale Sync] Trying ${endpoint} endpoint...`)
        
        const testUrl = `${this.baseUrl}/${endpoint}?limit=1`
        const testResponse = await rateLimitedFetch(testUrl, {
          headers: {
            'Authorization': this.authHeader,
            'Content-Type': 'application/json',
            'Accept': 'application/json'
          }
        })

        if (testResponse.ok) {
          const testData = await testResponse.json()
          console.log(`[Finale Sync] ${endpoint} endpoint works!`)
          successfulEndpoint = endpoint
          
          // Log response structure for debugging
          console.log(`[Finale Sync] Response structure:`, {
            isArray: Array.isArray(testData),
            hasDataKey: !!testData.data,
            sampleKeys: Array.isArray(testData) ? 'array response' : Object.keys(testData).slice(0, 10)
          })
          break
        } else {
          console.log(`[Finale Sync] ${endpoint} endpoint failed with ${testResponse.status}`)
          lastError = `${endpoint}: ${testResponse.status}`
        }
      } catch (error) {
        console.log(`[Finale Sync] ${endpoint} endpoint error:`, error instanceof Error ? error.message : 'Unknown error')
        lastError = `${endpoint}: ${error instanceof Error ? error.message : 'Unknown error'}`
      }
    }

    if (!successfulEndpoint) {
      throw new Error(`No working vendor endpoint found. Tried: ${endpointPatterns.join(', ')}. Last error: ${lastError}`)
    }

    try {
      // Now fetch all vendors using the working endpoint
      while (hasMore) {
        const url = `${this.baseUrl}/${successfulEndpoint}?limit=${limit}&offset=${offset}`
        console.log(`[Finale Sync] Fetching vendors from URL: ${url}`)
        
        const response = await rateLimitedFetch(url, {
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
        
        // Handle different response formats
        let vendorBatch = []
        
        if (Array.isArray(data)) {
          // Direct array response
          vendorBatch = data
        } else if (data[successfulEndpoint] && Array.isArray(data[successfulEndpoint])) {
          // Object with endpoint name as key (e.g., { vendors: [...] })
          vendorBatch = data[successfulEndpoint]
        } else if (data.data && Array.isArray(data.data)) {
          // Object with data key (e.g., { data: [...] })
          vendorBatch = data.data
        } else if (data.results && Array.isArray(data.results)) {
          // Object with results key (e.g., { results: [...] })
          vendorBatch = data.results
        } else {
          console.log(`[Finale Sync] Unexpected vendor response format for ${successfulEndpoint}:`, Object.keys(data))
          hasMore = false
          break
        }
        
        vendors.push(...vendorBatch)
        hasMore = vendorBatch.length === limit
        offset += limit
        
        console.log(`[Finale Sync] Vendor page retrieved: ${vendorBatch.length} items (total: ${vendors.length})`)
      }

      console.log(`[Finale Sync] Total vendors fetched: ${vendors.length} using ${successfulEndpoint} endpoint`)
      
      // Log sample vendor structure for debugging
      if (vendors.length > 0) {
        console.log('[Finale Sync] Sample vendor structure:', {
          sampleVendor: Object.keys(vendors[0]),
          hasVendorName: 'vendorName' in vendors[0],
          hasName: 'name' in vendors[0],
          hasPartyName: 'partyName' in vendors[0],
          hasId: 'id' in vendors[0] || 'vendorId' in vendors[0] || 'partyId' in vendors[0]
        })
      }
      
      return vendors
    } catch (error) {
      console.error('[Finale Sync] Error fetching vendors:', error)
      throw error
    }
  }

  // Update purchase order status in Finale
  async updatePurchaseOrderStatus(orderNumber: string, status: string): Promise<any> {
    try {
      const response = await rateLimitedFetch(`${this.baseUrl}/purchaseOrder/${orderNumber}`, {
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
      const response = await rateLimitedFetch(`${this.baseUrl}/vendors`, {
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
      const response = await rateLimitedFetch(`${this.baseUrl}/vendors/${vendorId}`, {
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

  // MISSING METHODS NEEDED BY SYNC SERVICE

  // Get all products (wrapper for getInventoryData)
  async getAllProducts(options: { filterYear?: number } = {}): Promise<any[]> {
    console.log('[Finale API] Getting all products with options:', options)
    try {
      const products = await this.getInventoryData(options.filterYear)
      
      // Transform to format expected by sync service
      return products.map(product => ({
        itemSKU: product.productSku,
        itemName: product.productName,
        itemID: product.productId,
        quantityOnHand: product.quantityOnHand,
        quantityAvailable: product.quantityAvailable,
        unitPrice: product.averageCost || 0,
        supplier: product.primarySupplierName,
        location: product.facilityName || 'Main',
        reorderPoint: product.reorderPoint,
        reorderQuantity: product.reorderQuantity,
        lastModified: product.lastModifiedDate
      }))
    } catch (error) {
      console.error('[Finale API] Error getting all products:', error)
      throw error
    }
  }

  // Get inventory levels only (lightweight)
  async getInventoryLevels(): Promise<any[]> {
    console.log('[Finale API] Getting inventory levels only')
    try {
      const inventoryUrl = `${this.baseUrl}/inventoryitem/?limit=5000`
      const response = await rateLimitedFetch(inventoryUrl, {
        headers: {
          'Authorization': this.authHeader,
          'Accept': 'application/json'
        }
      })
      
      if (!response.ok) {
        throw new Error(`Inventory API error: ${response.status}`)
      }
      
      const data = await response.json()
      const inventoryItems: any[] = []
      
      // Handle Finale's parallel array format
      if (data.productId && Array.isArray(data.productId)) {
        const itemCount = data.productId.length
        
        for (let i = 0; i < itemCount; i++) {
          inventoryItems.push({
            sku: data.productId[i],
            quantity: parseFloat(data.quantityOnHand?.[i] || '0'),
            reserved: parseFloat(data.quantityReserved?.[i] || '0'),
            available: parseFloat(data.quantityOnHand?.[i] || '0') - parseFloat(data.quantityReserved?.[i] || '0')
          })
        }
      }
      
      return inventoryItems
    } catch (error) {
      console.error('[Finale API] Error getting inventory levels:', error)
      throw error
    }
  }

  // Get active products only (non-discontinued)
  async getActiveProducts(options: { filterYear?: number } = {}): Promise<any[]> {
    console.log('[Finale API] Getting active products only')
    try {
      const allProducts = await this.getAllProducts(options)
      
      // Filter out discontinued/inactive products
      return allProducts.filter(product => {
        // Check various fields that might indicate inactive status
        if (product.statusId === 'INACTIVE') return false
        if (product.discontinued === true) return false
        if (product.active === false) return false
        
        // Also filter by last modified date if very old
        if (product.lastModified) {
          const lastModifiedDate = new Date(product.lastModified)
          const daysSinceModified = (Date.now() - lastModifiedDate.getTime()) / (1000 * 60 * 60 * 24)
          if (daysSinceModified > 365) return false // Skip if not modified in over a year
        }
        
        return true
      })
    } catch (error) {
      console.error('[Finale API] Error getting active products:', error)
      throw error
    }
  }

  // Get products by SKUs (batch lookup)
  async getProductsBySKUs(skus: string[]): Promise<any[]> {
    console.log(`[Finale API] Getting products for ${skus.length} SKUs`)
    if (skus.length === 0) return []
    
    try {
      // Get all products (unfortunately Finale doesn't have a SKU filter endpoint)
      const allProducts = await this.getAllProducts()
      
      // Filter to only requested SKUs
      const skuSet = new Set(skus)
      return allProducts.filter(product => skuSet.has(product.itemSKU))
    } catch (error) {
      console.error('[Finale API] Error getting products by SKUs:', error)
      throw error
    }
  }

  // Import sales data (placeholder - needs implementation based on Finale's format)
  async importSalesData(csvData: string): Promise<any> {
    console.log('[Finale API] Import sales data not yet implemented')
    throw new Error('Sales data import not yet implemented')
  }
}

// Helper function to get API config from settings
export async function getFinaleConfig(): Promise<FinaleApiConfig | null> {
  try {
    // First try environment variables
    const envApiKey = process.env.FINALE_API_KEY
    const envApiSecret = process.env.FINALE_API_SECRET
    const envAccountPath = process.env.FINALE_ACCOUNT_PATH

    if (envApiKey && envApiSecret && envAccountPath) {
      console.log('[getFinaleConfig] Using environment variables')
      return {
        apiKey: envApiKey,
        apiSecret: envApiSecret,
        accountPath: envAccountPath.replace('https://app.finaleinventory.com/', '').replace('/1', '')
      }
    }

    console.log('[getFinaleConfig] Environment variables not found, checking database...')

    // Fallback to database settings - check for both API keys and username/password
    const { data: settings, error } = await supabase
      .from('settings')
      .select('finale_api_key, finale_api_secret, finale_username, finale_password, finale_account_path')
      .limit(1)
      .maybeSingle() // Use maybeSingle instead of single to handle no records

    console.log('[getFinaleConfig] Database query result:', { 
      hasSettings: !!settings, 
      error,
      hasApiKey: !!settings?.finale_api_key,
      hasUsername: !!settings?.finale_username 
    })

    if (error) {
      console.error('[getFinaleConfig] Database error:', error)
      return null
    }

    if (!settings) {
      console.log('[getFinaleConfig] No settings found in database')
      return null
    }

    // Try API key/secret first (preferred method)
    if (settings.finale_api_key && settings.finale_api_secret && settings.finale_account_path) {
      console.log('[getFinaleConfig] Using API key/secret from database')
      return {
        apiKey: settings.finale_api_key,
        apiSecret: settings.finale_api_secret,
        accountPath: settings.finale_account_path
      }
    }

    // Fallback to username/password if available
    if (settings.finale_username && settings.finale_password && settings.finale_account_path) {
      console.log('[getFinaleConfig] Using username/password from database (legacy)')
      return {
        apiKey: settings.finale_username,
        apiSecret: settings.finale_password,
        accountPath: settings.finale_account_path
      }
    }

    console.log('[getFinaleConfig] Missing required fields in database:', {
      hasApiKey: !!settings.finale_api_key,
      hasApiSecret: !!settings.finale_api_secret,
      hasUsername: !!settings.finale_username,
      hasPassword: !!settings.finale_password,
      hasAccountPath: !!settings.finale_account_path
    })
    return null
  } catch (error) {
    console.error('[getFinaleConfig] Unexpected error:', error)
    return null
  }
}
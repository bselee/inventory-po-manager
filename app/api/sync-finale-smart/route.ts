import { NextResponse } from 'next/server'
import { supabase } from '@/app/lib/supabase'
import { getFinaleConfig } from '@/app/lib/finale-api'
import { 
  generateItemHash, 
  filterChangedItems, 
  calculateSyncStats,
  ItemChangeData 
} from '@/app/lib/change-detection'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'
export const maxDuration = 60

interface SmartSyncOptions {
  forceFullSync?: boolean
  vendorFilter?: string
  priorityThreshold?: number
}

export async function POST(request: Request) {
  const startTime = Date.now()
  
  try {
    const options: SmartSyncOptions = await request.json()
    
    // Get Finale config
    const config = await getFinaleConfig()
    if (!config) {
      return NextResponse.json({ 
        success: false, 
        error: 'Finale configuration not found' 
      }, { status: 400 })
    }

    // Get existing items with their hashes
    console.log('📊 Loading existing inventory for change detection...')
    const { data: existingItems, error: dbError } = await supabase
      .from('inventory_items')
      .select('sku, content_hash, last_synced_at, sync_priority')
    
    if (dbError) {
      throw new Error(`Database error: ${dbError.message}`)
    }

    // Create a map for fast lookups
    const existingMap = new Map<string, ItemChangeData>()
    for (const item of existingItems || []) {
      existingMap.set(item.sku, {
        sku: item.sku,
        contentHash: item.content_hash || '',
        lastSyncedAt: new Date(item.last_synced_at || Date.now()),
        lastModifiedAt: new Date(), // Would come from Finale
        syncPriority: item.sync_priority || 5,
        changeFields: []
      })
    }

    // Fetch from Finale
    console.log('🔄 Fetching products from Finale...')
    const authHeader = `Basic ${Buffer.from(`${config.apiKey}:${config.apiSecret}`).toString('base64')}`
    const baseUrl = `https://app.finaleinventory.com/${config.accountPath}/api`
    
    let url = `${baseUrl}/product?limit=2000`
    if (options.vendorFilter) {
      url += `&filter=primaryVendor eq '${options.vendorFilter}'`
    }
    
    const response = await fetch(url, {
      headers: { 
        'Authorization': authHeader,
        'Accept': 'application/json'
      }
    })

    if (!response.ok) {
      throw new Error(`Finale API error: ${response.status}`)
    }

    const data = await response.json()
    
    // Convert from column format to row format
    let products: any[] = []
    if (data.productId && Array.isArray(data.productId)) {
      const numProducts = data.productId.length
      
      for (let i = 0; i < numProducts; i++) {
        const product: any = {}
        Object.keys(data).forEach(key => {
          if (Array.isArray(data[key]) && data[key][i] !== undefined) {
            product[key] = data[key][i]
          }
        })
        products.push(product)
      }
    }

    console.log(`✅ Fetched ${products.length} products from Finale`)

    // Smart change detection
    console.log('🔍 Detecting changes...')
    const { toSync, unchanged, priorities } = filterChangedItems(
      products,
      existingMap,
      options.forceFullSync
    )

    console.log(`📊 Change Detection Results:`)
    console.log(`   - Items to sync: ${toSync.length}`)
    console.log(`   - Unchanged items: ${unchanged}`)
    console.log(`   - Efficiency gain: ${((unchanged / products.length) * 100).toFixed(1)}%`)

    // Apply priority threshold if specified
    let itemsToProcess = toSync
    if (options.priorityThreshold && !options.forceFullSync) {
      itemsToProcess = toSync.filter(item => {
        const sku = item.productId || item.sku
        const priority = priorities.get(sku) || 0
        return priority >= options.priorityThreshold!
      })
      console.log(`   - After priority filter: ${itemsToProcess.length} items`)
    }

    // Process changed items
    if (itemsToProcess.length > 0) {
      console.log('💾 Syncing changed items...')
      
      const updates = itemsToProcess.map(product => {
        const hash = generateItemHash(product)
        return {
          sku: product.productId || product.sku,
          product_name: product.internalName || product.productName || product.productId,
          stock: parseInt(product.quantityAvailable || product.quantity || 0),
          reorder_point: parseInt(product.reorderLevel || product.reorderPoint || 0),
          reorder_quantity: parseInt(product.reorderQuantity || 0),
          cost: parseFloat(product.unitCost || product.cost || 0),
          location: product.primaryLocation || product.location || 'Main',
          vendor: product.primaryVendor || product.vendor || '',
          content_hash: hash,
          last_synced_at: new Date().toISOString(),
          sync_status: 'completed',
          last_updated: new Date().toISOString()
        }
      })

      // Batch upsert
      const batchSize = 100
      let processed = 0
      
      for (let i = 0; i < updates.length; i += batchSize) {
        const batch = updates.slice(i, i + batchSize)
        const { error: upsertError } = await supabase
          .from('inventory_items')
          .upsert(batch, { 
            onConflict: 'sku',
            ignoreDuplicates: false 
          })

        if (upsertError) {
          console.error('Batch upsert error:', upsertError)
        } else {
          processed += batch.length
        }
      }

      console.log(`✅ Processed ${processed} items`)
    }

    // Calculate statistics
    const duration = Date.now() - startTime
    const stats = calculateSyncStats(
      products.length,
      itemsToProcess.length,
      duration
    )

    // Log sync completion
    await supabase
      .from('sync_logs')
      .insert({
        sync_type: options.forceFullSync ? 'full_sync' : 'smart_sync',
        status: 'success',
        started_at: new Date(startTime).toISOString(),
        completed_at: new Date().toISOString(),
        items_processed: products.length,
        items_updated: itemsToProcess.length,
        // Store efficiency metrics in errors array for now (until metadata column is added)
        errors: [`Efficiency: ${stats.efficiencyGain.toFixed(1)}%, Speed: ${stats.itemsPerSecond.toFixed(1)} items/sec, Unchanged: ${unchanged}`]
      })

    return NextResponse.json({
      success: true,
      message: `Smart sync completed in ${(duration / 1000).toFixed(1)}s`,
      stats: {
        totalItems: products.length,
        changedItems: itemsToProcess.length,
        unchangedItems: unchanged,
        efficiencyGain: `${stats.efficiencyGain.toFixed(1)}%`,
        itemsPerSecond: stats.itemsPerSecond.toFixed(1),
        duration: `${(duration / 1000).toFixed(1)}s`
      }
    })

  } catch (error) {
    console.error('Smart sync error:', error)
    
    // Log error
    await supabase
      .from('sync_logs')
      .insert({
        sync_type: 'smart_sync',
        status: 'error',
        started_at: new Date(startTime).toISOString(),
        completed_at: new Date().toISOString(),
        errors: [error instanceof Error ? error.message : 'Unknown error']
      })

    return NextResponse.json(
      { 
        success: false, 
        error: error instanceof Error ? error.message : 'Smart sync failed' 
      },
      { status: 500 }
    )
  }
}

// GET endpoint to check if smart sync is available
export async function GET() {
  try {
    // Check if change detection columns exist
    const { data, error } = await supabase
      .from('inventory_items')
      .select('content_hash, sync_priority')
      .limit(1)
    
    if (error && error.message.includes('column')) {
      return NextResponse.json({
        available: false,
        message: 'Change detection columns not yet added. Run migration script.'
      })
    }

    return NextResponse.json({
      available: true,
      message: 'Smart sync is ready to use'
    })
    
  } catch (error) {
    return NextResponse.json({
      available: false,
      error: error instanceof Error ? error.message : 'Failed to check'
    })
  }
}
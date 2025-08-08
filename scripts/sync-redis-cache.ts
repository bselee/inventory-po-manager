#!/usr/bin/env tsx
/**
 * Sync Redis Cache Script
 * Fetches data from Finale API and populates Redis cache in the correct format
 */

import { config } from 'dotenv'
import path from 'path'
import { createClient } from 'redis'

// Load environment variables
config({ path: path.resolve(process.cwd(), '.env.local') })

// Import the services after env vars are loaded
async function syncRedisCache() {
  console.log('========================================')
  console.log('🔄 REDIS CACHE SYNC')
  console.log('========================================')
  console.log(`Time: ${new Date().toLocaleString()}`)
  console.log('----------------------------------------')

  try {
    // Initialize Redis client
    const redisUrl = process.env.REDIS_URL
    if (!redisUrl) {
      throw new Error('REDIS_URL not configured')
    }

    const client = createClient({
      url: redisUrl,
      socket: {
        connectTimeout: 10000,
        keepAlive: 30000
      }
    })

    await client.connect()
    console.log('✅ Connected to Redis')

    // Check if we have Finale report URLs
    const inventoryReportUrl = process.env.FINALE_INVENTORY_REPORT_URL
    const vendorsReportUrl = process.env.FINALE_VENDORS_REPORT_URL

    if (!inventoryReportUrl || !vendorsReportUrl) {
      console.log('⚠️  Finale report URLs not configured')
      console.log('Attempting to use existing individual cache items...')
      
      // Aggregate existing individual items into full cache
      console.log('\n📦 Aggregating inventory items...')
      const inventoryKeys = await client.keys('inventory:*')
      const inventoryItems = []
      
      for (const key of inventoryKeys) {
        if (!key.includes(':full') && !key.includes(':summary') && !key.includes(':last_sync') && !key.includes(':sync_status')) {
          const item = await client.get(key)
          if (item) {
            try {
              const parsed = JSON.parse(item)
              // Transform to expected format
              inventoryItems.push({
                sku: parsed.sku || parsed.product_id,
                product_name: parsed.product_name,
                vendor: parsed.vendor || null,
                current_stock: parsed.quantity_on_hand || 0,
                cost: parsed.unit_cost || 0,
                location: parsed.location || 'Main',
                reorder_point: parsed.reorder_point || 0,
                sales_velocity: parsed.sales_velocity || 0,
                days_until_stockout: parsed.units_remaining || null,
                stock_status_level: calculateStockStatus(
                  parsed.quantity_on_hand || 0,
                  parsed.reorder_point || 0
                ),
                last_updated: parsed.last_updated || new Date().toISOString(),
                finale_id: parsed.product_id
              })
            } catch (e) {
              console.error(`Failed to parse item ${key}:`, e)
            }
          }
        }
      }
      
      if (inventoryItems.length > 0) {
        // Store in the expected cache format
        await client.setEx('inventory:full', 900, JSON.stringify(inventoryItems))
        console.log(`✅ Cached ${inventoryItems.length} inventory items in inventory:full`)
        
        // Create summary
        const summary = {
          total_items: inventoryItems.length,
          total_inventory_value: inventoryItems.reduce((sum, item) => 
            sum + ((item.current_stock || 0) * (item.cost || 0)), 0
          ),
          out_of_stock_count: inventoryItems.filter(item => item.current_stock === 0).length,
          low_stock_count: inventoryItems.filter(item => 
            item.stock_status_level === 'low' || item.stock_status_level === 'critical'
          ).length,
          critical_reorder_count: inventoryItems.filter(item => 
            item.stock_status_level === 'critical'
          ).length,
          vendors_count: [...new Set(inventoryItems.map(item => item.vendor).filter(Boolean))].length,
          last_sync: new Date().toISOString()
        }
        
        await client.setEx('inventory:summary', 300, JSON.stringify(summary))
        console.log('✅ Created inventory summary')
        console.log('Summary:', summary)
      }
      
      // Aggregate vendors
      console.log('\n👥 Aggregating vendor items...')
      const vendorKeys = await client.keys('vendor:*')
      const vendorItems = []
      
      for (const key of vendorKeys) {
        if (!key.includes(':full') && !key.includes(':summary') && !key.includes(':last_sync') && !key.includes(':sync_status')) {
          const item = await client.get(key)
          if (item) {
            try {
              const parsed = JSON.parse(item)
              vendorItems.push({
                id: parsed.id || key.replace('vendor:', ''),
                name: parsed.name || parsed.vendor_name || 'Unknown',
                email: parsed.email || null,
                phone: parsed.phone || null,
                address: parsed.address || null,
                city: parsed.city || null,
                state: parsed.state || null,
                zip: parsed.zip || null,
                country: parsed.country || null,
                website: parsed.website || null,
                notes: parsed.notes || null,
                contact_name: parsed.contact_name || null,
                payment_terms: parsed.payment_terms || null,
                lead_time_days: parsed.lead_time_days || null,
                minimum_order: parsed.minimum_order || null,
                active: parsed.active !== false,
                last_updated: parsed.last_updated || new Date().toISOString(),
                finale_id: parsed.finale_id || parsed.id
              })
            } catch (e) {
              console.error(`Failed to parse vendor ${key}:`, e)
            }
          }
        }
      }
      
      if (vendorItems.length > 0) {
        await client.setEx('vendors:full', 3600, JSON.stringify(vendorItems))
        console.log(`✅ Cached ${vendorItems.length} vendors in vendors:full`)
      }
      
    } else {
      // Fetch from Finale report URLs
      console.log('\n📊 Fetching data from Finale Report URLs...')
      
      // Import the report API service
      const { FinaleReportApiService } = await import('../app/lib/finale-report-api')
      
      const reportApi = new FinaleReportApiService({
        apiKey: process.env.FINALE_API_KEY || '',
        apiSecret: process.env.FINALE_API_SECRET || '',
        accountPath: process.env.FINALE_ACCOUNT_PATH || ''
      })
      
      // Fetch inventory
      console.log('📦 Fetching inventory report...')
      const inventoryData = await reportApi.fetchInventoryWithSuppliers(inventoryReportUrl)
      
      if (inventoryData && inventoryData.length > 0) {
        // Transform to cache format
        const inventory = inventoryData.map(item => ({
          sku: item.sku || item['Product ID'] || '',
          product_name: item.productName || item.name || item['Product Name'] || '',
          vendor: item.supplier || item.vendor || item['Supplier 1'] || null,
          current_stock: item.totalStock || item['Units in stock'] || 0,
          cost: item.cost || 0,
          location: item.locations?.[0]?.location || item.location || 'Main',
          reorder_point: item.reorderPoint || 0,
          sales_velocity: item.salesVelocity || (item['Sales last 30 days'] ? item['Sales last 30 days'] / 30 : 0),
          days_until_stockout: item.daysUntilStockout,
          stock_status_level: calculateStockStatus(
            item.totalStock || item['Units in stock'] || 0,
            item.reorderPoint || 0,
            item.daysUntilStockout
          ),
          last_updated: new Date().toISOString(),
          finale_id: item.finaleId || item['Product ID']
        }))
        
        await client.setEx('inventory:full', 900, JSON.stringify(inventory))
        console.log(`✅ Cached ${inventory.length} inventory items`)
      }
      
      // Fetch vendors
      console.log('👥 Fetching vendors report...')
      const vendorsData = await reportApi.fetchReport(vendorsReportUrl, 'jsonObject')
      
      if (vendorsData && vendorsData.length > 0) {
        const vendors = vendorsData.map((item, index) => ({
          id: item['ID'] || item['Supplier ID'] || `vendor-${index}`,
          name: item['Name'] || item['Supplier Name'] || item['Company'] || '',
          email: item['Email'] || item['Email address'] || null,
          phone: item['Phone'] || item['Phone number'] || null,
          address: item['Address'] || item['Street'] || null,
          city: item['City'] || null,
          state: item['State'] || item['Province'] || null,
          zip: item['Zip'] || item['Postal Code'] || null,
          country: item['Country'] || null,
          website: item['Website'] || item['URL'] || null,
          notes: item['Notes'] || item['Description'] || null,
          contact_name: item['Contact'] || item['Contact Name'] || null,
          payment_terms: item['Payment Terms'] || item['Terms'] || null,
          lead_time_days: item['Lead Time'] ? parseInt(item['Lead Time']) : null,
          minimum_order: item['Minimum Order'] ? parseFloat(item['Minimum Order']) : null,
          active: item['Status'] !== 'Inactive' && item['Active'] !== 'No',
          last_updated: new Date().toISOString(),
          finale_id: item['ID'] || item['Supplier ID']
        }))
        
        await client.setEx('vendors:full', 3600, JSON.stringify(vendors))
        console.log(`✅ Cached ${vendors.length} vendors`)
      }
    }
    
    // Update sync timestamps
    await client.set('inventory:last_sync', new Date().toISOString())
    await client.set('vendors:last_sync', new Date().toISOString())
    
    // Verify the caches
    console.log('\n✅ Verifying cache...')
    const invCache = await client.get('inventory:full')
    const vendCache = await client.get('vendors:full')
    
    console.log('inventory:full exists:', !!invCache)
    if (invCache) {
      const inv = JSON.parse(invCache)
      console.log(`  - Contains ${Array.isArray(inv) ? inv.length : 0} items`)
    }
    
    console.log('vendors:full exists:', !!vendCache)
    if (vendCache) {
      const vend = JSON.parse(vendCache)
      console.log(`  - Contains ${Array.isArray(vend) ? vend.length : 0} vendors`)
    }
    
    await client.disconnect()
    
    console.log('\n========================================')
    console.log('✅ SYNC COMPLETED SUCCESSFULLY')
    console.log('========================================')
    console.log('\nNext steps:')
    console.log('  1. Deploy this fix to production')
    console.log('  2. Run this sync script in production')
    console.log('  3. Verify data appears at https://inventory-po-manager.vercel.app')
    
  } catch (error) {
    console.error('\n❌ Sync failed:', error)
    process.exit(1)
  }
}

function calculateStockStatus(
  stock: number,
  reorderPoint: number,
  daysUntilStockout?: number
): 'critical' | 'low' | 'adequate' | 'overstocked' {
  if (stock === 0) return 'critical'
  if (daysUntilStockout && daysUntilStockout <= 7) return 'critical'
  if (stock <= reorderPoint || (daysUntilStockout && daysUntilStockout <= 30)) return 'low'
  if (daysUntilStockout && daysUntilStockout > 180) return 'overstocked'
  return 'adequate'
}

// Run the sync
syncRedisCache().catch(error => {
  console.error('\n❌ Script failed:', error)
  process.exit(1)
})
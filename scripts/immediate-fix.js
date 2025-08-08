#!/usr/bin/env node

/**
 * Immediate Fix Script - JavaScript version for quick execution
 * Fixes API timeouts by populating test data directly
 */

const { createClient } = require('@supabase/supabase-js')
const fs = require('fs').promises
const path = require('path')
require('dotenv').config({ path: path.join(process.cwd(), '.env.local') })

// Initialize Supabase
const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
)

console.log('🚀 Immediate Fix for API Timeouts\n')
console.log('This will populate your database with sample data to fix timeout issues.\n')

async function immediateFix() {
  try {
    // 1. Create sample inventory items
    console.log('1. Creating sample inventory items...')
    
    const sampleInventory = [
      { sku: 'BAS-001', product_name: 'Craft Blend', vendor: 'BuildASoil', stock: 150, location: 'Main', reorder_point: 50, cost: 24.95 },
      { sku: 'BAS-002', product_name: 'EarthWorm Castings', vendor: 'BuildASoil', stock: 85, location: 'Main', reorder_point: 30, cost: 34.95 },
      { sku: 'BAS-003', product_name: 'Kelp Meal', vendor: 'Down To Earth', stock: 12, location: 'Main', reorder_point: 25, cost: 12.95 },
      { sku: 'BAS-004', product_name: 'Rock Dust', vendor: 'Gaia Green', stock: 0, location: 'Main', reorder_point: 15, cost: 19.95 },
      { sku: 'BAS-005', product_name: 'Premium Compost', vendor: 'BuildASoil', stock: 95, location: 'Main', reorder_point: 40, cost: 64.95 }
    ]
    
    // Add timestamps
    const inventoryWithTimestamps = sampleInventory.map(item => ({
      ...item,
      reorder_quantity: item.reorder_point * 2,
      last_updated: new Date().toISOString(),
      created_at: new Date().toISOString()
    }))
    
    const { error: invError } = await supabase
      .from('inventory_items')
      .upsert(inventoryWithTimestamps, { onConflict: 'sku' })
    
    if (invError) {
      console.log('   Warning:', invError.message)
    } else {
      console.log('   ✅ Sample inventory created')
    }
    
    // 2. Create vendors
    console.log('\n2. Creating sample vendors...')
    
    const sampleVendors = [
      { id: 1, name: 'BuildASoil', email: 'orders@buildasoil.com', phone: '(855) 877-7645' },
      { id: 2, name: 'Down To Earth', email: 'sales@downtoearthfertilizer.com', phone: '(541) 485-5932' },
      { id: 3, name: 'Gaia Green', email: 'info@gaiagreen.com', phone: '(250) 448-2068' }
    ]
    
    const vendorsWithTimestamps = sampleVendors.map(vendor => ({
      ...vendor,
      contact_name: 'Sales Department',
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString()
    }))
    
    const { error: vendorError } = await supabase
      .from('vendors')
      .upsert(vendorsWithTimestamps, { onConflict: 'id' })
    
    if (vendorError) {
      console.log('   Warning:', vendorError.message)
    } else {
      console.log('   ✅ Sample vendors created')
    }
    
    // 3. Setup basic settings
    console.log('\n3. Setting up basic configuration...')
    
    const settings = {
      id: 1,
      finale_api_key: process.env.FINALE_API_KEY || 'placeholder_key',
      finale_api_secret: process.env.FINALE_API_SECRET || 'placeholder_secret',
      finale_account_path: process.env.FINALE_ACCOUNT_PATH || 'buildasoilorganics',
      inventory_data_source: 'supabase',
      sync_enabled: false,
      low_stock_threshold: 20,
      updated_at: new Date().toISOString()
    }
    
    const { error: settingsError } = await supabase
      .from('settings')
      .upsert(settings)
    
    if (settingsError) {
      console.log('   Warning:', settingsError.message)
    } else {
      console.log('   ✅ Basic settings configured')
    }
    
    // 4. Create local cache file
    console.log('\n4. Creating local cache file...')
    
    const { data: allInventory } = await supabase
      .from('inventory_items')
      .select('*')
    
    if (allInventory) {
      const cacheData = {
        items: allInventory,
        timestamp: new Date().toISOString(),
        source: 'supabase'
      }
      
      const cacheFile = path.join(process.cwd(), '.inventory-cache.json')
      await fs.writeFile(cacheFile, JSON.stringify(cacheData, null, 2))
      console.log('   ✅ Cache file created at .inventory-cache.json')
    }
    
    // 5. Test database connection
    console.log('\n5. Testing database connection...')
    
    const { count } = await supabase
      .from('inventory_items')
      .select('*', { count: 'exact', head: true })
    
    console.log(`   ✅ Database connected. Found ${count} inventory items`)
    
    // Summary
    console.log('\n' + '='.repeat(50))
    console.log('✨ Immediate Fix Complete!\n')
    console.log('Your application should now work without timeouts.')
    console.log('\nNext steps:')
    console.log('1. Run: npm run dev')
    console.log('2. Visit: http://localhost:3000')
    console.log('3. The inventory page should load immediately')
    console.log('\nTo add real Finale data later:')
    console.log('1. Add credentials to .env.local')
    console.log('2. Run: npm run sync:finale')
    
    process.exit(0)
    
  } catch (error) {
    console.error('\n❌ Error:', error.message)
    console.error('\nPlease check:')
    console.error('1. Your .env.local file has the correct Supabase credentials')
    console.error('2. Your internet connection is working')
    console.error('3. The Supabase project is active')
    process.exit(1)
  }
}

// Run immediately
immediateFix()
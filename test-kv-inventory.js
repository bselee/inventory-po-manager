#!/usr/bin/env node

/**
 * Test script for Vercel KV inventory implementation
 * Tests the new KV-based inventory endpoints
 */

const axios = require('axios')

const BASE_URL = process.env.API_BASE_URL || 'http://localhost:3000'

async function sleep(ms) {
  return new Promise(resolve => setTimeout(resolve, ms))
}

async function testKVInventory() {
  console.log('🧪 Testing Vercel KV Inventory Implementation\n')
  console.log(`Base URL: ${BASE_URL}\n`)
  
  const tests = []
  
  // Test 1: Check cache health
  console.log('1️⃣ Testing cache health check...')
  try {
    const response = await axios.post(`${BASE_URL}/api/inventory-cache`, {
      action: 'healthCheck'
    })
    
    console.log('✅ Cache health check passed')
    console.log('   Health:', response.data.health)
    tests.push({ name: 'Cache Health Check', status: 'PASS' })
  } catch (error) {
    console.error('❌ Cache health check failed:', error.response?.data || error.message)
    tests.push({ name: 'Cache Health Check', status: 'FAIL', error: error.message })
  }
  
  console.log('\n' + '='.repeat(50) + '\n')
  
  // Test 2: Get inventory from KV
  console.log('2️⃣ Testing KV inventory fetch...')
  try {
    const response = await axios.get(`${BASE_URL}/api/inventory-kv`)
    
    console.log('✅ KV inventory fetch successful')
    console.log(`   Total items: ${response.data.items.length}`)
    console.log(`   Cache source: ${response.data.cacheInfo.source}`)
    console.log(`   Last sync: ${response.data.cacheInfo.lastSync || 'Never'}`)
    
    // Check vendor data
    const itemsWithVendor = response.data.items.filter(item => item.vendor).length
    console.log(`   Items with vendor: ${itemsWithVendor}/${response.data.items.length}`)
    
    // Show sample item
    if (response.data.items.length > 0) {
      const sample = response.data.items[0]
      console.log('\n   Sample item:')
      console.log(`   - SKU: ${sample.sku}`)
      console.log(`   - Name: ${sample.product_name}`)
      console.log(`   - Vendor: ${sample.vendor || 'None'}`)
      console.log(`   - Stock: ${sample.current_stock}`)
    }
    
    tests.push({ 
      name: 'KV Inventory Fetch', 
      status: 'PASS',
      itemsWithVendor,
      totalItems: response.data.items.length
    })
  } catch (error) {
    console.error('❌ KV inventory fetch failed:', error.response?.data || error.message)
    tests.push({ name: 'KV Inventory Fetch', status: 'FAIL', error: error.message })
  }
  
  console.log('\n' + '='.repeat(50) + '\n')
  
  // Test 3: Get sync status
  console.log('3️⃣ Testing sync status...')
  try {
    const response = await axios.get(`${BASE_URL}/api/inventory/sync`)
    
    console.log('✅ Sync status retrieved')
    console.log('   Is syncing:', response.data.is_syncing)
    console.log('   Last sync:', response.data.last_sync || 'Never')
    console.log('   Next sync:', response.data.next_sync || 'Not scheduled')
    console.log('   Total items:', response.data.summary?.total_items || 0)
    console.log('   Vendors count:', response.data.summary?.vendors_count || 0)
    
    tests.push({ name: 'Sync Status', status: 'PASS' })
  } catch (error) {
    console.error('❌ Sync status failed:', error.response?.data || error.message)
    tests.push({ name: 'Sync Status', status: 'FAIL', error: error.message })
  }
  
  console.log('\n' + '='.repeat(50) + '\n')
  
  // Test 4: Trigger manual sync (if cache is empty)
  console.log('4️⃣ Testing manual sync trigger...')
  try {
    const statusResponse = await axios.get(`${BASE_URL}/api/inventory/sync`)
    
    if (!statusResponse.data.last_sync) {
      console.log('   Cache is empty, triggering sync...')
      
      const response = await axios.post(`${BASE_URL}/api/inventory/sync`, {})
      
      console.log('✅ Manual sync triggered')
      console.log('   Items synced:', response.data.stats?.itemsSynced || 0)
      console.log('   Items with vendor:', response.data.stats?.itemsWithVendor || 0)
      console.log('   Duration:', response.data.stats?.duration)
      
      tests.push({ 
        name: 'Manual Sync', 
        status: 'PASS',
        itemsSynced: response.data.stats?.itemsSynced || 0
      })
    } else {
      console.log('   Cache already populated, skipping sync')
      tests.push({ name: 'Manual Sync', status: 'SKIP' })
    }
  } catch (error) {
    if (error.response?.status === 409) {
      console.log('⚠️  Sync already in progress')
      tests.push({ name: 'Manual Sync', status: 'SKIP', reason: 'Already syncing' })
    } else {
      console.error('❌ Manual sync failed:', error.response?.data || error.message)
      tests.push({ name: 'Manual Sync', status: 'FAIL', error: error.message })
    }
  }
  
  console.log('\n' + '='.repeat(50) + '\n')
  
  // Test 5: Test filtering
  console.log('5️⃣ Testing inventory filtering...')
  try {
    const response = await axios.get(`${BASE_URL}/api/inventory-kv?status=low&limit=10`)
    
    console.log('✅ Filtering works')
    console.log(`   Low stock items: ${response.data.items.length}`)
    console.log(`   Total matching: ${response.data.pagination.total}`)
    
    tests.push({ name: 'Inventory Filtering', status: 'PASS' })
  } catch (error) {
    console.error('❌ Filtering failed:', error.response?.data || error.message)
    tests.push({ name: 'Inventory Filtering', status: 'FAIL', error: error.message })
  }
  
  console.log('\n' + '='.repeat(50) + '\n')
  
  // Test 6: Get cache statistics
  console.log('6️⃣ Testing cache statistics...')
  try {
    const response = await axios.get(`${BASE_URL}/api/inventory-cache`)
    
    console.log('✅ Cache statistics retrieved')
    console.log('   Cache age:', response.data.cache.cacheAge)
    console.log('   Is stale:', response.data.cache.isStale)
    console.log('   Total items:', response.data.cache.totalItems)
    console.log('   Vendors count:', response.data.cache.vendorsCount)
    console.log('\n   Data quality:')
    console.log(`   - Items with vendor: ${response.data.dataQuality.itemsWithVendor}/${response.data.dataQuality.sampleSize}`)
    console.log(`   - Items with reorder point: ${response.data.dataQuality.itemsWithReorderPoint}/${response.data.dataQuality.sampleSize}`)
    console.log(`   - Items with sales data: ${response.data.dataQuality.itemsWithSalesData}/${response.data.dataQuality.sampleSize}`)
    
    tests.push({ name: 'Cache Statistics', status: 'PASS' })
  } catch (error) {
    console.error('❌ Cache statistics failed:', error.response?.data || error.message)
    tests.push({ name: 'Cache Statistics', status: 'FAIL', error: error.message })
  }
  
  // Summary
  console.log('\n' + '='.repeat(50))
  console.log('📊 TEST SUMMARY')
  console.log('='.repeat(50) + '\n')
  
  const passed = tests.filter(t => t.status === 'PASS').length
  const failed = tests.filter(t => t.status === 'FAIL').length
  const skipped = tests.filter(t => t.status === 'SKIP').length
  
  tests.forEach(test => {
    const icon = test.status === 'PASS' ? '✅' : test.status === 'FAIL' ? '❌' : '⏭️'
    console.log(`${icon} ${test.name}: ${test.status}`)
    if (test.error) console.log(`   Error: ${test.error}`)
    if (test.reason) console.log(`   Reason: ${test.reason}`)
  })
  
  console.log(`\nTotal: ${tests.length} | Passed: ${passed} | Failed: ${failed} | Skipped: ${skipped}`)
  
  // Check vendor data status
  const inventoryTest = tests.find(t => t.name === 'KV Inventory Fetch')
  if (inventoryTest && inventoryTest.status === 'PASS') {
    const vendorPercentage = inventoryTest.totalItems > 0 
      ? ((inventoryTest.itemsWithVendor / inventoryTest.totalItems) * 100).toFixed(1)
      : 0
    
    console.log('\n📊 VENDOR DATA STATUS:')
    console.log(`Items with vendor data: ${inventoryTest.itemsWithVendor}/${inventoryTest.totalItems} (${vendorPercentage}%)`)
    
    if (inventoryTest.itemsWithVendor === 0) {
      console.log('\n⚠️  No vendor data found in inventory!')
      console.log('Make sure:')
      console.log('1. The Finale report URL is configured in settings')
      console.log('2. The report includes supplier/vendor columns')
      console.log('3. The report URL uses the correct format')
    }
  }
  
  process.exit(failed > 0 ? 1 : 0)
}

// Run tests
testKVInventory().catch(error => {
  console.error('Fatal error:', error)
  process.exit(1)
})
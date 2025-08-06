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
  const tests = []
  
  // Test 1: Check cache health
  try {
    const response = await axios.post(`${BASE_URL}/api/inventory-cache`, {
      action: 'healthCheck'
    })
    tests.push({ name: 'Cache Health Check', status: 'PASS' })
  } catch (error) {
    console.error('❌ Cache health check failed:', error.response?.data || error.message)
    tests.push({ name: 'Cache Health Check', status: 'FAIL', error: error.message })
  }
  
  console.log('\n' + '='.repeat(50) + '\n')
  
  // Test 2: Get inventory from KV
  try {
    const response = await axios.get(`${BASE_URL}/api/inventory-kv`)
    // Check vendor data
    const itemsWithVendor = response.data.items.filter(item => item.vendor).length
    // Show sample item
    if (response.data.items.length > 0) {
      const sample = response.data.items[0]
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
  try {
    const response = await axios.get(`${BASE_URL}/api/inventory/sync`)
    tests.push({ name: 'Sync Status', status: 'PASS' })
  } catch (error) {
    console.error('❌ Sync status failed:', error.response?.data || error.message)
    tests.push({ name: 'Sync Status', status: 'FAIL', error: error.message })
  }
  
  console.log('\n' + '='.repeat(50) + '\n')
  
  // Test 4: Trigger manual sync (if cache is empty)
  try {
    const statusResponse = await axios.get(`${BASE_URL}/api/inventory/sync`)
    
    if (!statusResponse.data.last_sync) {
      const response = await axios.post(`${BASE_URL}/api/inventory/sync`, {})
      tests.push({ 
        name: 'Manual Sync', 
        status: 'PASS',
        itemsSynced: response.data.stats?.itemsSynced || 0
      })
    } else {
      tests.push({ name: 'Manual Sync', status: 'SKIP' })
    }
  } catch (error) {
    if (error.response?.status === 409) {
      tests.push({ name: 'Manual Sync', status: 'SKIP', reason: 'Already syncing' })
    } else {
      console.error('❌ Manual sync failed:', error.response?.data || error.message)
      tests.push({ name: 'Manual Sync', status: 'FAIL', error: error.message })
    }
  }
  
  console.log('\n' + '='.repeat(50) + '\n')
  
  // Test 5: Test filtering
  try {
    const response = await axios.get(`${BASE_URL}/api/inventory-kv?status=low&limit=10`)
    tests.push({ name: 'Inventory Filtering', status: 'PASS' })
  } catch (error) {
    console.error('❌ Filtering failed:', error.response?.data || error.message)
    tests.push({ name: 'Inventory Filtering', status: 'FAIL', error: error.message })
  }
  
  console.log('\n' + '='.repeat(50) + '\n')
  
  // Test 6: Get cache statistics
  try {
    const response = await axios.get(`${BASE_URL}/api/inventory-cache`)
    tests.push({ name: 'Cache Statistics', status: 'PASS' })
  } catch (error) {
    console.error('❌ Cache statistics failed:', error.response?.data || error.message)
    tests.push({ name: 'Cache Statistics', status: 'FAIL', error: error.message })
  }
  
  // Summary
  console.log('\n' + '='.repeat(50))
  console.log('='.repeat(50) + '\n')
  
  const passed = tests.filter(t => t.status === 'PASS').length
  const failed = tests.filter(t => t.status === 'FAIL').length
  const skipped = tests.filter(t => t.status === 'SKIP').length
  
  tests.forEach(test => {
    const icon = test.status === 'PASS' ? '✅' : test.status === 'FAIL' ? '❌' : '⏭️'
    if (test.error) console.log(`   Error: ${test.error}`)
    if (test.reason) console.log(`   Reason: ${test.reason}`)
  })
  // Check vendor data status
  const inventoryTest = tests.find(t => t.name === 'KV Inventory Fetch')
  if (inventoryTest && inventoryTest.status === 'PASS') {
    const vendorPercentage = inventoryTest.totalItems > 0 
      ? ((inventoryTest.itemsWithVendor / inventoryTest.totalItems) * 100).toFixed(1)
      : 0
    if (inventoryTest.itemsWithVendor === 0) {
    }
  }
  
  process.exit(failed > 0 ? 1 : 0)
}

// Run tests
testKVInventory().catch(error => {
  console.error('Fatal error:', error)
  process.exit(1)
})
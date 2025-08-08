#!/usr/bin/env tsx
/**
 * Test Script for Finale API Connection
 * Tests authentication, inventory, and vendor endpoints
 */

import { FinaleApiService, getFinaleConfig } from '../app/lib/finale-api'
import { config } from 'dotenv'
import path from 'path'

// Load environment variables
config({ path: path.resolve(process.cwd(), '.env.local') })

interface TestResult {
  test: string
  success: boolean
  message: string
  data?: any
  error?: string
}

const results: TestResult[] = []

function logTest(test: string, success: boolean, message: string, data?: any, error?: string) {
  const result: TestResult = { test, success, message, data, error }
  results.push(result)
  
  const emoji = success ? '✅' : '❌'
  console.log(`\n${emoji} ${test}`)
  console.log(`   ${message}`)
  if (error) {
    console.log(`   Error: ${error}`)
  }
  if (data) {
    console.log(`   Data:`, JSON.stringify(data, null, 2).substring(0, 500))
  }
}

async function testFinaleConnection() {
  console.log('========================================')
  console.log('🔍 FINALE API CONNECTION TEST')
  console.log('========================================')
  console.log(`Time: ${new Date().toLocaleString()}`)
  console.log('----------------------------------------')

  // Test 1: Check for API credentials
  console.log('\n📋 Checking for Finale API credentials...')
  
  const apiKey = process.env.FINALE_API_KEY
  const apiSecret = process.env.FINALE_API_SECRET
  const accountPath = process.env.FINALE_ACCOUNT_PATH
  
  if (!apiKey || !apiSecret || !accountPath) {
    logTest(
      'Environment Variables Check',
      false,
      'Missing Finale API credentials in .env.local',
      {
        hasApiKey: !!apiKey,
        hasApiSecret: !!apiSecret,
        hasAccountPath: !!accountPath
      }
    )
    
    // Check for report URLs as fallback
    const inventoryReportUrl = process.env.FINALE_INVENTORY_REPORT_URL
    const vendorsReportUrl = process.env.FINALE_VENDORS_REPORT_URL
    const reorderReportUrl = process.env.FINALE_REORDER_REPORT_URL
    
    console.log('\n📊 Checking for Finale Report URLs...')
    logTest(
      'Report URLs Check',
      !!(inventoryReportUrl && vendorsReportUrl),
      'Report URLs found in .env.local',
      {
        hasInventoryReport: !!inventoryReportUrl,
        hasVendorsReport: !!vendorsReportUrl,
        hasReorderReport: !!reorderReportUrl
      }
    )
    
    if (inventoryReportUrl) {
      console.log('\n🌐 Testing Report URL Access...')
      try {
        // Test fetching from report URL
        const response = await fetch(inventoryReportUrl, {
          method: 'GET',
          headers: {
            'Accept': 'text/csv'
          }
        })
        
        if (response.ok) {
          const contentType = response.headers.get('content-type')
          const text = await response.text()
          const lines = text.split('\n').slice(0, 3)
          
          logTest(
            'Inventory Report URL Test',
            true,
            'Successfully fetched inventory report',
            {
              status: response.status,
              contentType,
              sampleLines: lines,
              totalSize: text.length
            }
          )
        } else {
          logTest(
            'Inventory Report URL Test',
            false,
            `Failed to fetch report: ${response.status} ${response.statusText}`,
            null,
            await response.text()
          )
        }
      } catch (error) {
        logTest(
          'Inventory Report URL Test',
          false,
          'Failed to fetch inventory report',
          null,
          error instanceof Error ? error.message : 'Unknown error'
        )
      }
    }
    
    console.log('\n⚠️  API credentials not found. Please add to .env.local:')
    console.log('   FINALE_API_KEY=your_api_key')
    console.log('   FINALE_API_SECRET=your_api_secret')
    console.log('   FINALE_ACCOUNT_PATH=your_account_name')
    console.log('\n   Or use the Report URLs for basic sync functionality.')
    return
  }

  // Test 2: Try to get config from database
  console.log('\n🔧 Getting Finale configuration...')
  
  let config = await getFinaleConfig()
  
  if (!config) {
    // Use environment variables
    config = {
      apiKey: apiKey!,
      apiSecret: apiSecret!,
      accountPath: accountPath!
    }
    logTest(
      'Configuration Source',
      true,
      'Using environment variables',
      { accountPath: config.accountPath }
    )
  } else {
    logTest(
      'Configuration Source',
      true,
      'Using database configuration',
      { accountPath: config.accountPath }
    )
  }

  // Test 3: Initialize API service
  console.log('\n🚀 Initializing Finale API service...')
  
  let finaleApi: FinaleApiService
  try {
    finaleApi = new FinaleApiService(config)
    logTest(
      'API Service Initialization',
      true,
      'Finale API service initialized',
      { baseUrl: (finaleApi as any).baseUrl }
    )
  } catch (error) {
    logTest(
      'API Service Initialization',
      false,
      'Failed to initialize API service',
      null,
      error instanceof Error ? error.message : 'Unknown error'
    )
    return
  }

  // Test 4: Test connection
  console.log('\n🔗 Testing API connection...')
  
  try {
    const isConnected = await finaleApi.testConnection()
    logTest(
      'Connection Test',
      isConnected,
      isConnected ? 'Successfully connected to Finale API' : 'Failed to connect',
      { connected: isConnected }
    )
    
    if (!isConnected) {
      console.log('\n❌ Connection failed. Please check:')
      console.log('   1. API credentials are correct')
      console.log('   2. Account path is correct (e.g., "buildasoilorganics")')
      console.log('   3. API access is enabled in your Finale account')
      return
    }
  } catch (error) {
    logTest(
      'Connection Test',
      false,
      'Connection test threw an error',
      null,
      error instanceof Error ? error.message : 'Unknown error'
    )
    return
  }

  // Test 5: Fetch inventory data
  console.log('\n📦 Fetching inventory data (first 5 items)...')
  
  try {
    const inventory = await finaleApi.getInventoryData()
    const sampleItems = inventory.slice(0, 5)
    
    logTest(
      'Inventory Fetch',
      true,
      `Successfully fetched ${inventory.length} inventory items`,
      {
        totalItems: inventory.length,
        sampleItems: sampleItems.map(item => ({
          sku: item.productSku,
          name: item.productName,
          stock: item.quantityOnHand,
          vendor: item.primarySupplierName
        }))
      }
    )
  } catch (error) {
    logTest(
      'Inventory Fetch',
      false,
      'Failed to fetch inventory',
      null,
      error instanceof Error ? error.message : 'Unknown error'
    )
  }

  // Test 6: Fetch vendors
  console.log('\n👥 Fetching vendor data...')
  
  try {
    const vendors = await finaleApi.getVendors()
    const sampleVendors = vendors.slice(0, 5)
    
    logTest(
      'Vendor Fetch',
      true,
      `Successfully fetched ${vendors.length} vendors`,
      {
        totalVendors: vendors.length,
        sampleVendors: sampleVendors.map(v => ({
          name: v.vendorName || v.name || v.partyName,
          id: v.vendorId || v.id || v.partyId
        }))
      }
    )
  } catch (error) {
    logTest(
      'Vendor Fetch',
      false,
      'Failed to fetch vendors',
      null,
      error instanceof Error ? error.message : 'Unknown error'
    )
  }

  // Test 7: Test inventory sync (dry run)
  console.log('\n🔄 Testing inventory sync (dry run)...')
  
  try {
    const syncResult = await finaleApi.syncToSupabase(true) // dry run
    
    logTest(
      'Sync Test (Dry Run)',
      syncResult.success,
      'Dry run sync completed',
      {
        totalProducts: syncResult.totalProducts,
        sampleTransformed: syncResult.sample?.slice(0, 2)
      }
    )
  } catch (error) {
    logTest(
      'Sync Test (Dry Run)',
      false,
      'Sync test failed',
      null,
      error instanceof Error ? error.message : 'Unknown error'
    )
  }

  // Summary
  console.log('\n========================================')
  console.log('📊 TEST SUMMARY')
  console.log('========================================')
  
  const passed = results.filter(r => r.success).length
  const failed = results.filter(r => !r.success).length
  const total = results.length
  
  console.log(`Total Tests: ${total}`)
  console.log(`✅ Passed: ${passed}`)
  console.log(`❌ Failed: ${failed}`)
  console.log(`Success Rate: ${Math.round(passed / total * 100)}%`)
  
  if (failed > 0) {
    console.log('\n🔴 Failed Tests:')
    results.filter(r => !r.success).forEach(r => {
      console.log(`  - ${r.test}: ${r.message}`)
      if (r.error) {
        console.log(`    Error: ${r.error}`)
      }
    })
  }
  
  if (passed === total) {
    console.log('\n🎉 All tests passed! Finale API is properly configured.')
    console.log('\n✨ Next steps:')
    console.log('   1. Run a full sync: npm run sync-finale')
    console.log('   2. Check the inventory page to see synced data')
    console.log('   3. Monitor sync logs in the database')
  } else {
    console.log('\n⚠️  Some tests failed. Please review the errors above.')
    console.log('\n📝 Common issues:')
    console.log('   - Incorrect API credentials')
    console.log('   - Wrong account path format')
    console.log('   - API access not enabled in Finale')
    console.log('   - Network/firewall issues')
  }
}

// Run the test
testFinaleConnection().catch(error => {
  console.error('\n❌ Test script failed:', error)
  process.exit(1)
})
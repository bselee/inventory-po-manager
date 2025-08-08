#!/usr/bin/env tsx
/**
 * Simple Test Script for Finale API Connection
 * Tests authentication and basic endpoints without database dependencies
 */

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
  console.log('🔍 FINALE API CONNECTION TEST (SIMPLE)')
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
    
    // Check for report URLs as alternative
    const inventoryReportUrl = process.env.FINALE_INVENTORY_REPORT_URL
    const vendorsReportUrl = process.env.FINALE_VENDORS_REPORT_URL
    const reorderReportUrl = process.env.FINALE_REORDER_REPORT_URL
    
    console.log('\n📊 Checking for Finale Report URLs as alternative...')
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
    
    // Test Report URL access
    if (inventoryReportUrl) {
      console.log('\n🌐 Testing Inventory Report URL Access...')
      try {
        const response = await fetch(inventoryReportUrl, {
          method: 'GET',
          headers: {
            'Accept': 'text/csv,application/csv,text/plain'
          }
        })
        
        if (response.ok) {
          const contentType = response.headers.get('content-type')
          const text = await response.text()
          const lines = text.split('\n')
          const headers = lines[0]?.split(',').map(h => h.trim())
          const firstDataRow = lines[1]?.split(',').map(d => d.trim())
          
          logTest(
            'Inventory Report URL Test',
            true,
            'Successfully fetched inventory report',
            {
              status: response.status,
              contentType,
              headers: headers?.slice(0, 10),
              sampleDataRow: firstDataRow?.slice(0, 5),
              totalRows: lines.length,
              totalSize: `${Math.round(text.length / 1024)}KB`
            }
          )
          
          // Parse CSV to check data structure
          if (headers && headers.length > 0) {
            console.log('\n📋 Analyzing Report Structure...')
            const skuColumn = headers.findIndex(h => h.toLowerCase().includes('sku') || h.toLowerCase().includes('product'))
            const quantityColumn = headers.findIndex(h => h.toLowerCase().includes('quantity') || h.toLowerCase().includes('stock'))
            const vendorColumn = headers.findIndex(h => h.toLowerCase().includes('vendor') || h.toLowerCase().includes('supplier'))
            
            logTest(
              'Report Structure Analysis',
              skuColumn >= 0 && quantityColumn >= 0,
              'Report contains expected columns',
              {
                skuColumnIndex: skuColumn,
                skuColumnName: headers[skuColumn],
                quantityColumnIndex: quantityColumn,
                quantityColumnName: headers[quantityColumn],
                vendorColumnIndex: vendorColumn,
                vendorColumnName: headers[vendorColumn],
                totalColumns: headers.length
              }
            )
          }
        } else if (response.status === 401 || response.status === 403) {
          logTest(
            'Inventory Report URL Test',
            false,
            'Authentication required - Report URL may have expired',
            { status: response.status },
            'Report URLs expire after some time. You may need to regenerate them from Finale.'
          )
        } else {
          logTest(
            'Inventory Report URL Test',
            false,
            `Failed to fetch report: ${response.status} ${response.statusText}`,
            null,
            await response.text().then(t => t.substring(0, 200))
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
    
    // Test Vendors Report URL
    if (vendorsReportUrl) {
      console.log('\n🌐 Testing Vendors Report URL Access...')
      try {
        const response = await fetch(vendorsReportUrl, {
          method: 'GET',
          headers: {
            'Accept': 'text/csv,application/csv,text/plain'
          }
        })
        
        if (response.ok) {
          const text = await response.text()
          const lines = text.split('\n')
          const headers = lines[0]?.split(',').map(h => h.trim())
          
          logTest(
            'Vendors Report URL Test',
            true,
            'Successfully fetched vendors report',
            {
              totalVendors: lines.length - 1,
              headers: headers?.slice(0, 10)
            }
          )
        } else {
          logTest(
            'Vendors Report URL Test',
            false,
            `Failed to fetch vendors: ${response.status}`,
            null,
            response.statusText
          )
        }
      } catch (error) {
        logTest(
          'Vendors Report URL Test',
          false,
          'Failed to fetch vendors report',
          null,
          error instanceof Error ? error.message : 'Unknown error'
        )
      }
    }
    
    console.log('\n⚠️  API credentials not found.')
    console.log('\n📝 You have two options to connect to Finale:')
    console.log('\n1. Use Finale REST API (Recommended):')
    console.log('   Add these to your .env.local file:')
    console.log('   FINALE_API_KEY=your_api_key')
    console.log('   FINALE_API_SECRET=your_api_secret')
    console.log('   FINALE_ACCOUNT_PATH=buildasoilorganics')
    console.log('\n2. Use Report URLs (Currently configured):')
    console.log('   The report URLs are present and can be used for basic sync')
    console.log('   Note: Report URLs may expire and need periodic regeneration')
    
    return
  }

  // Test with API credentials
  console.log('\n🔧 Found API credentials, testing REST API...')
  
  // Clean the account path
  const cleanPath = accountPath
    .replace(/^https?:\/\//, '')
    .replace(/\.finaleinventory\.com.*$/, '')
    .replace(/^app\./, '')
    .replace(/\/$/, '')
    .replace(/\/api$/, '')
    .trim()
  
  const baseUrl = `https://app.finaleinventory.com/${cleanPath}/api`
  const authString = Buffer.from(`${apiKey}:${apiSecret}`).toString('base64')
  const authHeader = `Basic ${authString}`
  
  logTest(
    'API Configuration',
    true,
    'API configured',
    {
      accountPath: cleanPath,
      baseUrl: baseUrl
    }
  )

  // Test connection
  console.log('\n🔗 Testing API connection...')
  
  try {
    const response = await fetch(`${baseUrl}/product?limit=1`, {
      headers: {
        'Authorization': authHeader,
        'Content-Type': 'application/json',
        'Accept': 'application/json'
      }
    })
    
    if (response.ok) {
      const data = await response.json()
      logTest(
        'Connection Test',
        true,
        'Successfully connected to Finale API',
        {
          status: response.status,
          hasData: !!data,
          sampleKeys: Object.keys(data).slice(0, 10)
        }
      )
    } else {
      const errorText = await response.text()
      logTest(
        'Connection Test',
        false,
        `API returned error: ${response.status}`,
        null,
        errorText.substring(0, 200)
      )
      
      if (response.status === 401) {
        console.log('\n❌ Authentication failed. Please check:')
        console.log('   1. API key and secret are correct')
        console.log('   2. API access is enabled in your Finale account')
      } else if (response.status === 404) {
        console.log('\n❌ Account not found. Please check:')
        console.log('   1. Account path is correct (e.g., "buildasoilorganics")')
        console.log('   2. Not including "https://" or ".finaleinventory.com"')
      }
    }
  } catch (error) {
    logTest(
      'Connection Test',
      false,
      'Failed to connect to API',
      null,
      error instanceof Error ? error.message : 'Unknown error'
    )
  }

  // Test inventory endpoint
  console.log('\n📦 Testing inventory endpoint...')
  
  try {
    const response = await fetch(`${baseUrl}/inventoryitem?limit=5`, {
      headers: {
        'Authorization': authHeader,
        'Accept': 'application/json'
      }
    })
    
    if (response.ok) {
      const data = await response.json()
      logTest(
        'Inventory Endpoint',
        true,
        'Successfully fetched inventory',
        {
          hasProductIds: !!data.productId,
          productCount: Array.isArray(data.productId) ? data.productId.length : 0,
          dataKeys: Object.keys(data).slice(0, 10)
        }
      )
    } else {
      logTest(
        'Inventory Endpoint',
        false,
        `Failed to fetch inventory: ${response.status}`,
        null,
        await response.text().then(t => t.substring(0, 200))
      )
    }
  } catch (error) {
    logTest(
      'Inventory Endpoint',
      false,
      'Error fetching inventory',
      null,
      error instanceof Error ? error.message : 'Unknown error'
    )
  }

  // Test vendor endpoint
  console.log('\n👥 Testing vendor endpoint...')
  
  const vendorEndpoints = ['vendor', 'vendors', 'party', 'supplier']
  let vendorSuccess = false
  
  for (const endpoint of vendorEndpoints) {
    try {
      const response = await fetch(`${baseUrl}/${endpoint}?limit=1`, {
        headers: {
          'Authorization': authHeader,
          'Accept': 'application/json'
        }
      })
      
      if (response.ok) {
        const data = await response.json()
        logTest(
          `Vendor Endpoint (${endpoint})`,
          true,
          `Successfully accessed ${endpoint} endpoint`,
          {
            endpoint,
            hasData: !!data,
            dataKeys: Object.keys(data).slice(0, 5)
          }
        )
        vendorSuccess = true
        break
      }
    } catch (error) {
      // Continue to next endpoint
    }
  }
  
  if (!vendorSuccess) {
    logTest(
      'Vendor Endpoints',
      false,
      'Could not find working vendor endpoint',
      { triedEndpoints: vendorEndpoints }
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
    })
  }
  
  if (passed === total) {
    console.log('\n🎉 All tests passed! Finale connection is working.')
  } else {
    console.log('\n⚠️  Some tests failed. Please review the errors above.')
  }
}

// Run the test
testFinaleConnection().catch(error => {
  console.error('\n❌ Test script failed:', error)
  process.exit(1)
})
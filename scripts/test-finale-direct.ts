#!/usr/bin/env tsx
/**
 * Direct Finale API Test - No dependencies
 * Tests the Finale API connection and fetches real data
 */

import { config } from 'dotenv'
import path from 'path'

// Load environment variables
config({ path: path.resolve(process.cwd(), '.env.local') })

interface TestResult {
  endpoint: string
  success: boolean
  data?: any
  error?: string
}

const results: TestResult[] = []

async function testFinaleAPI() {
  console.log('========================================')
  console.log('🔍 FINALE API DIRECT CONNECTION TEST')
  console.log('========================================')
  console.log(`Time: ${new Date().toLocaleString()}`)
  console.log('----------------------------------------')

  // Get credentials from environment
  const apiKey = process.env.FINALE_API_KEY || 'I9TVdRvblFod'
  const apiSecret = process.env.FINALE_API_SECRET || '63h4TCI62vlQUYM3btEA7bycoIflGQUz'
  const accountPath = process.env.FINALE_ACCOUNT_PATH || 'buildasoilorganics'
  
  console.log('\n📋 API Configuration:')
  console.log(`   Account: ${accountPath}`)
  console.log(`   API Key: ${apiKey.substring(0, 4)}...`)
  console.log(`   API Secret: ${apiSecret.substring(0, 4)}...`)
  
  // Create auth header
  const authString = Buffer.from(`${apiKey}:${apiSecret}`).toString('base64')
  const authHeader = `Basic ${authString}`
  
  // Base URL for API
  const baseUrl = `https://app.finaleinventory.com/${accountPath}/api`
  console.log(`   Base URL: ${baseUrl}`)
  
  // Test 1: Product endpoint (get first product)
  console.log('\n📦 Testing Product Endpoint...')
  try {
    const response = await fetch(`${baseUrl}/product?limit=1`, {
      headers: {
        'Authorization': authHeader,
        'Accept': 'application/json'
      }
    })
    
    console.log(`   Status: ${response.status} ${response.statusText}`)
    
    if (response.ok) {
      const data = await response.json()
      console.log('   ✅ Product endpoint working!')
      console.log('   Response structure:', Object.keys(data).slice(0, 10))
      
      // Check if we have product data
      if (data.productId && Array.isArray(data.productId)) {
        console.log(`   Found ${data.productId.length} product(s)`)
        if (data.productId.length > 0) {
          console.log(`   First product ID: ${data.productId[0]}`)
          console.log(`   Product name: ${data.internalName?.[0] || data.productName?.[0] || 'N/A'}`)
        }
      }
      
      results.push({ endpoint: 'product', success: true, data })
    } else {
      const errorText = await response.text()
      console.log('   ❌ Product endpoint failed')
      console.log(`   Error: ${errorText.substring(0, 200)}`)
      results.push({ endpoint: 'product', success: false, error: errorText })
    }
  } catch (error) {
    console.log('   ❌ Product endpoint error:', error)
    results.push({ endpoint: 'product', success: false, error: String(error) })
  }
  
  // Test 2: Inventory Items endpoint
  console.log('\n📊 Testing Inventory Items Endpoint...')
  try {
    const response = await fetch(`${baseUrl}/inventoryitem?limit=5`, {
      headers: {
        'Authorization': authHeader,
        'Accept': 'application/json'
      }
    })
    
    console.log(`   Status: ${response.status} ${response.statusText}`)
    
    if (response.ok) {
      const data = await response.json()
      console.log('   ✅ Inventory endpoint working!')
      console.log('   Response structure:', Object.keys(data).slice(0, 10))
      
      if (data.productId && Array.isArray(data.productId)) {
        console.log(`   Found ${data.productId.length} inventory items`)
        
        // Show sample inventory data
        for (let i = 0; i < Math.min(3, data.productId.length); i++) {
          console.log(`   Item ${i + 1}:`)
          console.log(`     - Product ID: ${data.productId[i]}`)
          console.log(`     - On Hand: ${data.quantityOnHand?.[i] || 0}`)
          console.log(`     - Reserved: ${data.quantityReserved?.[i] || 0}`)
          console.log(`     - Available: ${(data.quantityOnHand?.[i] || 0) - (data.quantityReserved?.[i] || 0)}`)
        }
      }
      
      results.push({ endpoint: 'inventoryitem', success: true, data })
    } else {
      const errorText = await response.text()
      console.log('   ❌ Inventory endpoint failed')
      console.log(`   Error: ${errorText.substring(0, 200)}`)
      results.push({ endpoint: 'inventoryitem', success: false, error: errorText })
    }
  } catch (error) {
    console.log('   ❌ Inventory endpoint error:', error)
    results.push({ endpoint: 'inventoryitem', success: false, error: String(error) })
  }
  
  // Test 3: Vendor/Party endpoint
  console.log('\n👥 Testing Vendor Endpoints...')
  const vendorEndpoints = ['vendor', 'vendors', 'party', 'supplier']
  let vendorSuccess = false
  
  for (const endpoint of vendorEndpoints) {
    try {
      console.log(`   Trying /${endpoint}...`)
      const response = await fetch(`${baseUrl}/${endpoint}?limit=1`, {
        headers: {
          'Authorization': authHeader,
          'Accept': 'application/json'
        }
      })
      
      if (response.ok) {
        const data = await response.json()
        console.log(`   ✅ ${endpoint} endpoint working!`)
        console.log('   Response structure:', Object.keys(data).slice(0, 10))
        
        // Try to extract vendor data
        let vendors = []
        if (Array.isArray(data)) {
          vendors = data
        } else if (data[endpoint] && Array.isArray(data[endpoint])) {
          vendors = data[endpoint]
        } else if (data.data && Array.isArray(data.data)) {
          vendors = data.data
        } else if (data.partyId && Array.isArray(data.partyId)) {
          // Finale parallel array format
          console.log(`   Found ${data.partyId.length} vendors (parallel array format)`)
          if (data.partyId.length > 0) {
            console.log(`   First vendor ID: ${data.partyId[0]}`)
            console.log(`   Vendor name: ${data.partyName?.[0] || data.name?.[0] || 'N/A'}`)
          }
        }
        
        results.push({ endpoint, success: true, data })
        vendorSuccess = true
        break
      } else {
        console.log(`   ❌ ${endpoint}: ${response.status}`)
      }
    } catch (error) {
      console.log(`   ❌ ${endpoint} error:`, error)
    }
  }
  
  if (!vendorSuccess) {
    console.log('   ⚠️  No vendor endpoint found working')
    results.push({ endpoint: 'vendors', success: false, error: 'No working vendor endpoint found' })
  }
  
  // Test 4: Fetch multiple products with full data
  console.log('\n🔄 Fetching Full Product Data (first 10 products)...')
  try {
    const response = await fetch(`${baseUrl}/product?limit=10`, {
      headers: {
        'Authorization': authHeader,
        'Accept': 'application/json'
      }
    })
    
    if (response.ok) {
      const data = await response.json()
      console.log('   ✅ Successfully fetched product data')
      
      if (data.productId && Array.isArray(data.productId)) {
        const productCount = data.productId.length
        console.log(`   Total products fetched: ${productCount}`)
        
        // Transform first few products to show data structure
        const products = []
        for (let i = 0; i < Math.min(3, productCount); i++) {
          const product: any = {}
          for (const [key, value] of Object.entries(data)) {
            if (Array.isArray(value) && value.length >= productCount) {
              product[key] = value[i]
            }
          }
          products.push(product)
        }
        
        // Show sample products
        console.log('\n   Sample Products:')
        products.forEach((p, idx) => {
          console.log(`   ${idx + 1}. ${p.productId}`)
          console.log(`      Name: ${p.internalName || p.productName || 'N/A'}`)
          console.log(`      Status: ${p.statusId || 'N/A'}`)
          console.log(`      Last Updated: ${p.lastUpdatedDate || 'N/A'}`)
          
          // Check for supplier data
          if (p.supplierList) {
            console.log(`      Suppliers: ${JSON.stringify(p.supplierList).substring(0, 100)}`)
          }
          
          // Check for price data
          if (p.priceList) {
            console.log(`      Prices: ${JSON.stringify(p.priceList).substring(0, 100)}`)
          }
        })
        
        results.push({ endpoint: 'product-full', success: true, data: products })
      }
    } else {
      const errorText = await response.text()
      console.log('   ❌ Failed to fetch full product data')
      console.log(`   Error: ${errorText.substring(0, 200)}`)
      results.push({ endpoint: 'product-full', success: false, error: errorText })
    }
  } catch (error) {
    console.log('   ❌ Error fetching products:', error)
    results.push({ endpoint: 'product-full', success: false, error: String(error) })
  }
  
  // Summary
  console.log('\n========================================')
  console.log('📊 TEST SUMMARY')
  console.log('========================================')
  
  const successful = results.filter(r => r.success).length
  const failed = results.filter(r => !r.success).length
  
  console.log(`Total Tests: ${results.length}`)
  console.log(`✅ Successful: ${successful}`)
  console.log(`❌ Failed: ${failed}`)
  
  if (successful > 0) {
    console.log('\n🎉 Finale API is accessible!')
    console.log('\nWorking endpoints:')
    results.filter(r => r.success).forEach(r => {
      console.log(`  ✅ ${r.endpoint}`)
    })
    
    console.log('\n✨ Next Steps:')
    console.log('  1. Run the sync script to populate database with real data')
    console.log('  2. The API is working with the following structure:')
    console.log('     - Products use parallel array format')
    console.log('     - Each field is an array indexed by position')
    console.log('     - Inventory data is separate from product data')
  } else {
    console.log('\n❌ No endpoints are working. Please check:')
    console.log('  1. API credentials are correct')
    console.log('  2. Account name is correct')
    console.log('  3. API access is enabled in Finale settings')
  }
  
  // Save results to file for reference
  const fs = await import('fs')
  const resultsPath = path.join(process.cwd(), 'finale-test-results.json')
  await fs.promises.writeFile(
    resultsPath,
    JSON.stringify({ timestamp: new Date().toISOString(), results }, null, 2)
  )
  console.log(`\n💾 Results saved to: ${resultsPath}`)
}

// Run the test
testFinaleAPI().catch(error => {
  console.error('\n❌ Test script failed:', error)
  process.exit(1)
})
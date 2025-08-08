#!/usr/bin/env tsx
/**
 * Test Finale Report API with different authentication methods
 */

import { config } from 'dotenv'
import path from 'path'

// Load environment variables
config({ path: path.resolve(process.cwd(), '.env.local') })

async function testReportAPI() {
  console.log('========================================')
  console.log('🔍 FINALE REPORT API TEST')
  console.log('========================================')
  console.log(`Time: ${new Date().toLocaleString()}`)
  console.log('----------------------------------------')

  const inventoryReportUrl = process.env.FINALE_INVENTORY_REPORT_URL
  const vendorsReportUrl = process.env.FINALE_VENDORS_REPORT_URL
  
  if (!inventoryReportUrl) {
    console.log('❌ No inventory report URL found in .env.local')
    return
  }

  console.log('\n📊 Testing Inventory Report URL...')
  console.log(`URL: ${inventoryReportUrl.substring(0, 100)}...`)
  
  // Parse the URL to understand its structure
  const url = new URL(inventoryReportUrl)
  console.log('\n📋 URL Structure:')
  console.log(`  Host: ${url.hostname}`)
  console.log(`  Path: ${url.pathname.substring(0, 50)}...`)
  console.log(`  Has format param: ${url.searchParams.has('format')}`)
  console.log(`  Format value: ${url.searchParams.get('format')}`)
  
  // Test 1: Direct fetch (as the URL is)
  console.log('\n🔗 Test 1: Direct fetch...')
  try {
    const response = await fetch(inventoryReportUrl, {
      method: 'GET',
      headers: {
        'Accept': 'text/csv, application/csv, */*',
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36'
      },
      redirect: 'follow'
    })
    
    console.log(`  Status: ${response.status} ${response.statusText}`)
    console.log(`  Content-Type: ${response.headers.get('content-type')}`)
    console.log(`  Content-Length: ${response.headers.get('content-length')}`)
    
    const text = await response.text()
    const isHTML = text.trim().startsWith('<')
    const isCSV = text.includes(',') && !isHTML
    
    if (isHTML) {
      console.log('  ❌ Response is HTML (likely a login page)')
      // Check if it's asking for authentication
      if (text.includes('login') || text.includes('sign in') || text.includes('password')) {
        console.log('  ⚠️  Report requires authentication - URL may have expired')
      }
    } else if (isCSV) {
      console.log('  ✅ Response is CSV data')
      const lines = text.split('\n')
      console.log(`  Total rows: ${lines.length}`)
      console.log(`  Headers: ${lines[0].substring(0, 200)}`)
    } else {
      console.log('  ❓ Unknown response format')
      console.log(`  First 200 chars: ${text.substring(0, 200)}`)
    }
  } catch (error) {
    console.log(`  ❌ Error: ${error instanceof Error ? error.message : 'Unknown error'}`)
  }

  // Test 2: Try with cookies if we have them
  console.log('\n🔗 Test 2: Fetch with session simulation...')
  try {
    // First, we'd need to authenticate to get a session
    // This is just a placeholder - real implementation would need actual login
    const response = await fetch(inventoryReportUrl, {
      method: 'GET',
      headers: {
        'Accept': 'text/csv',
        'Cookie': 'finale_session=placeholder', // Would need real session
      }
    })
    
    console.log(`  Status: ${response.status}`)
    const text = await response.text()
    const isHTML = text.trim().startsWith('<')
    console.log(`  Response type: ${isHTML ? 'HTML' : 'Data'}`)
  } catch (error) {
    console.log(`  ❌ Error: ${error instanceof Error ? error.message : 'Unknown error'}`)
  }

  // Provide guidance
  console.log('\n========================================')
  console.log('📝 RECOMMENDATIONS')
  console.log('========================================')
  
  console.log('\n1. Report URLs Issue:')
  console.log('   The report URLs appear to be expired or require authentication.')
  console.log('   These URLs typically expire after a period of time.')
  
  console.log('\n2. To Fix This:')
  console.log('   Option A: Use Finale REST API (Recommended)')
  console.log('   - Go to Finale > Settings > API')
  console.log('   - Generate API credentials')
  console.log('   - Add to .env.local:')
  console.log('     FINALE_API_KEY=your_key')
  console.log('     FINALE_API_SECRET=your_secret')
  console.log('     FINALE_ACCOUNT_PATH=buildasoilorganics')
  
  console.log('\n   Option B: Regenerate Report URLs')
  console.log('   - Log into Finale')
  console.log('   - Go to the reports you need')
  console.log('   - Generate new pivot table URLs')
  console.log('   - Update the URLs in .env.local')
  
  console.log('\n   Option C: Use Finale Export API')
  console.log('   - This requires setting up scheduled exports in Finale')
  console.log('   - The exports can be fetched via API or webhook')
  
  console.log('\n3. For BuildASoil specifically:')
  console.log('   The account path appears to be: buildasoilorganics')
  console.log('   Base API URL would be: https://app.finaleinventory.com/buildasoilorganics/api')
}

// Run the test
testReportAPI().catch(error => {
  console.error('\n❌ Test script failed:', error)
  process.exit(1)
})
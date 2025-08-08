#!/usr/bin/env tsx
/**
 * Finale API Fix Script
 * Helps diagnose and fix Finale API connection issues
 */

import { config } from 'dotenv'
import path from 'path'
import fs from 'fs'

// Load environment variables
config({ path: path.resolve(process.cwd(), '.env.local') })

const FINALE_ACCOUNT = 'buildasoilorganics'

async function fixFinaleAPI() {
  console.log('========================================')
  console.log('🔧 FINALE API FIX SCRIPT')
  console.log('========================================')
  console.log(`Time: ${new Date().toLocaleString()}`)
  console.log('----------------------------------------')

  // Check current configuration
  console.log('\n📋 Current Configuration:')
  
  const hasAPIKey = !!process.env.FINALE_API_KEY
  const hasAPISecret = !!process.env.FINALE_API_SECRET
  const hasAccountPath = !!process.env.FINALE_ACCOUNT_PATH
  const hasReportURLs = !!process.env.FINALE_INVENTORY_REPORT_URL
  
  console.log(`  API Key: ${hasAPIKey ? '✅ Present' : '❌ Missing'}`)
  console.log(`  API Secret: ${hasAPISecret ? '✅ Present' : '❌ Missing'}`)
  console.log(`  Account Path: ${hasAccountPath ? process.env.FINALE_ACCOUNT_PATH : '❌ Missing'}`)
  console.log(`  Report URLs: ${hasReportURLs ? '✅ Present' : '❌ Missing'}`)

  if (!hasAPIKey || !hasAPISecret) {
    console.log('\n⚠️  REST API credentials are missing.')
    console.log('\n📝 To fix this issue:')
    console.log('\n1. Log into Finale at:')
    console.log(`   https://app.finaleinventory.com/${FINALE_ACCOUNT}`)
    
    console.log('\n2. Navigate to Settings > API or Settings > Integrations')
    
    console.log('\n3. Generate API credentials')
    
    console.log('\n4. Add to your .env.local file:')
    console.log('   FINALE_API_KEY=your_api_key_here')
    console.log('   FINALE_API_SECRET=your_api_secret_here')
    console.log(`   FINALE_ACCOUNT_PATH=${FINALE_ACCOUNT}`)
    
    // Offer to add placeholder entries
    console.log('\n❓ Would you like me to add placeholder entries to .env.local?')
    console.log('   (You\'ll need to replace them with real credentials)')
    
    const envPath = path.resolve(process.cwd(), '.env.local')
    const envContent = fs.readFileSync(envPath, 'utf-8')
    
    if (!envContent.includes('FINALE_API_KEY')) {
      const newEntries = `
# Finale REST API Credentials (REPLACE WITH REAL VALUES)
FINALE_API_KEY=REPLACE_WITH_YOUR_API_KEY
FINALE_API_SECRET=REPLACE_WITH_YOUR_API_SECRET
FINALE_ACCOUNT_PATH=${FINALE_ACCOUNT}
`
      console.log('\n📝 Add these lines to .env.local:')
      console.log(newEntries)
    }
  }

  // Test Report URLs
  if (hasReportURLs) {
    console.log('\n🔍 Testing Report URLs...')
    
    const reportUrl = process.env.FINALE_INVENTORY_REPORT_URL!
    try {
      const response = await fetch(reportUrl, {
        method: 'HEAD',
        redirect: 'follow'
      })
      
      if (response.ok) {
        const contentType = response.headers.get('content-type')
        if (contentType?.includes('text/html')) {
          console.log('  ❌ Report URLs are returning HTML (expired/need auth)')
          console.log('\n  To fix: Regenerate the report URLs in Finale')
          console.log('  1. Log into Finale')
          console.log('  2. Go to Reports > Pivot Tables')
          console.log('  3. Open each report and get a new streaming URL')
          console.log('  4. Update the URLs in .env.local')
        } else if (contentType?.includes('csv')) {
          console.log('  ✅ Report URLs are working')
        }
      } else {
        console.log(`  ❌ Report URL returned status: ${response.status}`)
      }
    } catch (error) {
      console.log('  ❌ Failed to test report URL')
    }
  }

  // If we have API credentials, test them
  if (hasAPIKey && hasAPISecret) {
    console.log('\n🔍 Testing REST API credentials...')
    
    const accountPath = process.env.FINALE_ACCOUNT_PATH || FINALE_ACCOUNT
    const baseUrl = `https://app.finaleinventory.com/${accountPath}/api`
    const authString = Buffer.from(`${process.env.FINALE_API_KEY}:${process.env.FINALE_API_SECRET}`).toString('base64')
    
    try {
      const response = await fetch(`${baseUrl}/product?limit=1`, {
        headers: {
          'Authorization': `Basic ${authString}`,
          'Accept': 'application/json'
        }
      })
      
      if (response.ok) {
        console.log('  ✅ API credentials are working!')
        console.log('\n🎉 You can now sync your inventory:')
        console.log('   npm run sync-finale')
        console.log('   or')
        console.log('   curl -X POST http://localhost:3000/api/sync-finale')
      } else if (response.status === 401) {
        console.log('  ❌ Authentication failed - check your API key and secret')
      } else if (response.status === 404) {
        console.log('  ❌ Account not found - check FINALE_ACCOUNT_PATH')
        console.log(`     Should be: ${FINALE_ACCOUNT}`)
      } else {
        console.log(`  ❌ API returned status: ${response.status}`)
      }
    } catch (error) {
      console.log('  ❌ Failed to connect to API')
      console.log(`     Error: ${error instanceof Error ? error.message : 'Unknown'}`)
    }
  }

  // Summary and recommendations
  console.log('\n========================================')
  console.log('📊 SUMMARY & NEXT STEPS')
  console.log('========================================')
  
  if (!hasAPIKey || !hasAPISecret) {
    console.log('\n1. Get API credentials from Finale (see instructions above)')
    console.log('2. Add them to .env.local')
    console.log('3. Run this script again to test')
  } else {
    console.log('\n✅ API credentials are configured')
    console.log('\nNext steps:')
    console.log('1. Run: npx tsx scripts/test-finale-simple.ts')
    console.log('2. If successful, sync data: npm run sync-finale')
    console.log('3. Check inventory page to see synced data')
  }
  
  console.log('\n📚 Documentation:')
  console.log('  See FINALE_API_SETUP.md for detailed instructions')
  console.log('\n💡 Tip: The REST API is more reliable than Report URLs')
  console.log('  Report URLs expire and need periodic regeneration')
}

// Run the fix script
fixFinaleAPI().catch(error => {
  console.error('\n❌ Script failed:', error)
  process.exit(1)
})
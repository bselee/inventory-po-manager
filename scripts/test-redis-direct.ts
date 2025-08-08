#!/usr/bin/env tsx
/**
 * Direct Redis/KV Connection Test
 * Tests Redis connectivity and data retrieval without Supabase dependencies
 */

import { config } from 'dotenv'
import path from 'path'

// Load environment variables
config({ path: path.resolve(process.cwd(), '.env.local') })

async function testRedisConnection() {
  console.log('========================================')
  console.log('🔍 REDIS/KV CONNECTION TEST')
  console.log('========================================')
  console.log(`Time: ${new Date().toLocaleString()}`)
  console.log('----------------------------------------')

  // Test 1: Check for Redis URL
  console.log('\n📋 Checking for Redis/KV configuration...')
  
  const redisUrl = process.env.REDIS_URL
  const kvRestApiUrl = process.env.KV_REST_API_URL
  const kvRestApiToken = process.env.KV_REST_API_TOKEN
  
  console.log('Redis URL:', redisUrl ? '✅ Found' : '❌ Missing')
  console.log('KV REST API URL:', kvRestApiUrl ? '✅ Found' : '❌ Missing')
  console.log('KV REST API Token:', kvRestApiToken ? '✅ Found' : '❌ Missing')
  
  if (!redisUrl && !kvRestApiUrl) {
    console.log('\n❌ No Redis or Vercel KV configuration found!')
    console.log('Please add one of the following to .env.local:')
    console.log('  - REDIS_URL=redis://...')
    console.log('  - KV_REST_API_URL and KV_REST_API_TOKEN for Vercel KV')
    return
  }

  // Test 2: Try Redis connection
  if (redisUrl) {
    console.log('\n🔗 Testing Redis connection...')
    try {
      const { createClient } = await import('redis')
      const client = createClient({
        url: redisUrl,
        socket: {
          connectTimeout: 10000,
          keepAlive: 30000
        }
      })
      
      client.on('error', (err) => {
        console.error('Redis Client Error:', err)
      })
      
      await client.connect()
      console.log('✅ Successfully connected to Redis')
      
      // Test basic operations
      console.log('\n📝 Testing basic Redis operations...')
      
      // Set a test value
      await client.set('test:connection', JSON.stringify({ 
        timestamp: new Date().toISOString(),
        message: 'Test successful'
      }))
      console.log('✅ SET operation successful')
      
      // Get the test value
      const testValue = await client.get('test:connection')
      console.log('✅ GET operation successful:', testValue ? JSON.parse(testValue) : null)
      
      // Check for inventory data
      console.log('\n📦 Checking for cached inventory data...')
      const inventoryData = await client.get('inventory:full')
      if (inventoryData) {
        const inventory = JSON.parse(inventoryData)
        console.log(`✅ Found cached inventory: ${Array.isArray(inventory) ? inventory.length : 0} items`)
        if (Array.isArray(inventory) && inventory.length > 0) {
          console.log('Sample item:', JSON.stringify(inventory[0], null, 2))
        }
      } else {
        console.log('⚠️  No cached inventory data found')
        console.log('Run sync to populate: npm run sync-finale')
      }
      
      // Check for vendors data
      console.log('\n👥 Checking for cached vendors data...')
      const vendorsData = await client.get('vendors:full')
      if (vendorsData) {
        const vendors = JSON.parse(vendorsData)
        console.log(`✅ Found cached vendors: ${Array.isArray(vendors) ? vendors.length : 0} vendors`)
      } else {
        console.log('⚠️  No cached vendors data found')
      }
      
      // Check last sync time
      console.log('\n⏰ Checking last sync time...')
      const lastSync = await client.get('inventory:last_sync')
      if (lastSync) {
        console.log(`✅ Last sync: ${lastSync}`)
      } else {
        console.log('⚠️  No sync history found')
      }
      
      // List all keys
      console.log('\n🗂️  Listing all cache keys...')
      const keys = await client.keys('*')
      console.log(`Found ${keys.length} keys in Redis:`)
      keys.slice(0, 20).forEach(key => console.log(`  - ${key}`))
      if (keys.length > 20) {
        console.log(`  ... and ${keys.length - 20} more`)
      }
      
      // Clean up
      await client.del('test:connection')
      await client.disconnect()
      console.log('\n✅ Redis test completed successfully')
      
    } catch (error) {
      console.error('\n❌ Redis connection failed:', error)
      console.log('\nPossible issues:')
      console.log('  - Invalid Redis URL format')
      console.log('  - Redis server is not accessible')
      console.log('  - Authentication credentials are incorrect')
    }
  }

  // Test 3: Try Vercel KV connection
  if (kvRestApiUrl && kvRestApiToken) {
    console.log('\n🔗 Testing Vercel KV connection...')
    try {
      // Test with REST API
      const response = await fetch(`${kvRestApiUrl}/get/test:connection`, {
        headers: {
          Authorization: `Bearer ${kvRestApiToken}`
        }
      })
      
      if (response.ok) {
        console.log('✅ Successfully connected to Vercel KV')
        const data = await response.json()
        console.log('Response:', data)
      } else {
        console.log(`⚠️  KV responded with status: ${response.status}`)
      }
      
      // Check for inventory data
      console.log('\n📦 Checking for cached inventory in KV...')
      const invResponse = await fetch(`${kvRestApiUrl}/get/inventory:full`, {
        headers: {
          Authorization: `Bearer ${kvRestApiToken}`
        }
      })
      
      if (invResponse.ok) {
        const invData = await invResponse.json()
        if (invData.result) {
          const inventory = JSON.parse(invData.result)
          console.log(`✅ Found cached inventory: ${Array.isArray(inventory) ? inventory.length : 0} items`)
        } else {
          console.log('⚠️  No cached inventory data found in KV')
        }
      }
      
    } catch (error) {
      console.error('\n❌ Vercel KV connection failed:', error)
    }
  }

  // Test 4: Check environment for Finale configuration
  console.log('\n📊 Checking Finale API configuration...')
  const finaleApiKey = process.env.FINALE_API_KEY
  const finaleApiSecret = process.env.FINALE_API_SECRET
  const finaleAccountPath = process.env.FINALE_ACCOUNT_PATH
  const finaleInventoryReportUrl = process.env.FINALE_INVENTORY_REPORT_URL
  const finaleVendorsReportUrl = process.env.FINALE_VENDORS_REPORT_URL
  
  console.log('Finale API Key:', finaleApiKey ? '✅ Found' : '❌ Missing')
  console.log('Finale API Secret:', finaleApiSecret ? '✅ Found' : '❌ Missing')
  console.log('Finale Account Path:', finaleAccountPath ? '✅ Found' : '❌ Missing')
  console.log('Inventory Report URL:', finaleInventoryReportUrl ? '✅ Found' : '❌ Missing')
  console.log('Vendors Report URL:', finaleVendorsReportUrl ? '✅ Found' : '❌ Missing')
  
  if (!finaleApiKey && !finaleInventoryReportUrl) {
    console.log('\n⚠️  No Finale configuration found!')
    console.log('You need either:')
    console.log('  1. API credentials (FINALE_API_KEY, FINALE_API_SECRET, FINALE_ACCOUNT_PATH)')
    console.log('  2. Report URLs (FINALE_INVENTORY_REPORT_URL, FINALE_VENDORS_REPORT_URL)')
  }

  console.log('\n========================================')
  console.log('📊 TEST SUMMARY')
  console.log('========================================')
  
  const hasRedis = !!redisUrl || !!(kvRestApiUrl && kvRestApiToken)
  const hasFinale = !!(finaleApiKey && finaleApiSecret) || !!finaleInventoryReportUrl
  
  if (hasRedis && hasFinale) {
    console.log('✅ System is properly configured!')
    console.log('\nNext steps:')
    console.log('  1. Run data sync: npm run sync-finale')
    console.log('  2. Check the app: npm run dev')
  } else {
    if (!hasRedis) {
      console.log('❌ Redis/KV storage is not configured')
    }
    if (!hasFinale) {
      console.log('❌ Finale data source is not configured')
    }
    console.log('\nPlease configure missing components in .env.local')
  }
}

// Run the test
testRedisConnection().catch(error => {
  console.error('\n❌ Test script failed:', error)
  process.exit(1)
})
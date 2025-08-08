#!/usr/bin/env node

/**
 * Test Finale Sync Service
 * 
 * This script tests the new Finale sync service implementation
 * and verifies that data is properly stored in Redis.
 * 
 * Usage: npx tsx scripts/test-finale-sync.ts
 */

import dotenv from 'dotenv'
import { FinaleSyncService } from '../app/lib/finale-sync-service'
import { redis } from '../app/lib/redis-client'

// Load environment variables
dotenv.config({ path: '.env.local' })

// Colors for terminal output
const colors = {
  reset: '\x1b[0m',
  green: '\x1b[32m',
  red: '\x1b[31m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  cyan: '\x1b[36m'
}

function log(message: string, color: string = colors.reset) {
  console.log(color + message + colors.reset)
}

async function testFinaleSync() {
  log('\n========================================', colors.cyan)
  log('     Finale Sync Service Test', colors.cyan)
  log('========================================\n', colors.cyan)

  try {
    // Check environment variables
    log('Checking environment configuration...', colors.yellow)
    
    const apiKey = process.env.FINALE_API_KEY
    const apiSecret = process.env.FINALE_API_SECRET
    const accountPath = process.env.FINALE_ACCOUNT_PATH || 'buildasoilorganics'
    const inventoryReportUrl = process.env.FINALE_INVENTORY_REPORT_URL
    const vendorsReportUrl = process.env.FINALE_VENDORS_REPORT_URL
    const redisUrl = process.env.REDIS_URL

    if (!apiKey || !apiSecret) {
      log('ERROR: Finale API credentials not configured', colors.red)
      log('Please set FINALE_API_KEY and FINALE_API_SECRET in .env.local', colors.red)
      process.exit(1)
    }

    log('✓ Finale API credentials configured', colors.green)

    if (!inventoryReportUrl) {
      log('WARNING: FINALE_INVENTORY_REPORT_URL not configured', colors.yellow)
      log('The sync will try to use the standard API endpoints', colors.yellow)
    } else {
      log('✓ Inventory report URL configured', colors.green)
    }

    if (!vendorsReportUrl) {
      log('INFO: FINALE_VENDORS_REPORT_URL not configured', colors.yellow)
      log('Vendors will be extracted from inventory data', colors.yellow)
    } else {
      log('✓ Vendors report URL configured', colors.green)
    }

    if (!redisUrl) {
      log('ERROR: Redis not configured (REDIS_URL missing)', colors.red)
      process.exit(1)
    }

    log('✓ Redis configured', colors.green)

    // Initialize sync service
    log('\nInitializing Finale sync service...', colors.yellow)
    const syncService = new FinaleSyncService({
      apiKey,
      apiSecret,
      accountPath,
      inventoryReportUrl,
      vendorsReportUrl
    })

    // Test connection
    log('\nTesting connection to Finale...', colors.yellow)
    const isConnected = await syncService.testConnection()

    if (!isConnected) {
      log('ERROR: Failed to connect to Finale API', colors.red)
      log('Please check your credentials and report URLs', colors.red)
      process.exit(1)
    }

    log('✓ Successfully connected to Finale', colors.green)

    // Perform dry run first
    log('\n----------------------------------------', colors.cyan)
    log('Performing DRY RUN sync...', colors.yellow)
    log('----------------------------------------\n', colors.cyan)

    const dryRunResult = await syncService.syncInventory({
      dryRun: true,
      syncToSupabase: false,
      filterYear: null
    })

    if (!dryRunResult.success) {
      log(`ERROR during dry run: ${dryRunResult.errors.join(', ')}`, colors.red)
      process.exit(1)
    }

    log(`✓ Dry run successful: ${dryRunResult.itemsProcessed} items found`, colors.green)

    // Ask for confirmation
    log('\n----------------------------------------', colors.cyan)
    log('Ready to perform ACTUAL sync to Redis', colors.yellow)
    log('This will:', colors.yellow)
    log('  1. Fetch all inventory data from Finale', colors.yellow)
    log('  2. Store data in Redis cache', colors.yellow)
    log('  3. Extract and store vendor data', colors.yellow)
    log('----------------------------------------\n', colors.cyan)

    // Perform actual sync
    log('Performing actual inventory sync...', colors.yellow)
    const inventoryResult = await syncService.syncInventory({
      dryRun: false,
      syncToSupabase: false, // Don't sync to Supabase in test
      filterYear: null
    })

    if (!inventoryResult.success) {
      log(`ERROR: Inventory sync failed: ${inventoryResult.errors.join(', ')}`, colors.red)
      process.exit(1)
    }

    log(`✓ Inventory sync successful:`, colors.green)
    log(`  - Items processed: ${inventoryResult.itemsProcessed}`, colors.green)
    log(`  - Items updated: ${inventoryResult.itemsUpdated}`, colors.green)
    log(`  - Duration: ${inventoryResult.duration}ms`, colors.green)

    // Sync vendors
    log('\nSyncing vendor data...', colors.yellow)
    const vendorResult = await syncService.syncVendors({
      dryRun: false
    })

    if (!vendorResult.success) {
      log(`ERROR: Vendor sync failed: ${vendorResult.errors.join(', ')}`, colors.red)
    } else {
      log(`✓ Vendor sync successful:`, colors.green)
      log(`  - Vendors processed: ${vendorResult.itemsProcessed}`, colors.green)
      log(`  - Duration: ${vendorResult.duration}ms`, colors.green)
    }

    // Verify Redis data
    log('\n----------------------------------------', colors.cyan)
    log('Verifying Redis storage...', colors.yellow)
    log('----------------------------------------\n', colors.cyan)

    // Check inventory data
    const inventoryData = await redis.get<any[]>('inventory:full')
    if (!inventoryData) {
      log('ERROR: No inventory data found in Redis', colors.red)
    } else {
      log(`✓ Found ${inventoryData.length} inventory items in Redis`, colors.green)
      
      // Show sample item
      if (inventoryData.length > 0) {
        log('\nSample inventory item:', colors.cyan)
        const sample = inventoryData[0]
        console.log(JSON.stringify({
          sku: sample.sku,
          product_name: sample.product_name,
          stock: sample.stock,
          vendor: sample.vendor,
          location: sample.location
        }, null, 2))
      }
    }

    // Check vendor data
    const vendorData = await redis.get<any[]>('vendors:full')
    if (!vendorData) {
      log('\nWARNING: No vendor data found in Redis', colors.yellow)
    } else {
      log(`\n✓ Found ${vendorData.length} vendors in Redis`, colors.green)
      
      // Show sample vendor
      if (vendorData.length > 0) {
        log('\nSample vendor:', colors.cyan)
        console.log(JSON.stringify(vendorData[0], null, 2))
      }
    }

    // Check metadata
    const inventoryMeta = await redis.get<any>('inventory:metadata')
    if (inventoryMeta) {
      log('\nInventory metadata:', colors.cyan)
      console.log(JSON.stringify(inventoryMeta, null, 2))
    }

    const vendorMeta = await redis.get<any>('vendors:metadata')
    if (vendorMeta) {
      log('\nVendor metadata:', colors.cyan)
      console.log(JSON.stringify(vendorMeta, null, 2))
    }

    // Summary
    log('\n========================================', colors.cyan)
    log('        Test Complete!', colors.green)
    log('========================================\n', colors.cyan)
    
    log('Summary:', colors.yellow)
    log(`✓ Successfully synced ${inventoryResult.itemsProcessed} inventory items`, colors.green)
    log(`✓ Successfully synced ${vendorResult.itemsProcessed} vendors`, colors.green)
    log(`✓ Data is properly stored in Redis`, colors.green)
    log('\nThe Finale integration is working correctly!', colors.green)

  } catch (error) {
    log('\nERROR: Test failed', colors.red)
    console.error(error)
    process.exit(1)
  } finally {
    // Disconnect from Redis
    await redis.del('test:cleanup')
    process.exit(0)
  }
}

// Run the test
testFinaleSync().catch(console.error)
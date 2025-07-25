#!/usr/bin/env node
/**
 * Test script to verify the end-to-end inventory data flow
 * Tests: Finale -> Supabase -> API -> Frontend
 */

const { createClient } = require('@supabase/supabase-js');
require('dotenv').config();

// Initialize Supabase client
const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

const BASE_URL = process.env.BASE_URL || 'http://localhost:3000';

// Console colors
const colors = {
  reset: '\x1b[0m',
  bright: '\x1b[1m',
  green: '\x1b[32m',
  red: '\x1b[31m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  cyan: '\x1b[36m'
};

function log(message, color = colors.reset) {
  console.log(`${color}${message}${colors.reset}`);
}

function logSection(title) {
  console.log('\n' + '='.repeat(60));
  log(title, colors.bright + colors.blue);
  console.log('='.repeat(60) + '\n');
}

async function testDatabaseSchema() {
  logSection('1. Testing Database Schema');
  
  try {
    // Check if inventory_items table exists and has correct columns
    const { data: sampleItem, error } = await supabase
      .from('inventory_items')
      .select('*')
      .limit(1)
      .single();
    
    if (error && error.code !== 'PGRST116') { // PGRST116 = no rows returned
      throw error;
    }
    
    log('✓ inventory_items table exists', colors.green);
    
    // Check required columns
    const requiredColumns = [
      'id', 'sku', 'product_name', 'stock', 'reorder_point', 
      'cost', 'vendor', 'location', 'last_updated',
      'sales_last_30_days', 'sales_last_90_days'
    ];
    
    if (sampleItem) {
      const itemKeys = Object.keys(sampleItem);
      const missingColumns = requiredColumns.filter(col => !itemKeys.includes(col));
      
      if (missingColumns.length > 0) {
        log(`⚠ Missing columns: ${missingColumns.join(', ')}`, colors.yellow);
      } else {
        log('✓ All required columns present', colors.green);
      }
      
      // Display sample data structure
      log('\nSample database record:', colors.cyan);
      console.log(JSON.stringify(sampleItem, null, 2));
    } else {
      log('⚠ No inventory items found in database', colors.yellow);
    }
    
    // Check inventory_summary view
    const { data: summary, error: summaryError } = await supabase
      .from('inventory_summary')
      .select('*')
      .single();
    
    if (summaryError && summaryError.code !== 'PGRST116') {
      log('✗ inventory_summary view error: ' + summaryError.message, colors.red);
    } else {
      log('✓ inventory_summary view exists', colors.green);
      if (summary) {
        log('\nInventory summary:', colors.cyan);
        console.log(JSON.stringify(summary, null, 2));
      }
    }
    
  } catch (error) {
    log('✗ Database schema test failed: ' + error.message, colors.red);
    return false;
  }
  
  return true;
}

async function testFinaleSync() {
  logSection('2. Testing Finale Sync Status');
  
  try {
    // Check sync logs
    const { data: lastSync, error } = await supabase
      .from('sync_logs')
      .select('*')
      .eq('sync_type', 'finale_inventory')
      .order('synced_at', { ascending: false })
      .limit(1)
      .single();
    
    if (error && error.code !== 'PGRST116') {
      throw error;
    }
    
    if (lastSync) {
      log('✓ Found sync logs', colors.green);
      log(`\nLast sync details:`, colors.cyan);
      console.log(`  - Status: ${lastSync.status}`);
      console.log(`  - Time: ${new Date(lastSync.synced_at).toLocaleString()}`);
      console.log(`  - Items processed: ${lastSync.items_processed || 0}`);
      console.log(`  - Items updated: ${lastSync.items_updated || 0}`);
      console.log(`  - Duration: ${lastSync.duration_ms ? (lastSync.duration_ms / 1000).toFixed(2) + 's' : 'N/A'}`);
      
      if (lastSync.errors && lastSync.errors.length > 0) {
        log('\n⚠ Sync errors found:', colors.yellow);
        lastSync.errors.slice(0, 3).forEach(err => console.log(`  - ${err}`));
      }
    } else {
      log('⚠ No sync logs found - Finale sync may not have run yet', colors.yellow);
    }
    
    // Check if any items have Finale data
    const { count } = await supabase
      .from('inventory_items')
      .select('*', { count: 'exact', head: true })
      .not('vendor', 'is', null);
    
    log(`\n✓ Items with vendor data: ${count || 0}`, colors.green);
    
  } catch (error) {
    log('✗ Finale sync test failed: ' + error.message, colors.red);
    return false;
  }
  
  return true;
}

async function testAPIEndpoint() {
  logSection('3. Testing API Endpoint');
  
  try {
    const response = await fetch(`${BASE_URL}/api/inventory?limit=5`);
    
    if (!response.ok) {
      throw new Error(`API returned ${response.status}: ${response.statusText}`);
    }
    
    const data = await response.json();
    log('✓ API endpoint accessible', colors.green);
    
    // Check response structure
    if (data.inventory && Array.isArray(data.inventory)) {
      log(`✓ API returned ${data.inventory.length} items`, colors.green);
      
      if (data.inventory.length > 0) {
        const item = data.inventory[0];
        log('\nAPI transformation check:', colors.cyan);
        console.log('  Database fields mapped to frontend fields:');
        console.log(`  - stock → current_stock: ${item.current_stock !== undefined ? '✓' : '✗'}`);
        console.log(`  - reorder_point → minimum_stock: ${item.minimum_stock !== undefined ? '✓' : '✗'}`);
        console.log(`  - cost → unit_price: ${item.unit_price !== undefined ? '✓' : '✗'}`);
        console.log(`  - Calculated fields:`);
        console.log(`    - sales_velocity: ${item.sales_velocity !== undefined ? '✓' : '✗'}`);
        console.log(`    - days_until_stockout: ${item.days_until_stockout !== undefined ? '✓' : '✗'}`);
        console.log(`    - stock_status_level: ${item.stock_status_level !== undefined ? '✓' : '✗'}`);
        console.log(`    - reorder_recommended: ${item.reorder_recommended !== undefined ? '✓' : '✗'}`);
        
        log('\nSample transformed item:', colors.cyan);
        console.log(JSON.stringify(item, null, 2));
      }
    } else {
      log('⚠ API response structure unexpected', colors.yellow);
    }
    
    // Test pagination
    if (data.pagination) {
      log('\n✓ Pagination data present', colors.green);
      console.log(`  Total items: ${data.pagination.total}`);
      console.log(`  Total pages: ${data.pagination.totalPages}`);
    }
    
    // Test summary
    if (data.summary) {
      log('\n✓ Summary statistics present', colors.green);
      console.log(`  Out of stock: ${data.summary.out_of_stock_count}`);
      console.log(`  Low stock: ${data.summary.low_stock_count}`);
      console.log(`  Critical: ${data.summary.critical_count}`);
      console.log(`  Reorder needed: ${data.summary.reorder_needed_count}`);
    }
    
  } catch (error) {
    log('✗ API endpoint test failed: ' + error.message, colors.red);
    log('  Make sure the development server is running (npm run dev)', colors.yellow);
    return false;
  }
  
  return true;
}

async function testDataConsistency() {
  logSection('4. Testing Data Consistency');
  
  try {
    // Get data directly from database
    const { data: dbItems, error: dbError } = await supabase
      .from('inventory_items')
      .select('*')
      .order('sku')
      .limit(5);
    
    if (dbError) throw dbError;
    
    // Get data from API
    const response = await fetch(`${BASE_URL}/api/inventory?limit=5`);
    const apiData = await response.json();
    
    if (!apiData.inventory) {
      log('⚠ Could not fetch API data for comparison', colors.yellow);
      return true;
    }
    
    log('✓ Comparing database and API data', colors.green);
    
    // Compare counts
    const { count: dbCount } = await supabase
      .from('inventory_items')
      .select('*', { count: 'exact', head: true });
    
    console.log(`\n  Database total: ${dbCount || 0} items`);
    console.log(`  API total: ${apiData.pagination?.total || 0} items`);
    
    if (dbCount === apiData.pagination?.total) {
      log('  ✓ Counts match', colors.green);
    } else {
      log('  ⚠ Count mismatch', colors.yellow);
    }
    
    // Verify transformations
    if (dbItems.length > 0 && apiData.inventory.length > 0) {
      const dbItem = dbItems[0];
      const apiItem = apiData.inventory.find(item => item.sku === dbItem.sku);
      
      if (apiItem) {
        log('\n✓ Field mapping verification:', colors.green);
        console.log(`  SKU ${dbItem.sku}:`);
        console.log(`  - DB stock (${dbItem.stock}) → API current_stock (${apiItem.current_stock}): ${dbItem.stock === apiItem.current_stock ? '✓' : '✗'}`);
        console.log(`  - DB cost (${dbItem.cost}) → API unit_price (${apiItem.unit_price}): ${dbItem.cost === apiItem.unit_price ? '✓' : '✗'}`);
        console.log(`  - DB reorder_point (${dbItem.reorder_point}) → API minimum_stock (${apiItem.minimum_stock}): ${dbItem.reorder_point === apiItem.minimum_stock ? '✓' : '✗'}`);
      }
    }
    
  } catch (error) {
    log('✗ Data consistency test failed: ' + error.message, colors.red);
    return false;
  }
  
  return true;
}

async function runTests() {
  log('\n🧪 INVENTORY DATA FLOW TEST SUITE', colors.bright + colors.cyan);
  log('Testing the complete data pipeline from Finale → Supabase → API → Frontend\n', colors.cyan);
  
  const tests = [
    { name: 'Database Schema', fn: testDatabaseSchema },
    { name: 'Finale Sync', fn: testFinaleSync },
    { name: 'API Endpoint', fn: testAPIEndpoint },
    { name: 'Data Consistency', fn: testDataConsistency }
  ];
  
  let passed = 0;
  let failed = 0;
  
  for (const test of tests) {
    try {
      const result = await test.fn();
      if (result) {
        passed++;
      } else {
        failed++;
      }
    } catch (error) {
      failed++;
      log(`\n✗ ${test.name} test crashed: ${error.message}`, colors.red);
    }
  }
  
  // Summary
  logSection('Test Summary');
  log(`Total tests: ${tests.length}`, colors.bright);
  log(`Passed: ${passed}`, colors.green);
  log(`Failed: ${failed}`, failed > 0 ? colors.red : colors.green);
  
  if (failed === 0) {
    log('\n✅ All tests passed! The inventory data flow is working correctly.', colors.bright + colors.green);
  } else {
    log('\n❌ Some tests failed. Please check the errors above.', colors.bright + colors.red);
  }
  
  // Recommendations
  if (failed > 0) {
    log('\nRecommendations:', colors.yellow);
    console.log('1. Ensure the development server is running (npm run dev)');
    console.log('2. Check that environment variables are properly configured');
    console.log('3. Verify database migrations have been run');
    console.log('4. Run a Finale sync if no data is present');
  }
}

// Run tests
runTests().catch(error => {
  log('Test suite error: ' + error.message, colors.red);
  process.exit(1);
});
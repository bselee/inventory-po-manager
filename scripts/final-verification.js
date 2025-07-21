// Final verification of the sync system
const https = require('https');
const { createClient } = require('@supabase/supabase-js');

// Credentials
const apiKey = 'I9TVdRvblFod';
const apiSecret = '63h4TCI62vlQUYM3btEA7bycoIflGQUz';
const accountPath = 'buildasoilorganics';
const authString = Buffer.from(`${apiKey}:${apiSecret}`).toString('base64');

const supabaseUrl = 'https://htsconqmnzthnkvogbwu.supabase.co';
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imh0c2NvbnFtbnp0aG5rdm9nYnd1Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTI2MDU3NzUsImV4cCI6MjA2ODE4MTc3NX0.AVyKmrQey0wZx6DfWkZv3OYjCzrHeLguw5lv7uVg1wY';
const supabase = createClient(supabaseUrl, supabaseKey);

async function finalVerification() {
  console.log('🔍 FINAL VERIFICATION OF SYNC SYSTEM\n');
  console.log('=' .repeat(60));
  
  const issues = [];
  const successes = [];
  
  // 1. Test Finale API endpoints
  console.log('\n1. TESTING FINALE API ENDPOINTS');
  console.log('-'.repeat(40));
  
  // Test product endpoint
  try {
    const productUrl = `https://app.finaleinventory.com/${accountPath}/api/product?limit=1`;
    const productData = await fetchUrl(productUrl);
    if (productData && productData.productId) {
      successes.push('✅ Product endpoint working');
      console.log('✅ Product endpoint: Working');
    } else {
      issues.push('❌ Product endpoint not returning expected data');
      console.log('❌ Product endpoint: No data');
    }
  } catch (e) {
    issues.push(`❌ Product endpoint error: ${e.message}`);
    console.log('❌ Product endpoint:', e.message);
  }
  
  // Test inventory endpoint WITH trailing slash
  try {
    const invUrl = `https://app.finaleinventory.com/${accountPath}/api/inventoryitem/?limit=10`;
    const invData = await fetchUrl(invUrl);
    if (invData && invData.productId && invData.quantityOnHand) {
      successes.push('✅ Inventory endpoint working (with trailing slash)');
      console.log('✅ Inventory endpoint: Working');
      console.log(`   Sample: ${invData.productId[0]} has ${invData.quantityOnHand[0]} units`);
    } else {
      issues.push('❌ Inventory endpoint not returning quantity data');
      console.log('❌ Inventory endpoint: No quantity data');
    }
  } catch (e) {
    issues.push(`❌ Inventory endpoint error: ${e.message}`);
    console.log('❌ Inventory endpoint:', e.message);
  }
  
  // 2. Check database schema
  console.log('\n\n2. CHECKING DATABASE SCHEMA');
  console.log('-'.repeat(40));
  
  const { data: sampleItem, error: dbError } = await supabase
    .from('inventory_items')
    .select('*')
    .limit(1)
    .maybeSingle();
  
  if (dbError) {
    issues.push(`❌ Database error: ${dbError.message}`);
    console.log('❌ Database error:', dbError.message);
  } else if (sampleItem) {
    const requiredColumns = ['sku', 'product_name', 'stock', 'location', 'cost'];
    const hasAllColumns = requiredColumns.every(col => col in sampleItem);
    
    if (hasAllColumns) {
      successes.push('✅ Database schema correct');
      console.log('✅ Database schema: All required columns present');
    } else {
      const missing = requiredColumns.filter(col => !(col in sampleItem));
      issues.push(`❌ Missing columns: ${missing.join(', ')}`);
      console.log('❌ Missing columns:', missing);
    }
  }
  
  // 3. Check data actually synced
  console.log('\n\n3. CHECKING SYNCED DATA');
  console.log('-'.repeat(40));
  
  const { count, error: countError } = await supabase
    .from('inventory_items')
    .select('*', { count: 'exact', head: true });
  
  if (!countError && count > 0) {
    successes.push(`✅ Found ${count} items in database`);
    console.log(`✅ Items in database: ${count}`);
    
    // Check for items with stock
    const { count: stockCount } = await supabase
      .from('inventory_items')
      .select('*', { count: 'exact', head: true })
      .gt('stock', 0);
    
    if (stockCount > 0) {
      successes.push(`✅ Found ${stockCount} items with stock > 0`);
      console.log(`✅ Items with stock: ${stockCount}`);
    } else {
      issues.push('⚠️  No items have stock > 0 (might be correct if inventory is empty)');
      console.log('⚠️  No items with stock');
    }
  } else {
    issues.push('❌ No data in inventory_items table');
    console.log('❌ No data synced');
  }
  
  // 4. Check sync logs
  console.log('\n\n4. CHECKING SYNC LOGS');
  console.log('-'.repeat(40));
  
  const { data: recentSyncs } = await supabase
    .from('sync_logs')
    .select('*')
    .eq('sync_type', 'finale_inventory')
    .order('synced_at', { ascending: false })
    .limit(3);
  
  if (recentSyncs && recentSyncs.length > 0) {
    const successful = recentSyncs.filter(s => s.status === 'success').length;
    const failed = recentSyncs.filter(s => s.status === 'error').length;
    
    console.log(`Recent syncs: ${successful} successful, ${failed} failed`);
    
    const lastSync = recentSyncs[0];
    if (lastSync.status === 'success') {
      successes.push('✅ Last sync was successful');
      console.log('✅ Last sync: Success');
    } else {
      issues.push(`❌ Last sync failed: ${lastSync.errors?.[0] || 'Unknown error'}`);
      console.log('❌ Last sync:', lastSync.status);
    }
  }
  
  // 5. Test the sync method mapping
  console.log('\n\n5. TESTING DATA MAPPING');
  console.log('-'.repeat(40));
  
  // Check if transformToInventoryItem is mapping correctly
  const { data: mappedItem } = await supabase
    .from('inventory_items')
    .select('*')
    .order('last_updated', { ascending: false })
    .limit(1)
    .maybeSingle();
  
  if (mappedItem) {
    console.log('Sample mapped item:');
    console.log(`  SKU: ${mappedItem.sku}`);
    console.log(`  Name: ${mappedItem.product_name}`);
    console.log(`  Stock: ${mappedItem.stock}`);
    console.log(`  Location: ${mappedItem.location}`);
    
    if (mappedItem.location === 'Shipping') {
      successes.push('✅ Location correctly set to "Shipping"');
    }
  }
  
  // 6. Check auto-sync configuration
  console.log('\n\n6. CHECKING AUTO-SYNC CONFIGURATION');
  console.log('-'.repeat(40));
  
  const { data: settings } = await supabase
    .from('settings')
    .select('sync_enabled, sync_frequency_minutes')
    .maybeSingle();
  
  if (settings?.sync_enabled) {
    successes.push('✅ Auto-sync is enabled');
    console.log(`✅ Auto-sync: Enabled (every ${settings.sync_frequency_minutes} minutes)`);
  } else {
    issues.push('❌ Auto-sync is disabled');
    console.log('❌ Auto-sync: Disabled');
  }
  
  // FINAL SUMMARY
  console.log('\n\n' + '='.repeat(60));
  console.log('📊 VERIFICATION SUMMARY\n');
  
  console.log(`✅ Successes (${successes.length}):`);
  successes.forEach(s => console.log(`   ${s}`));
  
  if (issues.length > 0) {
    console.log(`\n❌ Issues (${issues.length}):`);
    issues.forEach(i => console.log(`   ${i}`));
  }
  
  // RECOMMENDATIONS
  console.log('\n\n💡 RECOMMENDATIONS:');
  
  if (issues.length === 0) {
    console.log('✅ System appears to be working correctly!');
    console.log('   - Data is syncing from Finale to Supabase');
    console.log('   - Auto-sync is configured');
    console.log('   - Database schema is correct');
  } else {
    console.log('⚠️  Some issues need attention:');
    
    if (issues.some(i => i.includes('endpoint'))) {
      console.log('\n1. API Endpoint Issues:');
      console.log('   - Ensure the trailing slash on /inventoryitem/');
      console.log('   - Check Finale API credentials are valid');
      console.log('   - Verify the account has inventory module enabled');
    }
    
    if (issues.some(i => i.includes('No items have stock'))) {
      console.log('\n2. Inventory Data:');
      console.log('   - This might be normal if Finale has no stock');
      console.log('   - Check Finale UI to verify actual stock levels');
      console.log('   - Consider syncing a smaller date range first');
    }
    
    if (issues.some(i => i.includes('Auto-sync'))) {
      console.log('\n3. Auto-sync:');
      console.log('   - Enable in settings table');
      console.log('   - Check cron job configuration in vercel.json');
    }
  }
  
  // CONFIDENCE LEVEL
  const confidenceScore = (successes.length / (successes.length + issues.length)) * 100;
  console.log(`\n\n🎯 CONFIDENCE LEVEL: ${Math.round(confidenceScore)}%`);
  
  if (confidenceScore >= 80) {
    console.log('✅ HIGH CONFIDENCE - System should work in production');
  } else if (confidenceScore >= 60) {
    console.log('⚠️  MEDIUM CONFIDENCE - Some issues to address');
  } else {
    console.log('❌ LOW CONFIDENCE - Critical issues need fixing');
  }
}

async function fetchUrl(url) {
  return new Promise((resolve, reject) => {
    https.get(url, {
      headers: {
        'Authorization': `Basic ${authString}`,
        'Accept': 'application/json'
      }
    }, (res) => {
      let data = '';
      res.on('data', chunk => data += chunk);
      res.on('end', () => {
        if (res.statusCode === 200) {
          try {
            resolve(JSON.parse(data));
          } catch (e) {
            reject(new Error('Invalid JSON'));
          }
        } else {
          reject(new Error(`HTTP ${res.statusCode}`));
        }
      });
    }).on('error', reject);
  });
}

// Run verification
finalVerification().catch(console.error);
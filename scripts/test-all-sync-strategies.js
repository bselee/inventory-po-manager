// Comprehensive test of all sync strategies
const http = require('http');
const { createClient } = require('@supabase/supabase-js');

const supabaseUrl = 'https://htsconqmnzthnkvogbwu.supabase.co';
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imh0c2NvbnFtbnp0aG5rdm9nYnd1Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTI2MDU3NzUsImV4cCI6MjA2ODE4MTc3NX0.AVyKmrQey0wZx6DfWkZv3OYjCzrHeLguw5lv7uVg1wY';
const supabase = createClient(supabaseUrl, supabaseKey);

async function makeRequest(path, method = 'GET', body = null) {
  return new Promise((resolve, reject) => {
    const options = {
      hostname: 'localhost',
      port: 3000,
      path,
      method,
      headers: {
        'Content-Type': 'application/json'
      }
    };
    
    const req = http.request(options, (res) => {
      let data = '';
      res.on('data', chunk => data += chunk);
      res.on('end', () => {
        try {
          resolve({
            status: res.statusCode,
            data: JSON.parse(data)
          });
        } catch (e) {
          resolve({
            status: res.statusCode,
            data: data
          });
        }
      });
    });
    
    req.on('error', reject);
    
    if (body) {
      req.write(JSON.stringify(body));
    }
    
    req.end();
  });
}

async function testAllStrategies() {
  console.log('🧪 TESTING ALL SYNC STRATEGIES\n');
  console.log('=' .repeat(60));
  
  const results = {
    passed: [],
    failed: []
  };
  
  // 1. Test current critical items check
  console.log('\n1. Checking critical items status...');
  try {
    const critical = await makeRequest('/api/sync-finale/critical');
    console.log(`✅ Out of stock: ${critical.data.outOfStock?.length || 0} items`);
    console.log(`✅ Below reorder: ${critical.data.belowReorder?.length || 0} items`);
    results.passed.push('Critical items check');
  } catch (e) {
    console.log('❌ Failed:', e.message);
    results.failed.push('Critical items check');
  }
  
  // 2. Test sync schedule endpoint
  console.log('\n2. Testing sync schedule configuration...');
  try {
    const schedule = await makeRequest('/api/sync-finale/schedule');
    console.log(`✅ Sync enabled: ${schedule.data.enabled}`);
    console.log(`✅ Current interval: ${schedule.data.currentInterval} minutes`);
    
    if (schedule.data.schedules) {
      console.log('\nSchedule Status:');
      Object.entries(schedule.data.schedules).forEach(([key, sched]) => {
        console.log(`  ${key}: ${sched.description}`);
        console.log(`    Last sync: ${sched.lastSync ? new Date(sched.lastSync).toLocaleString() : 'Never'}`);
      });
    }
    results.passed.push('Schedule configuration');
  } catch (e) {
    console.log('❌ Failed:', e.message);
    results.failed.push('Schedule configuration');
  }
  
  // 3. Test inventory-only sync (fastest)
  console.log('\n3. Testing INVENTORY-ONLY sync (stock levels only)...');
  try {
    console.log('   ⏳ Running inventory sync (this should be fast)...');
    const startTime = Date.now();
    
    const invSync = await makeRequest('/api/sync-finale/inventory', 'POST');
    const duration = Date.now() - startTime;
    
    if (invSync.data.success) {
      console.log(`   ✅ Success! Synced ${invSync.data.itemsUpdated} items in ${Math.round(duration / 1000)}s`);
      console.log(`   ✅ Strategy: ${invSync.data.strategy}`);
      console.log(`   ✅ Critical items found: ${invSync.data.criticalItems?.length || 0}`);
      results.passed.push('Inventory-only sync');
    } else {
      console.log(`   ❌ Failed: ${invSync.data.error}`);
      results.failed.push('Inventory-only sync');
    }
  } catch (e) {
    console.log('   ❌ Error:', e.message);
    results.failed.push('Inventory-only sync');
  }
  
  // 4. Test critical items sync
  console.log('\n4. Testing CRITICAL ITEMS sync...');
  try {
    console.log('   ⏳ Syncing critical items...');
    
    const critSync = await makeRequest('/api/sync-finale/critical', 'POST');
    
    if (critSync.data.success) {
      console.log(`   ✅ Success! Processed ${critSync.data.itemsProcessed} critical items`);
      console.log(`   ✅ Out of stock: ${critSync.data.outOfStock || 0}`);
      console.log(`   ✅ Below reorder: ${critSync.data.belowReorder || 0}`);
      results.passed.push('Critical items sync');
    } else {
      console.log(`   ❌ Failed: ${critSync.data.error || critSync.data.message}`);
      results.failed.push('Critical items sync');
    }
  } catch (e) {
    console.log('   ❌ Error:', e.message);
    results.failed.push('Critical items sync');
  }
  
  // 5. Test smart sync
  console.log('\n5. Testing SMART sync (auto-selects strategy)...');
  try {
    console.log('   ⏳ Running smart sync...');
    
    const smartSync = await makeRequest('/api/sync-finale', 'POST', { strategy: 'smart' });
    
    if (smartSync.data.success) {
      console.log(`   ✅ Success! Strategy selected: ${smartSync.data.strategy}`);
      console.log(`   ✅ Items processed: ${smartSync.data.itemsProcessed || smartSync.data.processed}`);
      console.log(`   ✅ Message: ${smartSync.data.message}`);
      results.passed.push('Smart sync');
    } else {
      console.log(`   ❌ Failed: ${smartSync.data.error}`);
      results.failed.push('Smart sync');
    }
  } catch (e) {
    console.log('   ❌ Error:', e.message);
    results.failed.push('Smart sync');
  }
  
  // 6. Verify data integrity
  console.log('\n6. Verifying data integrity...');
  try {
    // Check that we have inventory data
    const { count: totalItems } = await supabase
      .from('inventory_items')
      .select('*', { count: 'exact', head: true });
    
    console.log(`   ✅ Total items in database: ${totalItems}`);
    
    // Check items with stock
    const { count: itemsWithStock } = await supabase
      .from('inventory_items')
      .select('*', { count: 'exact', head: true })
      .gt('stock', 0);
    
    console.log(`   ✅ Items with stock > 0: ${itemsWithStock}`);
    
    // Check recent updates
    const { data: recentUpdates } = await supabase
      .from('inventory_items')
      .select('sku, stock, last_updated')
      .order('last_updated', { ascending: false })
      .limit(5);
    
    if (recentUpdates && recentUpdates.length > 0) {
      console.log('\n   Recent updates:');
      recentUpdates.forEach(item => {
        const age = Math.round((Date.now() - new Date(item.last_updated).getTime()) / 1000 / 60);
        console.log(`   - ${item.sku}: ${item.stock} units (updated ${age} min ago)`);
      });
    }
    
    results.passed.push('Data integrity');
  } catch (e) {
    console.log('   ❌ Error:', e.message);
    results.failed.push('Data integrity');
  }
  
  // 7. Test sync status endpoint
  console.log('\n7. Testing sync status endpoint...');
  try {
    const status = await makeRequest('/api/sync-finale/status');
    
    if (status.data.isRunning) {
      console.log(`   ⏳ Sync currently running: ${status.data.progress}%`);
    } else {
      console.log(`   ✅ No sync running`);
    }
    
    if (status.data.lastSync) {
      console.log(`   ✅ Last sync: ${new Date(status.data.lastSync.synced_at).toLocaleString()}`);
      console.log(`   ✅ Status: ${status.data.lastSync.status}`);
    }
    
    results.passed.push('Sync status');
  } catch (e) {
    console.log('   ❌ Error:', e.message);
    results.failed.push('Sync status');
  }
  
  // Final summary
  console.log('\n\n' + '=' .repeat(60));
  console.log('📊 TEST SUMMARY\n');
  
  console.log(`✅ Passed: ${results.passed.length} tests`);
  results.passed.forEach(test => console.log(`   - ${test}`));
  
  if (results.failed.length > 0) {
    console.log(`\n❌ Failed: ${results.failed.length} tests`);
    results.failed.forEach(test => console.log(`   - ${test}`));
  }
  
  const successRate = (results.passed.length / (results.passed.length + results.failed.length)) * 100;
  console.log(`\n🎯 Success Rate: ${Math.round(successRate)}%`);
  
  if (successRate === 100) {
    console.log('\n✅ ALL SYNC STRATEGIES ARE WORKING CORRECTLY!');
    console.log('\nRecommended sync schedule:');
    console.log('- Every 15 min: Critical items (out of stock alerts)');
    console.log('- Every hour: Inventory levels (stock updates)');
    console.log('- Daily: Active products (full details)');
    console.log('- Weekly: Full sync (maintenance)');
  } else {
    console.log('\n⚠️  Some issues need attention before production use');
  }
}

// Run all tests
testAllStrategies().catch(console.error);
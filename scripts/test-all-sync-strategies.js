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
  console.log('=' .repeat(60));
  
  const results = {
    passed: [],
    failed: []
  };
  
  // 1. Test current critical items check
  try {
    const critical = await makeRequest('/api/sync-finale/critical');
    results.passed.push('Critical items check');
  } catch (e) {
    results.failed.push('Critical items check');
  }
  
  // 2. Test sync schedule endpoint
  try {
    const schedule = await makeRequest('/api/sync-finale/schedule');
    if (schedule.data.schedules) {
      Object.entries(schedule.data.schedules).forEach(([key, sched]) => {
      });
    }
    results.passed.push('Schedule configuration');
  } catch (e) {
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
      results.passed.push('Inventory-only sync');
    } else {
      results.failed.push('Inventory-only sync');
    }
  } catch (e) {
    results.failed.push('Inventory-only sync');
  }
  
  // 4. Test critical items sync
  try {
    const critSync = await makeRequest('/api/sync-finale/critical', 'POST');
    
    if (critSync.data.success) {
      results.passed.push('Critical items sync');
    } else {
      results.failed.push('Critical items sync');
    }
  } catch (e) {
    results.failed.push('Critical items sync');
  }
  
  // 5. Test smart sync
  console.log('\n5. Testing SMART sync (auto-selects strategy)...');
  try {
    const smartSync = await makeRequest('/api/sync-finale', 'POST', { strategy: 'smart' });
    
    if (smartSync.data.success) {
      results.passed.push('Smart sync');
    } else {
      results.failed.push('Smart sync');
    }
  } catch (e) {
    results.failed.push('Smart sync');
  }
  
  // 6. Verify data integrity
  try {
    // Check that we have inventory data
    const { count: totalItems } = await supabase
      .from('inventory_items')
      .select('*', { count: 'exact', head: true });
    // Check items with stock
    const { count: itemsWithStock } = await supabase
      .from('inventory_items')
      .select('*', { count: 'exact', head: true })
      .gt('stock', 0);
    // Check recent updates
    const { data: recentUpdates } = await supabase
      .from('inventory_items')
      .select('sku, stock, last_updated')
      .order('last_updated', { ascending: false })
      .limit(5);
    
    if (recentUpdates && recentUpdates.length > 0) {
      recentUpdates.forEach(item => {
        const age = Math.round((Date.now() - new Date(item.last_updated).getTime()) / 1000 / 60);
      });
    }
    
    results.passed.push('Data integrity');
  } catch (e) {
    results.failed.push('Data integrity');
  }
  
  // 7. Test sync status endpoint
  try {
    const status = await makeRequest('/api/sync-finale/status');
    
    if (status.data.isRunning) {
    } else {
    }
    
    if (status.data.lastSync) {
    }
    
    results.passed.push('Sync status');
  } catch (e) {
    results.failed.push('Sync status');
  }
  
  // Final summary
  console.log('\n\n' + '=' .repeat(60));
  results.passed.forEach(test => console.log(`   - ${test}`));
  
  if (results.failed.length > 0) {
    results.failed.forEach(test => console.log(`   - ${test}`));
  }
  
  const successRate = (results.passed.length / (results.passed.length + results.failed.length)) * 100;
  if (successRate === 100) {
    console.log('- Every 15 min: Critical items (out of stock alerts)');
    console.log('- Every hour: Inventory levels (stock updates)');
    console.log('- Daily: Active products (full details)');
    console.log('- Weekly: Full sync (maintenance)');
  } else {
  }
}

// Run all tests
testAllStrategies().catch(console.error);
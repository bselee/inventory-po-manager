// Comprehensive Sync System Test
const https = require('https');
const http = require('http');

const BASE_URL = 'http://localhost:3000';

async function makeRequest(method, path, body = null) {
  return new Promise((resolve, reject) => {
    const options = {
      method,
      headers: {
        'Content-Type': 'application/json',
      }
    };
    
    const url = new URL(BASE_URL + path);
    const client = url.protocol === 'https:' ? https : http;
    
    const req = client.request(url, options, (res) => {
      let data = '';
      
      res.on('data', (chunk) => {
        data += chunk;
      });
      
      res.on('end', () => {
        try {
          const parsed = data ? JSON.parse(data) : null;
          resolve({ status: res.statusCode, data: parsed });
        } catch (e) {
          resolve({ status: res.statusCode, data, error: 'Parse error' });
        }
      });
    });
    
    req.on('error', (err) => {
      reject(err);
    });
    
    if (body) {
      req.write(JSON.stringify(body));
    }
    
    req.end();
  });
}

async function runTests() {
  console.log('🔧 FINALE SYNC SYSTEM - COMPREHENSIVE TEST\n');
  console.log('=' .repeat(50));
  
  const results = {
    passed: 0,
    failed: 0,
    warnings: 0
  };
  
  try {
    // Test 1: Check sync status endpoint
    console.log('\n1. Testing Sync Status Endpoint...');
    try {
      const status = await makeRequest('GET', '/api/sync-finale/status');
      console.log('   Status:', status.status);
      
      if (status.status === 200) {
        console.log('   ✅ Status endpoint working');
        console.log('   - Configured:', status.data.configured);
        console.log('   - Sync enabled:', status.data.syncEnabled);
        console.log('   - Current status:', status.data.status);
        
        if (status.data.lastSync) {
          console.log('   - Last sync:', new Date(status.data.lastSync.completedAt).toLocaleString());
          console.log('   - Items processed:', status.data.lastSync.itemsProcessed);
        }
        results.passed++;
      } else {
        console.log('   ❌ Status endpoint failed:', status.status);
        results.failed++;
      }
    } catch (error) {
      console.log('   ❌ Error:', error.message);
      results.failed++;
    }
    
    // Test 2: Check health endpoint
    console.log('\n2. Testing Health Check Endpoint...');
    try {
      const health = await makeRequest('GET', '/api/sync-finale/health');
      console.log('   Status:', health.status);
      
      if (health.status === 200) {
        console.log('   ✅ Health check working');
        console.log('   - Overall status:', health.data.status);
        
        Object.entries(health.data.checks).forEach(([check, result]) => {
          const icon = result.status === 'healthy' ? '✅' : 
                       result.status === 'degraded' ? '⚠️' : '❌';
          console.log(`   ${icon} ${check}: ${result.message}`);
        });
        results.passed++;
      } else {
        console.log('   ❌ Health check failed:', health.status);
        results.failed++;
      }
    } catch (error) {
      console.log('   ❌ Error:', error.message);
      results.failed++;
    }
    
    // Test 3: Test dry run sync
    console.log('\n3. Testing Dry Run Sync...');
    try {
      const dryRun = await makeRequest('POST', '/api/sync-finale', { 
        dryRun: true,
        filterYear: new Date().getFullYear()
      });
      console.log('   Status:', dryRun.status);
      
      if (dryRun.status === 200 && dryRun.data.success) {
        console.log('   ✅ Dry run successful');
        console.log('   - Total products found:', dryRun.data.totalProducts);
        console.log('   - Sample items:', dryRun.data.sample?.length || 0);
        results.passed++;
      } else if (dryRun.status === 409) {
        console.log('   ⚠️  Sync already running');
        console.log('   - Running for:', dryRun.data.details?.runningFor);
        results.warnings++;
      } else {
        console.log('   ❌ Dry run failed:', dryRun.data?.error || 'Unknown error');
        results.failed++;
      }
    } catch (error) {
      console.log('   ❌ Error:', error.message);
      results.failed++;
    }
    
    // Test 4: Check metrics endpoint
    console.log('\n4. Testing Metrics Endpoint...');
    try {
      const metrics = await makeRequest('GET', '/api/sync-finale/metrics?days=1');
      console.log('   Status:', metrics.status);
      
      if (metrics.status === 200) {
        console.log('   ✅ Metrics endpoint working');
        const summary = metrics.data.summary;
        
        if (summary.success_rate) {
          console.log('   - Success rate:', summary.success_rate.value + '%');
        }
        if (summary.avg_duration_seconds) {
          console.log('   - Avg duration:', summary.avg_duration_seconds.value + 's');
        }
        results.passed++;
      } else {
        console.log('   ❌ Metrics failed:', metrics.status);
        results.failed++;
      }
    } catch (error) {
      console.log('   ❌ Error:', error.message);
      results.failed++;
    }
    
    // Test 5: Check history endpoint
    console.log('\n5. Testing History Endpoint...');
    try {
      const history = await makeRequest('GET', '/api/sync-finale/history?limit=5');
      console.log('   Status:', history.status);
      
      if (history.status === 200) {
        console.log('   ✅ History endpoint working');
        console.log('   - Total syncs:', history.data.pagination.total);
        console.log('   - Recent syncs:', history.data.history.length);
        results.passed++;
      } else {
        console.log('   ❌ History failed:', history.status);
        results.failed++;
      }
    } catch (error) {
      console.log('   ❌ Error:', error.message);
      results.failed++;
    }
    
    // Test 6: Check validation endpoint
    console.log('\n6. Testing Validation Endpoint...');
    try {
      const validate = await makeRequest('GET', '/api/sync-finale/validate');
      console.log('   Status:', validate.status);
      
      if (validate.status === 200) {
        console.log('   ✅ Validation endpoint working');
        console.log('   - Health score:', validate.data.healthScore + '%');
        console.log('   - Total items:', validate.data.stats.totalItems);
        console.log('   - Issues found:', validate.data.issues.length);
        results.passed++;
      } else {
        console.log('   ❌ Validation failed:', validate.status);
        results.failed++;
      }
    } catch (error) {
      console.log('   ❌ Error:', error.message);
      results.failed++;
    }
    
    // Test 7: Check stuck sync detection
    console.log('\n7. Testing Stuck Sync Detection...');
    try {
      const stuck = await makeRequest('GET', '/api/sync-finale/check-stuck');
      console.log('   Status:', stuck.status);
      
      if (stuck.status === 200) {
        console.log('   ✅ Stuck sync check working');
        console.log('   - Stuck syncs found:', stuck.data.hasStuckSyncs);
        
        if (stuck.data.stuckSyncs.length > 0) {
          console.log('   ⚠️  Found stuck syncs:', stuck.data.stuckSyncs.length);
          results.warnings++;
        } else {
          results.passed++;
        }
      } else {
        console.log('   ❌ Stuck check failed:', stuck.status);
        results.failed++;
      }
    } catch (error) {
      console.log('   ❌ Error:', error.message);
      results.failed++;
    }
    
    // Test 8: Check system test endpoint
    console.log('\n8. Running System Test...');
    try {
      const systemTest = await makeRequest('GET', '/api/test-sync-system');
      console.log('   Status:', systemTest.status);
      
      if (systemTest.status === 200) {
        console.log('   ✅ System test completed');
        console.log('   - Overall status:', systemTest.data.overall.status);
        console.log('   - Ready to sync:', systemTest.data.overall.readyToSync);
        console.log('   - Tests passed:', systemTest.data.overall.summary.passed);
        console.log('   - Tests failed:', systemTest.data.overall.summary.failed);
        console.log('   - Warnings:', systemTest.data.overall.summary.warnings);
        
        if (systemTest.data.recommendations.length > 0) {
          console.log('\n   📋 Recommendations:');
          systemTest.data.recommendations.forEach(rec => {
            console.log('   - ' + rec);
          });
        }
        
        results.passed++;
      } else {
        console.log('   ❌ System test failed:', systemTest.status);
        results.failed++;
      }
    } catch (error) {
      console.log('   ❌ Error:', error.message);
      results.failed++;
    }
    
  } catch (error) {
    console.error('\n❌ Test suite error:', error.message);
  }
  
  // Summary
  console.log('\n' + '=' .repeat(50));
  console.log('TEST SUMMARY:');
  console.log('=' .repeat(50));
  console.log(`✅ Passed: ${results.passed}`);
  console.log(`❌ Failed: ${results.failed}`);
  console.log(`⚠️  Warnings: ${results.warnings}`);
  
  const total = results.passed + results.failed;
  const passRate = total > 0 ? Math.round((results.passed / total) * 100) : 0;
  console.log(`\nPass Rate: ${passRate}%`);
  
  if (results.failed === 0) {
    console.log('\n🎉 All tests passed! The sync system is fully functional.');
  } else {
    console.log('\n⚠️  Some tests failed. Please check the errors above.');
  }
}

// Check if server is running
console.log('Checking if development server is running...');
http.get(BASE_URL, (res) => {
  console.log('✅ Server is running on', BASE_URL);
  runTests();
}).on('error', (err) => {
  console.log('❌ Server is not running!');
  console.log('Please start the development server with: npm run dev');
  process.exit(1);
});
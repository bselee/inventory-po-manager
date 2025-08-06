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
  console.log('=' .repeat(50));
  
  const results = {
    passed: 0,
    failed: 0,
    warnings: 0
  };
  
  try {
    // Test 1: Check sync status endpoint
    try {
      const status = await makeRequest('GET', '/api/sync-finale/status');
      if (status.status === 200) {
        if (status.data.lastSync) {
          console.log('   - Last sync:', new Date(status.data.lastSync.completedAt).toLocaleString());
        }
        results.passed++;
      } else {
        results.failed++;
      }
    } catch (error) {
      results.failed++;
    }
    
    // Test 2: Check health endpoint
    try {
      const health = await makeRequest('GET', '/api/sync-finale/health');
      if (health.status === 200) {
        Object.entries(health.data.checks).forEach(([check, result]) => {
          const icon = result.status === 'healthy' ? '✅' : 
                       result.status === 'degraded' ? '⚠️' : '❌';
        });
        results.passed++;
      } else {
        results.failed++;
      }
    } catch (error) {
      results.failed++;
    }
    
    // Test 3: Test dry run sync
    try {
      const dryRun = await makeRequest('POST', '/api/sync-finale', { 
        dryRun: true,
        filterYear: new Date().getFullYear()
      });
      if (dryRun.status === 200 && dryRun.data.success) {
        results.passed++;
      } else if (dryRun.status === 409) {
        results.warnings++;
      } else {
        results.failed++;
      }
    } catch (error) {
      results.failed++;
    }
    
    // Test 4: Check metrics endpoint
    try {
      const metrics = await makeRequest('GET', '/api/sync-finale/metrics?days=1');
      if (metrics.status === 200) {
        const summary = metrics.data.summary;
        
        if (summary.success_rate) {
        }
        if (summary.avg_duration_seconds) {
        }
        results.passed++;
      } else {
        results.failed++;
      }
    } catch (error) {
      results.failed++;
    }
    
    // Test 5: Check history endpoint
    try {
      const history = await makeRequest('GET', '/api/sync-finale/history?limit=5');
      if (history.status === 200) {
        results.passed++;
      } else {
        results.failed++;
      }
    } catch (error) {
      results.failed++;
    }
    
    // Test 6: Check validation endpoint
    try {
      const validate = await makeRequest('GET', '/api/sync-finale/validate');
      if (validate.status === 200) {
        results.passed++;
      } else {
        results.failed++;
      }
    } catch (error) {
      results.failed++;
    }
    
    // Test 7: Check stuck sync detection
    try {
      const stuck = await makeRequest('GET', '/api/sync-finale/check-stuck');
      if (stuck.status === 200) {
        if (stuck.data.stuckSyncs.length > 0) {
          results.warnings++;
        } else {
          results.passed++;
        }
      } else {
        results.failed++;
      }
    } catch (error) {
      results.failed++;
    }
    
    // Test 8: Check system test endpoint
    try {
      const systemTest = await makeRequest('GET', '/api/test-sync-system');
      if (systemTest.status === 200) {
        if (systemTest.data.recommendations.length > 0) {
          systemTest.data.recommendations.forEach(rec => {
          });
        }
        
        results.passed++;
      } else {
        results.failed++;
      }
    } catch (error) {
      results.failed++;
    }
    
  } catch (error) {
    console.error('\n❌ Test suite error:', error.message);
  }
  
  // Summary
  console.log('\n' + '=' .repeat(50));
  console.log('=' .repeat(50));
  const total = results.passed + results.failed;
  const passRate = total > 0 ? Math.round((results.passed / total) * 100) : 0;
  if (results.failed === 0) {
  } else {
  }
}

// Check if server is running
http.get(BASE_URL, (res) => {
  runTests();
}).on('error', (err) => {
  process.exit(1);
});
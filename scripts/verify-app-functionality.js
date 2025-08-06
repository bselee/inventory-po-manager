/**
 * Verify app functionality without full browser automation
 * This script tests that our pages load and API routes respond correctly
 */

const http = require('http');
const https = require('https');

const BASE_URL = process.env.BASE_URL || 'http://localhost:3000';
const TIMEOUT = 5000;

// Colors for console output
const colors = {
  reset: '\x1b[0m',
  green: '\x1b[32m',
  red: '\x1b[31m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m'
};

function log(message, color = colors.reset) {
}

function makeRequest(path, options = {}) {
  return new Promise((resolve, reject) => {
    const url = new URL(path, BASE_URL);
    const protocol = url.protocol === 'https:' ? https : http;
    
    const req = protocol.get(url.toString(), { timeout: TIMEOUT, ...options }, (res) => {
      let data = '';
      
      res.on('data', (chunk) => {
        data += chunk;
      });
      
      res.on('end', () => {
        resolve({
          status: res.statusCode,
          headers: res.headers,
          body: data,
          ok: res.statusCode >= 200 && res.statusCode < 300
        });
      });
    });
    
    req.on('error', reject);
    req.on('timeout', () => {
      req.destroy();
      reject(new Error('Request timeout'));
    });
  });
}

async function testPageLoad(path, description) {
  try {
    log(`\nTesting: ${description}`, colors.blue);
    const response = await makeRequest(path);
    
    if (response.ok) {
      // Check for key elements in the response
      const hasHtml = response.body.includes('<!DOCTYPE html>') || response.body.includes('<html');
      const hasError = response.body.toLowerCase().includes('error') && 
                      !response.body.includes('ErrorBoundary'); // Ignore our error boundary component
      
      if (hasHtml && !hasError) {
        log(`✅ ${description} - Page loads successfully`, colors.green);
        
        // Check for specific elements based on the page
        if (path === '/inventory') {
          const hasInventoryMarkers = 
            response.body.includes('data-testid="inventory-heading"') ||
            response.body.includes('Inventory') ||
            response.body.includes('inventory');
          
          if (hasInventoryMarkers) {
            log(`  ✓ Inventory page markers found`, colors.green);
          } else {
            log(`  ⚠ Inventory page markers not found`, colors.yellow);
          }
        }
        
        return true;
      } else {
        log(`❌ ${description} - Page has errors or missing content`, colors.red);
        return false;
      }
    } else {
      log(`❌ ${description} - HTTP ${response.status}`, colors.red);
      return false;
    }
  } catch (error) {
    log(`❌ ${description} - ${error.message}`, colors.red);
    return false;
  }
}

async function testApiRoute(path, description) {
  try {
    log(`\nTesting API: ${description}`, colors.blue);
    const response = await makeRequest(path);
    
    if (response.status === 401) {
      log(`✅ ${description} - Returns 401 (authentication required)`, colors.green);
      return true;
    } else if (response.ok) {
      log(`✅ ${description} - HTTP ${response.status}`, colors.green);
      
      // Try to parse JSON response
      try {
        const json = JSON.parse(response.body);
        log(`  ✓ Valid JSON response`, colors.green);
      } catch {
        log(`  ⚠ Non-JSON response`, colors.yellow);
      }
      
      return true;
    } else {
      log(`❌ ${description} - HTTP ${response.status}`, colors.red);
      return false;
    }
  } catch (error) {
    log(`❌ ${description} - ${error.message}`, colors.red);
    return false;
  }
}

async function runTests() {
  log('🧪 Starting Application Functionality Tests', colors.blue);
  log('=' .repeat(50));
  
  let passed = 0;
  let failed = 0;
  
  // Test pages
  const pageTests = [
    { path: '/', description: 'Home page' },
    { path: '/inventory', description: 'Inventory page' },
    { path: '/settings', description: 'Settings page' },
    { path: '/purchase-orders', description: 'Purchase Orders page' },
    { path: '/vendors', description: 'Vendors page' }
  ];
  
  log('\n📄 Testing Pages:', colors.blue);
  for (const test of pageTests) {
    const result = await testPageLoad(test.path, test.description);
    if (result) passed++; else failed++;
  }
  
  // Test API routes
  const apiTests = [
    { path: '/api/health', description: 'Health check endpoint' },
    { path: '/api/inventory', description: 'Inventory API' },
    { path: '/api/settings', description: 'Settings API' },
    { path: '/api/sync-status', description: 'Sync status API' }
  ];
  
  log('\n🔌 Testing API Routes:', colors.blue);
  for (const test of apiTests) {
    const result = await testApiRoute(test.path, test.description);
    if (result) passed++; else failed++;
  }
  
  // Summary
  log('\n' + '=' .repeat(50));
  log(`\n📊 Test Summary:`, colors.blue);
  log(`  ✅ Passed: ${passed}`, colors.green);
  log(`  ❌ Failed: ${failed}`, colors.red);
  log(`  📈 Success Rate: ${((passed / (passed + failed)) * 100).toFixed(1)}%`);
  
  if (failed === 0) {
    log(`\n🎉 All tests passed!`, colors.green);
  } else {
    log(`\n⚠️  Some tests failed. Please check the output above.`, colors.yellow);
  }
  
  return failed === 0;
}

// Check if server is running
async function checkServer() {
  try {
    await makeRequest('/');
    return true;
  } catch (error) {
    log(`\n❌ Server is not running at ${BASE_URL}`, colors.red);
    log(`Please run 'npm run dev' in another terminal and try again.`, colors.yellow);
    return false;
  }
}

// Main
(async () => {
  log('🚀 Application Functionality Verifier', colors.blue);
  
  const serverRunning = await checkServer();
  if (!serverRunning) {
    process.exit(1);
  }
  
  const success = await runTests();
  process.exit(success ? 0 : 1);
})();
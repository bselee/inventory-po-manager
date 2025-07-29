#!/usr/bin/env node

// Test Settings API functionality
const http = require('http');

const baseUrl = 'http://localhost:3000';

// Helper function to make requests
function makeRequest(path, method = 'GET', data = null) {
  return new Promise((resolve, reject) => {
    const url = new URL(path, baseUrl);
    const options = {
      hostname: url.hostname,
      port: url.port || 80,
      path: url.pathname + url.search,
      method: method,
      headers: {
        'Content-Type': 'application/json',
      }
    };

    const req = http.request(options, (res) => {
      let body = '';
      res.on('data', (chunk) => body += chunk);
      res.on('end', () => {
        try {
          const json = JSON.parse(body);
          resolve({ status: res.statusCode, data: json });
        } catch (e) {
          resolve({ status: res.statusCode, data: body });
        }
      });
    });

    req.on('error', reject);
    
    if (data) {
      req.write(JSON.stringify(data));
    }
    
    req.end();
  });
}

async function runTests() {
  console.log('Testing Settings API...\n');

  try {
    // Test 1: Check if settings page loads
    console.log('1. Testing settings page HTML...');
    const pageResult = await makeRequest('/settings');
    console.log('Status:', pageResult.status);
    
    if (pageResult.status === 200 && typeof pageResult.data === 'string') {
      const html = pageResult.data;
      
      // Check for key elements in HTML
      const hasSettingInput = html.includes('data-testid="setting-input"');
      const hasSaveButton = html.includes('data-testid="save-settings"');
      const hasTestConnection = html.includes('Test Connection');
      const hasManualSync = html.includes('Start Manual Sync');
      
      console.log('\nChecking for required elements:');
      console.log(`   - Setting input: ${hasSettingInput ? '✅ Found' : '❌ Not found'}`);
      console.log(`   - Save button: ${hasSaveButton ? '✅ Found' : '❌ Not found'}`);
      console.log(`   - Test Connection buttons: ${hasTestConnection ? '✅ Found' : '❌ Not found'}`);
      console.log(`   - Manual Sync button: ${hasManualSync ? '✅ Found' : '❌ Not found'}`);
      
      // Check if it's a Next.js error page
      if (html.includes('__next_error__') || html.includes('Error:')) {
        console.log('\n   ⚠️  Page contains error indicators');
      }
    } else {
      console.log('✗ Settings page not loading correctly\n');
    }

    // Test 2: GET /api/settings
    console.log('\n2. Testing GET /api/settings');
    const getResult = await makeRequest('/api/settings');
    console.log('Status:', getResult.status);
    
    if (getResult.status === 200) {
      console.log('✓ GET endpoint working correctly');
      if (getResult.data && getResult.data.low_stock_threshold !== undefined) {
        console.log(`   - Has low_stock_threshold: ✅ Yes (value: ${getResult.data.low_stock_threshold})`);
      }
    } else {
      console.log('✗ GET endpoint failed');
      console.log('Response:', JSON.stringify(getResult.data, null, 2));
    }

    // Test 3: Check sync status endpoint
    console.log('\n3. Testing sync status endpoint...');
    const syncResult = await makeRequest('/api/sync-status-monitor');
    console.log('Status:', syncResult.status);
    if (syncResult.status === 200) {
      console.log('✓ Sync status endpoint working');
    } else {
      console.log('✗ Sync status endpoint failed');
    }

    // Test 4: Check test connection endpoint
    console.log('\n4. Testing Finale connection test endpoint...');
    const testResult = await makeRequest('/api/test-finale-simple', 'POST', {});
    console.log('Status:', testResult.status);
    if (testResult.status === 200) {
      console.log('✓ Test connection endpoint working');
    } else {
      console.log('✗ Test connection endpoint returned:', testResult.status);
      if (testResult.data) {
        console.log('Response:', JSON.stringify(testResult.data, null, 2).substring(0, 200) + '...');
      }
    }

    // Test 5: Health check
    console.log('\n5. Testing Health Check');
    const healthResult = await makeRequest('/api/health');
    console.log('Status:', healthResult.status);
    
    if (healthResult.status === 200) {
      console.log('✓ Health check passed');
    } else {
      console.log('✗ Health check failed');
    }

  } catch (error) {
    console.error('Test error:', error);
  }
}

// Check if server is running
http.get(baseUrl, (res) => {
  if (res.statusCode === 200 || res.statusCode === 308) {
    console.log('Server is running at', baseUrl);
    runTests();
  }
}).on('error', (err) => {
  console.error('Server is not running. Please start the dev server with: npm run dev');
  process.exit(1);
});
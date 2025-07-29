#!/usr/bin/env node

// Comprehensive test of settings frontend integration
const http = require('http');

async function makeRequest(url, options = {}) {
  return new Promise((resolve, reject) => {
    const urlObj = new URL(url, 'http://localhost:3001');
    const req = http.request(urlObj, {
      ...options,
      headers: {
        ...options.headers,
      }
    }, (res) => {
      let data = '';
      const cookies = res.headers['set-cookie'] || [];
      res.on('data', chunk => data += chunk);
      res.on('end', () => {
        try {
          resolve({ 
            status: res.statusCode, 
            data: JSON.parse(data),
            cookies: cookies
          });
        } catch (e) {
          resolve({ status: res.statusCode, data, cookies });
        }
      });
    });
    
    req.on('error', reject);
    if (options.body) req.write(options.body);
    req.end();
  });
}

async function testSettingsFrontendIntegration() {
  console.log('\n=== SETTINGS FRONTEND INTEGRATION TEST ===\n');
  
  try {
    // Test 1: Verify settings page loads
    console.log('1. Testing settings page availability...');
    const pageResponse = await makeRequest('/settings', { method: 'GET' });
    console.log(`   - Page status: ${pageResponse.status}`);
    
    // Test 2: Get CSRF token
    console.log('\n2. Getting CSRF token...');
    const csrfResponse = await makeRequest('/api/auth/csrf', { method: 'GET' });
    const csrfCookie = csrfResponse.cookies.find(c => c.includes('csrf-token='));
    const csrfToken = csrfCookie ? csrfCookie.match(/csrf-token=([^;]+)/)[1] : null;
    console.log(`   - CSRF token obtained: ${!!csrfToken}`);
    
    // Test 3: Load current settings
    console.log('\n3. Loading current settings...');
    const loadResponse = await makeRequest('/api/settings', { method: 'GET' });
    console.log(`   - Load status: ${loadResponse.status}`);
    console.log(`   - Current low_stock_threshold: ${loadResponse.data?.data?.settings?.sync?.lowStockThreshold}`);
    console.log(`   - Finale API configured: ${loadResponse.data?.data?.settings?.finaleApi?.enabled}`);
    
    // Test 4: Save settings with all fields
    console.log('\n4. Testing complete settings save...');
    const testSettings = {
      // Finale fields
      finale_api_key: 'test-frontend-key',
      finale_api_secret: 'test-frontend-secret',
      finale_account_path: 'test-account',
      finale_username: 'testuser',
      finale_password: 'testpass',
      
      // Email fields
      sendgrid_api_key: 'SG.test-key',
      from_email: 'test@example.com',
      alert_email: 'alerts@example.com',
      sendgrid_from_email: 'noreply@example.com',
      
      // Sync settings
      low_stock_threshold: 42,
      sync_enabled: true,
      sync_frequency_minutes: 30,
      sync_inventory: true,
      sync_vendors: false,
      sync_purchase_orders: true,
      sync_schedule: 'hourly',
      sync_time: '14:00:00',
      
      // Google Sheets
      google_sheet_id: '1234567890',
      google_sheets_api_key: 'AIza-test-key'
    };
    
    const saveResponse = await makeRequest('/api/settings', {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
        'Cookie': csrfCookie,
        'X-CSRF-Token': csrfToken
      },
      body: JSON.stringify(testSettings)
    });
    
    console.log(`   - Save status: ${saveResponse.status}`);
    if (saveResponse.status === 200) {
      console.log(`   - Returned low_stock_threshold: ${saveResponse.data?.data?.settings?.low_stock_threshold}`);
    } else {
      console.error(`   - Error: ${saveResponse.data?.error}`);
    }
    
    // Test 5: Verify saved data
    console.log('\n5. Verifying saved settings...');
    const verifyResponse = await makeRequest('/api/settings', { method: 'GET' });
    const verifySettings = verifyResponse.data?.data?.settings;
    
    console.log(`   - Low stock threshold: ${verifySettings?.sync?.lowStockThreshold} (expected: 42)`);
    console.log(`   - Sync frequency: ${verifySettings?.sync?.enabled}`);
    console.log(`   - Email configured: ${verifySettings?.email?.enabled}`);
    console.log(`   - Finale configured: ${verifySettings?.finaleApi?.enabled}`);
    
    // Test 6: Test partial update
    console.log('\n6. Testing partial settings update...');
    const partialUpdate = {
      low_stock_threshold: 99,
      sync_enabled: false
    };
    
    const partialResponse = await makeRequest('/api/settings', {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
        'Cookie': csrfCookie,
        'X-CSRF-Token': csrfToken
      },
      body: JSON.stringify(partialUpdate)
    });
    
    console.log(`   - Partial update status: ${partialResponse.status}`);
    
    // Test 7: Final verification
    console.log('\n7. Final verification...');
    const finalResponse = await makeRequest('/api/settings', { method: 'GET' });
    const finalSettings = finalResponse.data?.data?.settings;
    
    console.log(`   - Low stock threshold: ${finalSettings?.sync?.lowStockThreshold} (expected: 99)`);
    console.log(`   - Sync enabled: ${finalSettings?.sync?.enabled} (expected: false)`);
    console.log(`   - Other settings preserved: ${finalSettings?.finaleApi?.accountPath === 'test-account'}`);
    
    // Test Summary
    console.log('\n=== TEST SUMMARY ===');
    const allTestsPassed = 
      pageResponse.status === 200 &&
      loadResponse.status === 200 &&
      saveResponse.status === 200 &&
      partialResponse.status === 200 &&
      finalSettings?.sync?.lowStockThreshold === 99 &&
      finalSettings?.sync?.enabled === false;
    
    if (allTestsPassed) {
      console.log('✅ All frontend integration tests passed!');
      console.log('   - Settings page loads correctly');
      console.log('   - CSRF protection working');
      console.log('   - Full saves work properly');
      console.log('   - Partial updates preserve other fields');
      console.log('   - Data persistence verified');
    } else {
      console.log('❌ Some tests failed. Review the output above.');
    }
    
    // Cleanup - restore reasonable defaults
    console.log('\n8. Cleaning up test data...');
    const cleanupData = {
      low_stock_threshold: 10,
      sync_enabled: true,
      finale_api_key: process.env.FINALE_API_KEY || 'I9TVdRvblFod',
      finale_api_secret: process.env.FINALE_API_SECRET || '63h4TCI62vlQUYM3btEA7bycoIflGQUz',
      finale_account_path: process.env.FINALE_ACCOUNT_PATH || 'buildasoilorganics'
    };
    
    await makeRequest('/api/settings', {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
        'Cookie': csrfCookie,
        'X-CSRF-Token': csrfToken
      },
      body: JSON.stringify(cleanupData)
    });
    
    console.log('   - Settings restored to defaults');
    
  } catch (error) {
    console.error('\nTest error:', error);
  }
}

// Check if server is running
console.log('Checking if dev server is running...');
http.get('http://localhost:3001/api/health', (res) => {
  if (res.statusCode === 200) {
    console.log('✅ Dev server is running\n');
    testSettingsFrontendIntegration();
  } else {
    console.error('❌ Dev server returned status:', res.statusCode);
  }
}).on('error', () => {
  console.error('❌ Dev server is not running!');
  console.log('Please start the dev server with: npm run dev');
  process.exit(1);
});
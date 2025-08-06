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

  try {
    // Test 1: Verify settings page loads

    const pageResponse = await makeRequest('/settings', { method: 'GET' });

    // Test 2: Get CSRF token

    const csrfResponse = await makeRequest('/api/auth/csrf', { method: 'GET' });
    const csrfCookie = csrfResponse.cookies.find(c => c.includes('csrf-token='));
    const csrfToken = csrfCookie ? csrfCookie.match(/csrf-token=([^;]+)/)[1] : null;

    // Test 3: Load current settings

    const loadResponse = await makeRequest('/api/settings', { method: 'GET' });


    // Test 4: Save settings with all fields

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

    if (saveResponse.status === 200) {

    } else {
      console.error(`   - Error: ${saveResponse.data?.error}`);
    }
    
    // Test 5: Verify saved data

    const verifyResponse = await makeRequest('/api/settings', { method: 'GET' });
    const verifySettings = verifyResponse.data?.data?.settings;

    // Test 6: Test partial update

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

    // Test 7: Final verification

    const finalResponse = await makeRequest('/api/settings', { method: 'GET' });
    const finalSettings = finalResponse.data?.data?.settings;


    // Test Summary

    const allTestsPassed = 
      pageResponse.status === 200 &&
      loadResponse.status === 200 &&
      saveResponse.status === 200 &&
      partialResponse.status === 200 &&
      finalSettings?.sync?.lowStockThreshold === 99 &&
      finalSettings?.sync?.enabled === false;
    
    if (allTestsPassed) {


    } else {

    }
    
    // Cleanup - restore reasonable defaults

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

  } catch (error) {
    console.error('\nTest error:', error);
  }
}

// Check if server is running

http.get('http://localhost:3001/api/health', (res) => {
  if (res.statusCode === 200) {

    testSettingsFrontendIntegration();
  } else {
    console.error('❌ Dev server returned status:', res.statusCode);
  }
}).on('error', () => {
  console.error('❌ Dev server is not running!');

  process.exit(1);
});
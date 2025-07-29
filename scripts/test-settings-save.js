#!/usr/bin/env node

// Test settings save with CSRF protection
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

async function testSettingsSave() {
  console.log('Testing Settings Save with CSRF...\n');

  try {
    // Step 1: Get CSRF token
    console.log('1. Getting CSRF token...');
    const csrfResponse = await makeRequest('/api/auth/csrf', {
      method: 'GET'
    });
    
    console.log('CSRF Response:', csrfResponse.status);
    console.log('Cookies:', csrfResponse.cookies);
    
    // Extract CSRF token from cookies
    const csrfCookie = csrfResponse.cookies.find(c => c.includes('csrf-token='));
    if (!csrfCookie) {
      console.error('No CSRF cookie received!');
      return;
    }
    
    const csrfToken = csrfCookie.match(/csrf-token=([^;]+)/)[1];
    console.log('CSRF Token:', csrfToken.substring(0, 20) + '...');
    
    // Step 2: Test save with CSRF token
    console.log('\n2. Testing save with CSRF token...');
    const saveData = {
      low_stock_threshold: 25,
      sync_enabled: true
    };
    
    const saveResponse = await makeRequest('/api/settings', {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
        'Cookie': csrfCookie,
        'X-CSRF-Token': csrfToken
      },
      body: JSON.stringify(saveData)
    });
    
    console.log('Save Response:', saveResponse.status);
    console.log('Response Data:', JSON.stringify(saveResponse.data, null, 2));
    
    if (saveResponse.status === 200) {
      console.log('\n✅ Settings saved successfully!');
    } else {
      console.log('\n❌ Failed to save settings');
    }
    
    // Step 3: Verify the save
    console.log('\n3. Verifying saved settings...');
    const verifyResponse = await makeRequest('/api/settings', {
      method: 'GET'
    });
    
    if (verifyResponse.status === 200) {
      const savedThreshold = verifyResponse.data?.data?.settings?.sync?.lowStockThreshold;
      console.log('Saved low_stock_threshold:', savedThreshold);
      if (savedThreshold === 25) {
        console.log('✅ Settings persisted correctly!');
      } else {
        console.log('❌ Settings did not persist (expected 25, got', savedThreshold, ')');
      }
    }
    
  } catch (error) {
    console.error('Test error:', error);
  }
}

// Run the test
testSettingsSave();
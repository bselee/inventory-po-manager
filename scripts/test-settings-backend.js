#!/usr/bin/env node

// Comprehensive test of settings backend
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

async function testSettingsBackend() {

  let csrfToken = null;
  let csrfCookie = null;
  
  try {
    // 1. Check database state

    const { createClient } = require('@supabase/supabase-js');
    require('dotenv').config({ path: '.env.local' });
    
    const supabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
    );
    
    const { data: dbSettings, error: dbError } = await supabase
      .from('settings')
      .select('id, low_stock_threshold, sync_enabled, finale_api_key, created_at, updated_at')
      .order('created_at', { ascending: true });
    
    if (dbError) {
      console.error('Database error:', dbError);
      return;
    }

    if (dbSettings.length > 0) {


    }
    
    // 2. Test GET endpoint

    const getResponse = await makeRequest('/api/settings', { method: 'GET' });


    // 3. Get CSRF token

    const csrfResponse = await makeRequest('/api/auth/csrf', { method: 'GET' });

    csrfCookie = csrfResponse.cookies.find(c => c.includes('csrf-token='));
    if (csrfCookie) {
      csrfToken = csrfCookie.match(/csrf-token=([^;]+)/)[1];

    } else {
      console.error('   - No CSRF token received!');
      return;
    }
    
    // 4. Test PUT endpoint with various data

    const testValue = Math.floor(Math.random() * 50) + 10; // Random value 10-59
    const updateData = {
      low_stock_threshold: testValue,
      sync_enabled: true,
      finale_api_key: 'test-key-' + Date.now(),
      finale_api_secret: 'test-secret',
      finale_account_path: 'test-path',
      sync_inventory: true,
      sync_vendors: true,
      sync_purchase_orders: true
    };

    const putResponse = await makeRequest('/api/settings', {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
        'Cookie': csrfCookie,
        'X-CSRF-Token': csrfToken
      },
      body: JSON.stringify(updateData)
    });

    if (putResponse.status === 200) {


    } else {
      console.error('   - Error:', putResponse.data?.error);
    }
    
    // 5. Verify the update via GET

    const verifyResponse = await makeRequest('/api/settings', { method: 'GET' });


    // 6. Check database directly

    const { data: dbAfter } = await supabase
      .from('settings')
      .select('id, low_stock_threshold, sync_enabled, sync_inventory, finale_api_key')
      .order('created_at', { ascending: true })
      .limit(1)
      .single();

    // 7. Summary

    const success = dbAfter?.low_stock_threshold === testValue;
    if (success) {


    } else {


    }
    
  } catch (error) {
    console.error('\nTest error:', error);
  }
}

// Run the test
testSettingsBackend();
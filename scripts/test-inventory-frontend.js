#!/usr/bin/env node

// Comprehensive test of inventory page frontend functionality
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

async function testInventoryFrontend() {

  try {
    // Test 1: Check if inventory page loads

    const pageResponse = await makeRequest('/inventory', { method: 'GET' });

    // Test 2: Check inventory API endpoint

    const inventoryResponse = await makeRequest('/api/inventory', { method: 'GET' });


    if (inventoryResponse.data?.data?.inventory?.length > 0) {
      const firstItem = inventoryResponse.data.data.inventory[0];


    }
    
    // Test 3: Check summary endpoint

    const summaryResponse = await makeRequest('/api/inventory/summary', { method: 'GET' });

    if (summaryResponse.data?.data) {
      const summary = summaryResponse.data.data;


    }
    
    // Test 4: Test stock update functionality

    if (inventoryResponse.data?.data?.inventory?.length > 0) {
      const testItem = inventoryResponse.data.data.inventory[0];
      const newStock = testItem.current_stock + 10;
      
      // Get CSRF token
      const csrfResponse = await makeRequest('/api/auth/csrf', { method: 'GET' });
      const csrfCookie = csrfResponse.cookies.find(c => c.includes('csrf-token='));
      const csrfToken = csrfCookie ? csrfCookie.match(/csrf-token=([^;]+)/)[1] : null;


      const updateResponse = await makeRequest(`/api/inventory/${testItem.id}/stock`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'Cookie': csrfCookie || '',
          'X-CSRF-Token': csrfToken || ''
        },
        body: JSON.stringify({ stock: newStock })
      });

      if (updateResponse.status === 200) {

      } else {

      }
    }
    
    // Test 5: Test cost update functionality

    if (inventoryResponse.data?.data?.inventory?.length > 0) {
      const testItem = inventoryResponse.data.data.inventory[0];
      const newCost = 19.99;


      const csrfResponse = await makeRequest('/api/auth/csrf', { method: 'GET' });
      const csrfCookie = csrfResponse.cookies.find(c => c.includes('csrf-token='));
      const csrfToken = csrfCookie ? csrfCookie.match(/csrf-token=([^;]+)/)[1] : null;
      
      const costUpdateResponse = await makeRequest(`/api/inventory/${testItem.id}/cost`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'Cookie': csrfCookie || '',
          'X-CSRF-Token': csrfToken || ''
        },
        body: JSON.stringify({ cost: newCost })
      });

      if (costUpdateResponse.status === 200) {

      } else {

      }
    }
    
    // Test 6: Test filtering

    const filterTests = [
      { name: 'Low stock filter', params: '?status=low-stock' },
      { name: 'Vendor filter', params: '?vendor=BuildASoil' },
      { name: 'Search filter', params: '?search=amendment' },
      { name: 'Pagination', params: '?page=2&limit=20' }
    ];
    
    for (const test of filterTests) {
      const filterResponse = await makeRequest(`/api/inventory${test.params}`, { method: 'GET' });

    }
    
    // Test 7: Check for missing API endpoints

    const endpoints = [
      '/api/inventory/export',
      '/api/inventory/import',
      '/api/inventory/bulk-update',
      '/api/inventory/reorder-report'
    ];
    
    for (const endpoint of endpoints) {
      const response = await makeRequest(endpoint, { method: 'GET' });

    }
    
    // Summary

    const issues = [];
    
    if (pageResponse.status !== 200) issues.push('Inventory page not loading');
    if (inventoryResponse.status !== 200) issues.push('Inventory API not working');
    if (inventoryResponse.data?.data?.inventory?.length === 0) issues.push('No inventory items found');
    if (summaryResponse.status !== 200) issues.push('Summary API not working');
    
    if (issues.length === 0) {


    } else {

      issues.forEach(issue => console.log(`   - ${issue}`));
    }


  } catch (error) {
    console.error('\nTest error:', error);
  }
}

// Check if server is running

http.get('http://localhost:3001/api/health', (res) => {
  if (res.statusCode === 200) {

    testInventoryFrontend();
  } else {
    console.error('❌ Dev server returned status:', res.statusCode);
  }
}).on('error', () => {
  console.error('❌ Dev server is not running!');

  process.exit(1);
});
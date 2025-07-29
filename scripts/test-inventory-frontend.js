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
  console.log('\n=== INVENTORY FRONTEND FUNCTIONALITY TEST ===\n');
  
  try {
    // Test 1: Check if inventory page loads
    console.log('1. Testing inventory page availability...');
    const pageResponse = await makeRequest('/inventory', { method: 'GET' });
    console.log(`   - Page status: ${pageResponse.status}`);
    
    // Test 2: Check inventory API endpoint
    console.log('\n2. Testing inventory API endpoint...');
    const inventoryResponse = await makeRequest('/api/inventory', { method: 'GET' });
    console.log(`   - API status: ${inventoryResponse.status}`);
    console.log(`   - Items returned: ${inventoryResponse.data?.data?.inventory?.length || 0}`);
    console.log(`   - Total items: ${inventoryResponse.data?.data?.pagination?.total || 0}`);
    
    if (inventoryResponse.data?.data?.inventory?.length > 0) {
      const firstItem = inventoryResponse.data.data.inventory[0];
      console.log('   - Sample item structure:');
      console.log(`     - SKU: ${firstItem.sku}`);
      console.log(`     - Name: ${firstItem.product_name || firstItem.name || 'N/A'}`);
      console.log(`     - Stock: ${firstItem.current_stock}`);
      console.log(`     - Calculated fields: velocity=${firstItem.sales_velocity}, days_until_stockout=${firstItem.days_until_stockout}`);
    }
    
    // Test 3: Check summary endpoint
    console.log('\n3. Testing inventory summary endpoint...');
    const summaryResponse = await makeRequest('/api/inventory/summary', { method: 'GET' });
    console.log(`   - API status: ${summaryResponse.status}`);
    if (summaryResponse.data?.data) {
      const summary = summaryResponse.data.data;
      console.log(`   - Total items: ${summary.total_items}`);
      console.log(`   - Total value: $${summary.total_inventory_value}`);
      console.log(`   - Out of stock: ${summary.out_of_stock_count}`);
      console.log(`   - Low stock: ${summary.low_stock_count}`);
    }
    
    // Test 4: Test stock update functionality
    console.log('\n4. Testing stock update functionality...');
    if (inventoryResponse.data?.data?.inventory?.length > 0) {
      const testItem = inventoryResponse.data.data.inventory[0];
      const newStock = testItem.current_stock + 10;
      
      // Get CSRF token
      const csrfResponse = await makeRequest('/api/auth/csrf', { method: 'GET' });
      const csrfCookie = csrfResponse.cookies.find(c => c.includes('csrf-token='));
      const csrfToken = csrfCookie ? csrfCookie.match(/csrf-token=([^;]+)/)[1] : null;
      
      console.log(`   - Testing update for SKU: ${testItem.sku}`);
      console.log(`   - Current stock: ${testItem.current_stock}`);
      console.log(`   - New stock: ${newStock}`);
      
      const updateResponse = await makeRequest(`/api/inventory/${testItem.id}/stock`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'Cookie': csrfCookie || '',
          'X-CSRF-Token': csrfToken || ''
        },
        body: JSON.stringify({ stock: newStock })
      });
      
      console.log(`   - Update status: ${updateResponse.status}`);
      if (updateResponse.status === 200) {
        console.log(`   - Updated stock: ${updateResponse.data?.data?.current_stock}`);
      } else {
        console.log(`   - Error: ${updateResponse.data?.error || 'Unknown error'}`);
      }
    }
    
    // Test 5: Test cost update functionality
    console.log('\n5. Testing cost update functionality...');
    if (inventoryResponse.data?.data?.inventory?.length > 0) {
      const testItem = inventoryResponse.data.data.inventory[0];
      const newCost = 19.99;
      
      console.log(`   - Testing cost update for SKU: ${testItem.sku}`);
      console.log(`   - Current cost: $${testItem.cost || 0}`);
      console.log(`   - New cost: $${newCost}`);
      
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
      
      console.log(`   - Update status: ${costUpdateResponse.status}`);
      if (costUpdateResponse.status === 200) {
        console.log(`   - Updated cost: $${costUpdateResponse.data?.data?.cost}`);
      } else {
        console.log(`   - Error: ${costUpdateResponse.data?.error || 'Unknown error'}`);
      }
    }
    
    // Test 6: Test filtering
    console.log('\n6. Testing inventory filtering...');
    const filterTests = [
      { name: 'Low stock filter', params: '?status=low-stock' },
      { name: 'Vendor filter', params: '?vendor=BuildASoil' },
      { name: 'Search filter', params: '?search=amendment' },
      { name: 'Pagination', params: '?page=2&limit=20' }
    ];
    
    for (const test of filterTests) {
      const filterResponse = await makeRequest(`/api/inventory${test.params}`, { method: 'GET' });
      console.log(`   - ${test.name}: Status ${filterResponse.status}, Items: ${filterResponse.data?.data?.inventory?.length || 0}`);
    }
    
    // Test 7: Check for missing API endpoints
    console.log('\n7. Checking for other expected endpoints...');
    const endpoints = [
      '/api/inventory/export',
      '/api/inventory/import',
      '/api/inventory/bulk-update',
      '/api/inventory/reorder-report'
    ];
    
    for (const endpoint of endpoints) {
      const response = await makeRequest(endpoint, { method: 'GET' });
      console.log(`   - ${endpoint}: ${response.status} ${response.status === 404 ? '(Not implemented)' : '(Available)'}`);
    }
    
    // Summary
    console.log('\n=== TEST SUMMARY ===');
    const issues = [];
    
    if (pageResponse.status !== 200) issues.push('Inventory page not loading');
    if (inventoryResponse.status !== 200) issues.push('Inventory API not working');
    if (inventoryResponse.data?.data?.inventory?.length === 0) issues.push('No inventory items found');
    if (summaryResponse.status !== 200) issues.push('Summary API not working');
    
    if (issues.length === 0) {
      console.log('✅ Basic inventory functionality is working!');
      console.log('   - Page loads correctly');
      console.log('   - API endpoints respond');
      console.log('   - Data is being returned');
    } else {
      console.log('❌ Issues found:');
      issues.forEach(issue => console.log(`   - ${issue}`));
    }
    
    console.log('\n=== RECOMMENDATIONS ===');
    console.log('1. Check browser console for JavaScript errors');
    console.log('2. Verify data access layer is returning enhanced items');
    console.log('3. Check if API routes are properly configured');
    console.log('4. Ensure CSRF protection is not blocking updates');
    
  } catch (error) {
    console.error('\nTest error:', error);
  }
}

// Check if server is running
console.log('Checking if dev server is running...');
http.get('http://localhost:3001/api/health', (res) => {
  if (res.statusCode === 200) {
    console.log('✅ Dev server is running\n');
    testInventoryFrontend();
  } else {
    console.error('❌ Dev server returned status:', res.statusCode);
  }
}).on('error', () => {
  console.error('❌ Dev server is not running!');
  console.log('Please start the dev server with: npm run dev');
  process.exit(1);
});
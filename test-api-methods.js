// Test script to verify API method fixes
const BASE_URL = 'http://localhost:3001/api/inventory';

// Test item ID (you may need to adjust this to an actual ID from your database)
const TEST_ITEM_ID = 'f0696c85-690e-4537-9935-0f0e2822f9fc';

async function testEndpoint(method, endpoint, body) {
  try {
    const response = await fetch(`${BASE_URL}${endpoint}`, {
      method,
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(body),
    });

    const status = response.status;
    const data = await response.json().catch(() => null);
    return { success: status >= 200 && status < 300, status, data };
  } catch (error) {
    console.error(`Error: ${error.message}`);
    return { success: false, error: error.message };
  }
}

async function runTests() {
  const results = [];
  
  // Test stock endpoint
  results.push({
    name: 'Stock PUT',
    result: await testEndpoint('PUT', `/${TEST_ITEM_ID}/stock`, { stock: 100 })
  });
  results.push({
    name: 'Stock PATCH',
    result: await testEndpoint('PATCH', `/${TEST_ITEM_ID}/stock`, { stock: 150 })
  });
  
  // Test cost endpoint
  results.push({
    name: 'Cost PUT',
    result: await testEndpoint('PUT', `/${TEST_ITEM_ID}/cost`, { cost: 25.99 })
  });
  results.push({
    name: 'Cost PATCH',
    result: await testEndpoint('PATCH', `/${TEST_ITEM_ID}/cost`, { cost: 29.99 })
  });
  
  // Test visibility endpoint
  results.push({
    name: 'Visibility PUT',
    result: await testEndpoint('PUT', `/${TEST_ITEM_ID}/visibility`, { hidden: false })
  });
  results.push({
    name: 'Visibility PATCH',
    result: await testEndpoint('PATCH', `/${TEST_ITEM_ID}/visibility`, { hidden: true })
  });
  
  // Summary
  results.forEach(({ name, result }) => {
    const status = result.success ? '✅ PASS' : '❌ FAIL';
  });
  
  const passedCount = results.filter(r => r.result.success).length;
}

// Check if we have node-fetch for Node.js environment
if (typeof fetch === 'undefined') {
  try {
    global.fetch = require('node-fetch');
  } catch (e) {
    console.error('Please install node-fetch: npm install node-fetch@2');
    process.exit(1);
  }
}

runTests().catch(console.error);
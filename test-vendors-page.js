// Test vendors page data loading
const fetch = require('node-fetch');

async function testVendorsData() {
  try {
    // Test vendors API endpoint
    const response = await fetch('http://localhost:3000/api/vendors');
    const data = await response.json();
    console.log('Response data:', JSON.stringify(data, null, 2));
    
    if (data.data && Array.isArray(data.data)) {
      // Show first few vendors
      data.data.slice(0, 3).forEach((vendor, i) => {
      });
    } else if (data.vendors) {
      // Show first few vendors
      data.vendors.slice(0, 3).forEach((vendor, i) => {
      });
    } else {
    }
    
  } catch (error) {
    console.error('❌ Error testing vendors:', error.message);
  }
}

// Check if server is running
fetch('http://localhost:3000/api/health')
  .then(() => {
    testVendorsData();
  })
  .catch(() => {
    console.error('❌ Server is not running. Please run: npm run dev');
  });
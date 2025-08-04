// Test vendors page data loading
const fetch = require('node-fetch');

async function testVendorsData() {
  console.log('Testing vendors data loading...\n');
  
  try {
    // Test vendors API endpoint
    console.log('1. Testing /api/vendors endpoint...');
    const response = await fetch('http://localhost:3000/api/vendors');
    const data = await response.json();
    
    console.log('Response status:', response.status);
    console.log('Response data:', JSON.stringify(data, null, 2));
    
    if (data.data && Array.isArray(data.data)) {
      console.log(`\n✅ Found ${data.data.length} vendors`);
      
      // Show first few vendors
      console.log('\nFirst 3 vendors:');
      data.data.slice(0, 3).forEach((vendor, i) => {
        console.log(`${i + 1}. ${vendor.name} (ID: ${vendor.id})`);
      });
    } else if (data.vendors) {
      console.log(`\n✅ Found ${data.vendors.length} vendors`);
      
      // Show first few vendors
      console.log('\nFirst 3 vendors:');
      data.vendors.slice(0, 3).forEach((vendor, i) => {
        console.log(`${i + 1}. ${vendor.name} (ID: ${vendor.id})`);
      });
    } else {
      console.log('\n❌ No vendors data found in response');
    }
    
  } catch (error) {
    console.error('❌ Error testing vendors:', error.message);
  }
}

// Check if server is running
fetch('http://localhost:3000/api/health')
  .then(() => {
    console.log('✅ Server is running\n');
    testVendorsData();
  })
  .catch(() => {
    console.error('❌ Server is not running. Please run: npm run dev');
  });
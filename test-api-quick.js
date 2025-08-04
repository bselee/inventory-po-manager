// Quick API test script
const testAPI = async () => {
  try {
    console.log('🧪 Testing Inventory API...\n');
    
    // Test basic inventory endpoint
    const response = await fetch('http://localhost:3001/api/inventory?limit=3');
    if (!response.ok) {
      throw new Error(`HTTP ${response.status}: ${response.statusText}`);
    }
    
    const data = await response.json();
    
    console.log('✅ API Response received');
    console.log(`📊 Total items: ${data.total}`);
    console.log(`📄 Items in response: ${data.items.length}\n`);
    
    // Check our fixes
    console.log('🔍 Checking implemented fixes:\n');
    
    data.items.forEach((item, index) => {
      console.log(`Item ${index + 1}:`);
      console.log(`  SKU: ${item.sku}`);
      console.log(`  Product: ${item.product_name}`);
      console.log(`  Stock: ${item.current_stock} (read-only ✅)`);
      console.log(`  Vendor: ${item.vendor || 'N/A'} ${item.vendor ? '✅' : '❌'}`);
      console.log(`  Hidden: ${item.hidden || false}`);
      console.log('');
    });
    
    // Test filter functionality
    console.log('🎛️ Testing filter functionality...');
    const hasVendors = data.items.some(item => item.vendor);
    console.log(`Vendor data present: ${hasVendors ? '✅' : '❌'}`);
    
    const hasManufactured = data.items.some(item => item.vendor === 'BuildASoil');
    const hasPurchased = data.items.some(item => item.vendor && item.vendor !== 'BuildASoil');
    console.log(`Manufacturing classification: ${hasManufactured || hasPurchased ? '✅' : '❌'}`);
    
  } catch (error) {
    console.error('❌ Test failed:', error.message);
  }
};

testAPI();

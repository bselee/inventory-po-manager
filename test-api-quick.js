// Quick API test script
const testAPI = async () => {
  try {
    // Test basic inventory endpoint
    const response = await fetch('http://localhost:3001/api/inventory?limit=3');
    if (!response.ok) {
      throw new Error(`HTTP ${response.status}: ${response.statusText}`);
    }
    
    const data = await response.json();
    // Check our fixes
    data.items.forEach((item, index) => {
    });
    
    // Test filter functionality
    const hasVendors = data.items.some(item => item.vendor);
    const hasManufactured = data.items.some(item => item.vendor === 'BuildASoil');
    const hasPurchased = data.items.some(item => item.vendor && item.vendor !== 'BuildASoil');
  } catch (error) {
    console.error('❌ Test failed:', error.message);
  }
};

testAPI();

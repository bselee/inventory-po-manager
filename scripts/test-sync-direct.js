// Test the sync directly by calling the finale-api service
const { FinaleApiService } = require('../app/lib/finale-api.ts');

// Use the same credentials from our test scripts
const config = {
  apiKey: 'I9TVdRvblFod',
  apiSecret: '63h4TCI62vlQUYM3btEA7bycoIflGQUz',
  accountPath: 'buildasoilorganics'
};

async function testDirectSync() {
  console.log('=' .repeat(60));
  
  try {
    const finaleApi = new FinaleApiService(config);
    
    // First test the connection
    const connected = await finaleApi.testConnection();
    if (!connected) {
      return;
    }
    
    // Get inventory data
    const inventoryData = await finaleApi.getInventoryData();
    // Show sample data
    if (inventoryData.length > 0) {
      inventoryData.slice(0, 5).forEach((product, i) => {
      });
    }
    
    // Now test the sync
    const result = await finaleApi.syncToSupabase();
    if (result.errors.length > 0) {
      result.errors.slice(0, 3).forEach((error, i) => {
      });
    }
    
  } catch (error) {
    console.error('\n❌ Error:', error.message);
    console.error(error.stack);
  }
}

// Run the test
testDirectSync();
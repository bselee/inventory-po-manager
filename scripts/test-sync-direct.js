// Test the sync directly by calling the finale-api service
const { FinaleApiService } = require('../app/lib/finale-api.ts');

// Use the same credentials from our test scripts
const config = {
  apiKey: 'I9TVdRvblFod',
  apiSecret: '63h4TCI62vlQUYM3btEA7bycoIflGQUz',
  accountPath: 'buildasoilorganics'
};

async function testDirectSync() {
  console.log('🔍 TESTING DIRECT SYNC TO SUPABASE\n');
  console.log('=' .repeat(60));
  
  try {
    const finaleApi = new FinaleApiService(config);
    
    // First test the connection
    console.log('\n1. Testing Finale connection...');
    const connected = await finaleApi.testConnection();
    console.log(connected ? '✅ Connected to Finale' : '❌ Failed to connect');
    
    if (!connected) {
      return;
    }
    
    // Get inventory data
    console.log('\n2. Fetching inventory data...');
    const inventoryData = await finaleApi.getInventoryData();
    console.log(`✅ Found ${inventoryData.length} products with inventory`);
    
    // Show sample data
    if (inventoryData.length > 0) {
      console.log('\nSample products:');
      inventoryData.slice(0, 5).forEach((product, i) => {
        console.log(`\n${i + 1}. ${product.productId} - ${product.productName}`);
        console.log(`   On Hand: ${product.quantityOnHand}`);
        console.log(`   Available: ${product.quantityAvailable}`);
        console.log(`   Cost: $${product.averageCost || 0}`);
      });
    }
    
    // Now test the sync
    console.log('\n3. Syncing to Supabase...');
    const result = await finaleApi.syncToSupabase();
    
    console.log('\n📊 SYNC RESULT:');
    console.log(`Success: ${result.success}`);
    console.log(`Message: ${result.message}`);
    console.log(`Processed: ${result.processed}`);
    console.log(`Updated: ${result.updated}`);
    console.log(`Errors: ${result.errors.length}`);
    
    if (result.errors.length > 0) {
      console.log('\nFirst few errors:');
      result.errors.slice(0, 3).forEach((error, i) => {
        console.log(`${i + 1}. ${error.sku}: ${error.error}`);
      });
    }
    
  } catch (error) {
    console.error('\n❌ Error:', error.message);
    console.error(error.stack);
  }
}

// Run the test
testDirectSync();
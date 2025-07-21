// Test the sync API endpoint directly
const http = require('http');

async function testSyncAPI() {
  console.log('🔍 TESTING SYNC API ENDPOINT\n');
  console.log('=' .repeat(60));
  
  // First check if inventory has any data
  console.log('\n1. Checking current inventory count...');
  
  await new Promise((resolve) => {
    http.get('http://localhost:3000/api/inventory', (res) => {
      let data = '';
      res.on('data', chunk => data += chunk);
      res.on('end', () => {
        try {
          const result = JSON.parse(data);
          console.log(`Current inventory items: ${result.items?.length || 0}`);
          if (result.items?.length > 0) {
            console.log('Sample items:', result.items.slice(0, 3).map(i => `${i.sku}: ${i.quantity_on_hand}`));
          }
        } catch (e) {
          console.log('Error parsing inventory response:', e.message);
        }
        resolve();
      });
    }).on('error', (err) => {
      console.error('Error fetching inventory:', err.message);
      resolve();
    });
  });
  
  // Now trigger the sync
  console.log('\n2. Triggering Finale sync...');
  console.log('This may take a while as it syncs thousands of products...\n');
  
  const startTime = Date.now();
  
  await new Promise((resolve) => {
    const req = http.request({
      hostname: 'localhost',
      port: 3000,
      path: '/api/sync-finale',
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      }
    }, (res) => {
      console.log('Status:', res.statusCode);
      
      let data = '';
      res.on('data', chunk => {
        data += chunk;
        // Show progress
        process.stdout.write('.');
      });
      
      res.on('end', () => {
        console.log('\n');
        const elapsed = Math.round((Date.now() - startTime) / 1000);
        console.log(`Sync completed in ${elapsed} seconds`);
        
        try {
          const result = JSON.parse(data);
          console.log('\n📊 SYNC RESULT:');
          console.log(`Success: ${result.success}`);
          console.log(`Message: ${result.message}`);
          console.log(`Processed: ${result.processed}`);
          console.log(`Updated: ${result.updated}`);
          console.log(`Errors: ${result.errors?.length || 0}`);
          
          if (result.errors?.length > 0) {
            console.log('\nFirst few errors:');
            result.errors.slice(0, 3).forEach((error, i) => {
              console.log(`${i + 1}. ${error.sku}: ${error.error}`);
            });
          }
        } catch (e) {
          console.log('Response:', data.substring(0, 500));
        }
        resolve();
      });
    });
    
    req.on('error', (err) => {
      console.error('Request error:', err.message);
      resolve();
    });
    
    req.end();
  });
  
  // Check inventory again after sync
  console.log('\n3. Checking inventory after sync...');
  
  await new Promise((resolve) => {
    http.get('http://localhost:3000/api/inventory', (res) => {
      let data = '';
      res.on('data', chunk => data += chunk);
      res.on('end', () => {
        try {
          const result = JSON.parse(data);
          console.log(`Inventory items after sync: ${result.items?.length || 0}`);
          if (result.items?.length > 0) {
            console.log('\nSample synced items:');
            result.items.slice(0, 5).forEach((item, i) => {
              console.log(`${i + 1}. ${item.sku} - ${item.description}`);
              console.log(`   On Hand: ${item.quantity_on_hand}, Available: ${item.quantity_available}`);
              console.log(`   Cost: $${item.cost}, Price: $${item.price}`);
            });
          }
        } catch (e) {
          console.log('Error parsing inventory response:', e.message);
        }
        resolve();
      });
    }).on('error', () => resolve());
  });
}

// Run the test
testSyncAPI().catch(console.error);
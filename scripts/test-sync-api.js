// Test the sync API endpoint directly
const http = require('http');

async function testSyncAPI() {
  console.log('=' .repeat(60));
  
  // First check if inventory has any data
  await new Promise((resolve) => {
    http.get('http://localhost:3000/api/inventory', (res) => {
      let data = '';
      res.on('data', chunk => data += chunk);
      res.on('end', () => {
        try {
          const result = JSON.parse(data);
          if (result.items?.length > 0) {
            console.log('Sample items:', result.items.slice(0, 3).map(i => `${i.sku}: ${i.quantity_on_hand}`));
          }
        } catch (e) {
        }
        resolve();
      });
    }).on('error', (err) => {
      console.error('Error fetching inventory:', err.message);
      resolve();
    });
  });
  
  // Now trigger the sync
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
      let data = '';
      res.on('data', chunk => {
        data += chunk;
        // Show progress
        process.stdout.write('.');
      });
      
      res.on('end', () => {
        const elapsed = Math.round((Date.now() - startTime) / 1000);
        try {
          const result = JSON.parse(data);
          if (result.errors?.length > 0) {
            result.errors.slice(0, 3).forEach((error, i) => {
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
  await new Promise((resolve) => {
    http.get('http://localhost:3000/api/inventory', (res) => {
      let data = '';
      res.on('data', chunk => data += chunk);
      res.on('end', () => {
        try {
          const result = JSON.parse(data);
          if (result.items?.length > 0) {
            result.items.slice(0, 5).forEach((item, i) => {
            });
          }
        } catch (e) {
        }
        resolve();
      });
    }).on('error', () => resolve());
  });
}

// Run the test
testSyncAPI().catch(console.error);
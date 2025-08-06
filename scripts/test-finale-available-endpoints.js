// Test what endpoints are actually available in this Finale account
const https = require('https');

const apiKey = 'I9TVdRvblFod';
const apiSecret = '63h4TCI62vlQUYM3btEA7bycoIflGQUz';
const accountPath = 'buildasoilorganics';
const authString = Buffer.from(`${apiKey}:${apiSecret}`).toString('base64');

async function makeRequest(endpoint) {
  const url = `https://app.finaleinventory.com/${accountPath}/api${endpoint}`;
  
  return new Promise((resolve) => {
    https.get(url, {
      headers: {
        'Authorization': `Basic ${authString}`,
        'Accept': 'application/json'
      }
    }, (res) => {
      let data = '';
      res.on('data', (chunk) => {
        data += chunk;
      });
      res.on('end', () => {
        resolve({
          endpoint,
          status: res.statusCode,
          data: data.substring(0, 100)
        });
      });
    }).on('error', (err) => {
      resolve({
        endpoint,
        status: 'error',
        data: err.message
      });
    });
  });
}

async function testAvailableEndpoints() {
  console.log('=' .repeat(60));
  
  // Test various endpoints
  const endpoints = [
    '/',                    // Base API
    '/product',            // Products (we know this works)
    '/inventory',          // Inventory
    '/inventoryItem',      // InventoryItem (different case)
    '/inventoryitem',      // inventoryitem (lowercase)
    '/stock',              // Stock
    '/productStock',       // Product stock
    '/productInventory',   // Product inventory
    '/facility',           // Facilities
    '/party',              // Parties/Vendors
    '/order',              // Orders
    '/report',             // Reports
    '/shipment',           // Shipments
    '/contact',            // Contacts
    '/warehouse',          // Warehouse
    '/location',           // Locations
  ];
  for (const endpoint of endpoints) {
    const result = await makeRequest(endpoint);
    const icon = result.status === 200 ? '✅' : result.status === 404 ? '❌' : '⚠️';
    if (result.status === 200) {
    }
  }
  
  // Now let's check if product endpoint has inventory data embedded
  console.log('=' .repeat(60));
  
  const productTests = [
    '/product?expand=all',
    '/product?include=inventory',
    '/product?include=stock',
    '/product?fields=all',
    '/product/BC101',  // Specific product
  ];
  
  for (const endpoint of productTests) {
    const url = `https://app.finaleinventory.com/${accountPath}/api${endpoint}`;
    
    await new Promise((resolve) => {
      https.get(url, {
        headers: {
          'Authorization': `Basic ${authString}`,
          'Accept': 'application/json'
        }
      }, (res) => {
        let data = '';
        res.on('data', (chunk) => {
          data += chunk;
        });
        
        res.on('end', () => {
          if (res.statusCode === 200) {
            try {
              const parsed = JSON.parse(data);
              
              // Check for inventory-related fields
              const allFields = typeof parsed === 'object' && !Array.isArray(parsed) 
                ? Object.keys(parsed) 
                : [];
              
              const inventoryFields = allFields.filter(field => 
                field.toLowerCase().includes('quantity') ||
                field.toLowerCase().includes('stock') ||
                field.toLowerCase().includes('inventory') ||
                field.toLowerCase().includes('onhand') ||
                field.toLowerCase().includes('available')
              );
              
              if (inventoryFields.length > 0) {
              } else {
                console.log('Available fields:', allFields.slice(0, 10).join(', ') + '...');
              }
              
            } catch (e) {
            }
          }
          resolve();
        });
      }).on('error', () => resolve());
    });
  }
}

// Run the test
testAvailableEndpoints().catch(console.error);
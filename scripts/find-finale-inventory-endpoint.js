// Find the correct endpoint for inventory quantities
const https = require('https');

const apiKey = 'I9TVdRvblFod';
const apiSecret = '63h4TCI62vlQUYM3btEA7bycoIflGQUz';
const accountPath = 'buildasoilorganics';
const authString = Buffer.from(`${apiKey}:${apiSecret}`).toString('base64');

async function makeRequest(url) {
  return new Promise((resolve, reject) => {
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
            
            // Check if we found quantity fields
            const hasQuantity = JSON.stringify(data).toLowerCase().includes('quantity');
            const hasStock = JSON.stringify(data).toLowerCase().includes('stock');
            const hasInventory = JSON.stringify(data).toLowerCase().includes('inventory');
            
            if (hasQuantity || hasStock || hasInventory) {
              // Print the structure
              if (Array.isArray(parsed)) {
                if (parsed.length > 0) {
                  console.log('First item:', JSON.stringify(parsed[0], null, 2).substring(0, 500));
                }
              } else if (typeof parsed === 'object') {
                console.log('Keys:', Object.keys(parsed).slice(0, 20));
                
                // Check for quantity fields
                const quantityFields = Object.keys(parsed).filter(k => 
                  k.toLowerCase().includes('quantity') || 
                  k.toLowerCase().includes('stock') ||
                  k.toLowerCase().includes('onhand')
                );
                
                if (quantityFields.length > 0) {
                  quantityFields.forEach(field => {
                  });
                }
              }
            } else {
            }
            
            resolve(parsed);
          } catch (e) {
            console.log('Response preview:', data.substring(0, 200));
            resolve(null);
          }
        } else {
          console.log('Response:', data.substring(0, 100));
          resolve(null);
        }
      });
    }).on('error', reject);
  });
}

async function findInventoryEndpoint() {
  console.log('=' .repeat(60));
  
  const baseUrl = `https://app.finaleinventory.com/${accountPath}/api`;
  
  // Try various endpoint combinations
  const endpoints = [
    '/product?expand=inventory',
    '/product?expand=true&includeInventory=true',
    '/product?fields=all',
    '/product?include=inventory',
    '/productInventory',
    '/product-inventory',
    '/inventory/product',
    '/stock',
    '/stockLevel',
    '/inventorySummary',
    '/inventory?productId=BC101',
    '/product/BC101/inventory',
    '/product/BC101?expand=inventory',
    '/facility/inventory',
    '/facility/10000/inventory', // Try with a facility ID
    '/report/inventory',
    '/getInventory',
    // Try with different parameters
    '/product?_expand=true',
    '/product?expand=*',
    '/product?include=quantityOnHand,quantityAvailable'
  ];
  
  for (const endpoint of endpoints) {
    try {
      await makeRequest(baseUrl + endpoint);
    } catch (error) {
    }
  }
  
  // Also try the facility inventory with proper structure
  try {
    const facilityInv = await makeRequest(baseUrl + '/facility/inventory');
    if (facilityInv && typeof facilityInv === 'object') {
      // Check if it's organized by facility ID
      const facilityIds = Object.keys(facilityInv);
      if (facilityIds.length > 0 && facilityIds[0].match(/^\d+$/)) {
        // Check first facility
        const firstFacility = facilityInv[facilityIds[0]];
        console.log('\nFirst facility data:', JSON.stringify(firstFacility, null, 2).substring(0, 800));
        
        // Check if products are nested inside
        if (firstFacility && typeof firstFacility === 'object') {
          const productKeys = Object.keys(firstFacility);
          console.log('\nProduct keys in facility:', productKeys.slice(0, 10));
          
          if (productKeys.length > 0) {
            );
          }
        }
      }
    }
  } catch (error) {
    console.error('Facility inventory error:', error);
  }
}

// Run the search
findInventoryEndpoint().catch(console.error);
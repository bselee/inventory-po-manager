// Deep dive into Finale inventory data structure
const https = require('https');

const apiKey = 'I9TVdRvblFod';
const apiSecret = '63h4TCI62vlQUYM3btEA7bycoIflGQUz';
const accountPath = 'buildasoilorganics';
const authString = Buffer.from(`${apiKey}:${apiSecret}`).toString('base64');

async function makeRequest(endpoint, params = '') {
  return new Promise((resolve, reject) => {
    const url = `https://app.finaleinventory.com/${accountPath}/api/${endpoint}${params}`;
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
        try {
          const parsed = JSON.parse(data);
          resolve({ status: res.statusCode, data: parsed });
        } catch (e) {
          resolve({ status: res.statusCode, data: data });
        }
      });
    }).on('error', reject);
  });
}

async function exploreInventory() {
  console.log('=' .repeat(60));
  
  // Try different parameter combinations
  const tests = [
    { endpoint: 'product', params: '?limit=5&expand=1', desc: 'Products with expand flag' },
    { endpoint: 'product', params: '?limit=5&filter=statusId:PRODUCT_ACTIVE', desc: 'Active products only' },
    { endpoint: 'facility', params: '?limit=5', desc: 'Facilities/Locations' },
    { endpoint: 'supplier', params: '?limit=5', desc: 'Suppliers (alternate endpoint)' },
    { endpoint: 'vendor', params: '?limit=5', desc: 'Vendors (singular)' },
    { endpoint: 'order', params: '?limit=5&orderTypeId=PURCHASE_ORDER', desc: 'Purchase Orders via order endpoint' },
    { endpoint: 'inventory', params: '?limit=5', desc: 'Direct inventory endpoint' },
    { endpoint: 'product/BC101', params: '', desc: 'Single product detail' },
  ];
  
  for (const test of tests) {
    console.log('-'.repeat(50));
    
    try {
      const result = await makeRequest(test.endpoint, test.params);
      
      if (result.status === 200) {
        // Analyze structure
        if (typeof result.data === 'object') {
          if (Array.isArray(result.data)) {
            if (result.data.length > 0) {
              console.log('First item keys:', Object.keys(result.data[0]));
              console.log('Sample:', JSON.stringify(result.data[0], null, 2).substring(0, 800));
            }
          } else if (result.data.productId && Array.isArray(result.data.productId)) {
            // Parallel array format
            console.log(`Fields (${Object.keys(result.data).length}):`, Object.keys(result.data).join(', '));
            // Convert first record to object for easier viewing
            if (result.data.productId.length > 0) {
              const firstRecord = {};
              Object.keys(result.data).forEach(key => {
                if (Array.isArray(result.data[key]) && result.data[key].length > 0) {
                  firstRecord[key] = result.data[key][0];
                }
              });
              console.log(JSON.stringify(firstRecord, null, 2).substring(0, 800));
            }
          } else {
            console.log('Keys:', Object.keys(result.data));
            console.log('Data:', JSON.stringify(result.data, null, 2).substring(0, 800));
          }
        }
      } else {
        if (result.data) {
          console.log('Response:', result.data.substring(0, 200));
        }
      }
    } catch (error) {
    }
  }
  
  // Now let's specifically look for inventory-related fields
  console.log('=' .repeat(60));
  
  try {
    // Get products with all details
    const productsResult = await makeRequest('product', '?limit=3&expand=1');
    
    if (productsResult.status === 200 && productsResult.data) {
      const inventoryFields = {
        'Stock Levels': [
          'quantityOnHand', 'quantityAvailable', 'quantityAllocated', 
          'quantityOnOrder', 'quantityInTransit', 'quantityCommitted'
        ],
        'Reorder Management': [
          'reorderPoint', 'reorderQuantity', 'minimumStock', 'maximumStock',
          'leadTimeDays', 'bufferStock', 'safetyStock'
        ],
        'Cost & Pricing': [
          'averageCost', 'standardCost', 'lastCost', 'unitCost',
          'landedCost', 'wholesalePrice', 'retailPrice'
        ],
        'Supplier Info': [
          'primarySupplierName', 'primarySupplierId', 'supplierSku',
          'supplierList', 'preferredVendor', 'vendorLeadTime'
        ],
        'Product Info': [
          'productId', 'productName', 'internalName', 'sku',
          'barcode', 'description', 'category', 'status'
        ],
        'Location': [
          'facilityName', 'warehouseLocation', 'binLocation',
          'zone', 'aisle', 'shelf', 'position'
        ]
      };
      
      // Check which fields actually exist
      const availableFields = Object.keys(productsResult.data);
      
      Object.entries(inventoryFields).forEach(([category, fields]) => {
        const found = fields.filter(f => 
          availableFields.some(af => af.toLowerCase().includes(f.toLowerCase()))
        );
        
        if (found.length > 0) {
          found.forEach(field => {
            const actualField = availableFields.find(af => 
              af.toLowerCase().includes(field.toLowerCase())
            );
            if (actualField && productsResult.data[actualField]) {
              const value = Array.isArray(productsResult.data[actualField]) 
                ? productsResult.data[actualField][0] 
                : productsResult.data[actualField];
            }
          });
        }
      });
      
      // List all fields we're currently not using
      availableFields.forEach(field => {
      });
    }
  } catch (error) {
    console.error('Error in analysis:', error);
  }
}

// Run exploration
exploreInventory().catch(console.error);
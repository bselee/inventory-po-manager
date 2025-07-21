// Explore all available data from Finale API
const https = require('https');

const apiKey = 'I9TVdRvblFod';
const apiSecret = '63h4TCI62vlQUYM3btEA7bycoIflGQUz';
const accountPath = 'buildasoilorganics';
const authString = Buffer.from(`${apiKey}:${apiSecret}`).toString('base64');

async function makeRequest(endpoint, limit = 5) {
  return new Promise((resolve, reject) => {
    const url = `https://app.finaleinventory.com/${accountPath}/api/${endpoint}?limit=${limit}`;
    
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
          resolve({ status: res.statusCode, data: data.substring(0, 500) });
        }
      });
    }).on('error', reject);
  });
}

async function exploreFinaleData() {
  console.log('🔍 EXPLORING FINALE INVENTORY DATA\n');
  console.log('=' .repeat(60));
  
  // Test different endpoints to see what's available
  const endpoints = [
    'product',           // Inventory items
    'facility/inventory', // Stock by location
    'vendors',           // Vendor/supplier info
    'purchaseOrder',     // Purchase orders
    'salesOrder',        // Sales orders (for demand analysis)
    'productCategory',   // Product categories
    'lot',              // Lot/batch tracking
    'transfer',         // Stock transfers
    'adjustment',       // Inventory adjustments
    'stockTake',        // Physical counts
  ];
  
  for (const endpoint of endpoints) {
    console.log(`\n📦 Testing endpoint: /${endpoint}`);
    console.log('-'.repeat(50));
    
    try {
      const result = await makeRequest(endpoint, 2);
      
      if (result.status === 200) {
        console.log('✅ Endpoint available!');
        
        // Analyze the data structure
        if (result.data) {
          // Check if it's parallel array format
          if (result.data.productId && Array.isArray(result.data.productId)) {
            console.log('Format: Parallel arrays');
            console.log('Available fields:', Object.keys(result.data).slice(0, 20).join(', '));
            console.log('Record count:', result.data.productId.length);
            
            // Show sample data
            if (result.data.productId.length > 0) {
              console.log('\nSample record:');
              const sample = {};
              Object.keys(result.data).forEach(key => {
                if (Array.isArray(result.data[key])) {
                  sample[key] = result.data[key][0];
                }
              });
              console.log(JSON.stringify(sample, null, 2).substring(0, 500));
            }
          } else if (Array.isArray(result.data)) {
            console.log('Format: Standard array');
            console.log('Record count:', result.data.length);
            if (result.data.length > 0) {
              console.log('Sample:', JSON.stringify(result.data[0], null, 2).substring(0, 500));
            }
          } else {
            console.log('Format: Object');
            console.log('Keys:', Object.keys(result.data).join(', '));
          }
        }
      } else {
        console.log(`❌ Not available (${result.status})`);
      }
    } catch (error) {
      console.log('❌ Error:', error.message);
    }
  }
  
  // Now let's look at detailed product data
  console.log('\n\n📊 DETAILED PRODUCT/INVENTORY ANALYSIS');
  console.log('=' .repeat(60));
  
  try {
    const productResult = await makeRequest('product', 10);
    
    if (productResult.status === 200 && productResult.data) {
      console.log('\n🔍 All available product fields:');
      const fields = Object.keys(productResult.data);
      
      // Categorize fields by purpose
      const categories = {
        'Basic Info': ['productId', 'productName', 'internalName', 'description', 'productUrl'],
        'Stock Levels': ['quantityOnHand', 'quantityAvailable', 'quantityAllocated', 'quantityOnOrder'],
        'Reorder Info': ['reorderPoint', 'reorderQuantity', 'leadTime', 'bufferDays'],
        'Supplier Info': ['primarySupplierName', 'primarySupplierId', 'supplierPartNumber'],
        'Pricing': ['averageCost', 'standardCost', 'lastCost', 'unitPrice'],
        'Location': ['facilityName', 'facilityId', 'binLocation', 'pickLocation'],
        'Categories': ['productCategory', 'productSubcategory', 'productType'],
        'Tracking': ['trackLots', 'trackSerials', 'active', 'kitProduct'],
        'Dates': ['lastUpdatedDate', 'lastSoldDate', 'lastReceivedDate', 'createdDate'],
        'Custom': fields.filter(f => f.startsWith('customField'))
      };
      
      Object.entries(categories).forEach(([category, fieldList]) => {
        const availableFields = fieldList.filter(f => fields.includes(f));
        if (availableFields.length > 0) {
          console.log(`\n${category}:`);
          availableFields.forEach(field => {
            // Show sample value
            const sampleValue = productResult.data[field] && productResult.data[field][0];
            console.log(`  - ${field}: ${JSON.stringify(sampleValue)}`);
          });
        }
      });
      
      // Check for any fields we didn't categorize
      const uncategorized = fields.filter(f => 
        !Object.values(categories).flat().includes(f)
      );
      if (uncategorized.length > 0) {
        console.log('\nOther fields:', uncategorized.join(', '));
      }
    }
  } catch (error) {
    console.error('Error analyzing products:', error);
  }
  
  // Test purchase order structure
  console.log('\n\n📋 PURCHASE ORDER STRUCTURE');
  console.log('=' .repeat(60));
  
  try {
    const poResult = await makeRequest('purchaseOrder', 2);
    
    if (poResult.status === 200 && poResult.data) {
      console.log('Available PO fields:', Object.keys(poResult.data).join(', '));
    }
  } catch (error) {
    console.error('Error checking POs:', error);
  }
}

// Run the exploration
exploreFinaleData().catch(console.error);
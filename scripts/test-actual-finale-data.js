// Test what data we actually get from Finale
const https = require('https');

const apiKey = 'I9TVdRvblFod';
const apiSecret = '63h4TCI62vlQUYM3btEA7bycoIflGQUz';
const accountPath = 'buildasoilorganics';
const authString = Buffer.from(`${apiKey}:${apiSecret}`).toString('base64');

async function testFinaleData() {
  console.log('🔍 TESTING ACTUAL FINALE DATA RETRIEVAL\n');
  
  // First, let's see what the product endpoint actually returns
  const productUrl = `https://app.finaleinventory.com/${accountPath}/api/product?limit=3&expand=1`;
  
  return new Promise((resolve, reject) => {
    https.get(productUrl, {
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
          
          console.log('✅ RAW FINALE RESPONSE:');
          console.log('Fields available:', Object.keys(parsed));
          console.log('\n');
          
          // Check what inventory-related fields we actually have
          const inventoryRelatedFields = Object.keys(parsed).filter(key => {
            const lowerKey = key.toLowerCase();
            return lowerKey.includes('quantity') || 
                   lowerKey.includes('stock') || 
                   lowerKey.includes('reorder') ||
                   lowerKey.includes('cost') ||
                   lowerKey.includes('supplier') ||
                   lowerKey.includes('vendor') ||
                   lowerKey.includes('location') ||
                   lowerKey.includes('facility');
          });
          
          console.log('📊 INVENTORY-RELATED FIELDS FOUND:');
          inventoryRelatedFields.forEach(field => {
            console.log(`- ${field}`);
          });
          
          // Convert first product to see actual data
          if (parsed.productId && parsed.productId.length > 0) {
            console.log('\n📦 FIRST PRODUCT DATA:');
            const firstProduct = {};
            Object.keys(parsed).forEach(key => {
              if (Array.isArray(parsed[key]) && parsed[key].length > 0) {
                firstProduct[key] = parsed[key][0];
              }
            });
            console.log(JSON.stringify(firstProduct, null, 2));
            
            // Check nested data structures
            console.log('\n🔍 CHECKING NESTED DATA:');
            
            // Check reorderGuidelineList
            if (firstProduct.reorderGuidelineList) {
              console.log('\nreorderGuidelineList:', JSON.stringify(firstProduct.reorderGuidelineList, null, 2));
            }
            
            // Check supplierList
            if (firstProduct.supplierList) {
              console.log('\nsupplierList:', JSON.stringify(firstProduct.supplierList, null, 2));
            }
            
            // Check productStoreList
            if (firstProduct.productStoreList) {
              console.log('\nproductStoreList:', JSON.stringify(firstProduct.productStoreList, null, 2));
            }
            
            // Check priceList
            if (firstProduct.priceList) {
              console.log('\npriceList:', JSON.stringify(firstProduct.priceList, null, 2));
            }
          }
          
          // Now let's check if there's a separate inventory endpoint
          console.log('\n\n📊 CHECKING FOR INVENTORY-SPECIFIC DATA...');
          
          // Try facility inventory
          checkFacilityInventory();
          
        } catch (e) {
          console.error('Parse error:', e);
          console.log('Raw response:', data.substring(0, 500));
        }
      });
    }).on('error', reject);
  });
}

function checkFacilityInventory() {
  const facilityUrl = `https://app.finaleinventory.com/${accountPath}/api/facility/inventory`;
  
  https.get(facilityUrl, {
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
      console.log('\n📍 FACILITY INVENTORY ENDPOINT:');
      console.log('Status:', res.statusCode);
      
      if (res.statusCode === 200) {
        try {
          const parsed = JSON.parse(data);
          console.log('Data structure:', Object.keys(parsed).slice(0, 20));
          
          // If it's an object with numeric keys, it might be facilities
          if (parsed['0']) {
            console.log('First facility:', JSON.stringify(parsed['0'], null, 2).substring(0, 500));
          }
        } catch (e) {
          console.log('Response:', data.substring(0, 200));
        }
      }
      
      // Try another approach - product with inventory
      checkProductInventory();
    });
  });
}

function checkProductInventory() {
  // Try getting a specific product with inventory details
  const productDetailUrl = `https://app.finaleinventory.com/${accountPath}/api/product/BC101`;
  
  https.get(productDetailUrl, {
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
      console.log('\n📦 SINGLE PRODUCT DETAIL (BC101):');
      console.log('Status:', res.statusCode);
      
      if (res.statusCode === 200) {
        try {
          const parsed = JSON.parse(data);
          console.log('Full product detail:', JSON.stringify(parsed, null, 2).substring(0, 1000));
        } catch (e) {
          console.log('Response:', data.substring(0, 500));
        }
      }
    });
  });
}

// Run the test
testFinaleData().catch(console.error);
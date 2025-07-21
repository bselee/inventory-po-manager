// Test the actual inventoryitem endpoint from Finale docs
const https = require('https');

const apiKey = 'I9TVdRvblFod';
const apiSecret = '63h4TCI62vlQUYM3btEA7bycoIflGQUz';
const accountPath = 'buildasoilorganics';
const authString = Buffer.from(`${apiKey}:${apiSecret}`).toString('base64');

async function testInventoryItem() {
  console.log('🔍 TESTING FINALE INVENTORYITEM ENDPOINT\n');
  console.log('Based on docs: https://developer.finaleinventory.com/reference/inventory-item');
  console.log('=' .repeat(60));
  
  const url = `https://app.finaleinventory.com/${accountPath}/api/inventoryitem?limit=50`;
  console.log(`\nURL: ${url}`);
  
  return new Promise((resolve, reject) => {
    https.get(url, {
      headers: {
        'Authorization': `Basic ${authString}`,
        'Accept': 'application/json'
      }
    }, (res) => {
      console.log('\nStatus:', res.statusCode);
      console.log('Headers:', JSON.stringify(res.headers, null, 2));
      
      let data = '';
      
      res.on('data', (chunk) => {
        data += chunk;
      });
      
      res.on('end', () => {
        if (res.statusCode === 200) {
          try {
            const parsed = JSON.parse(data);
            console.log('\n✅ SUCCESS! Got inventory data\n');
            
            // Check structure
            if (parsed.productId && Array.isArray(parsed.productId)) {
              console.log('📊 INVENTORY ITEM STRUCTURE:');
              console.log('Format: Parallel arrays');
              console.log('Available fields:', Object.keys(parsed));
              console.log('Number of items:', parsed.productId.length);
              
              // Show first few items
              console.log('\n📦 FIRST 5 INVENTORY ITEMS:');
              for (let i = 0; i < Math.min(5, parsed.productId.length); i++) {
                console.log(`\nItem ${i + 1}:`);
                console.log(`  Product ID: ${parsed.productId[i]}`);
                console.log(`  Quantity On Hand: ${parsed.quantityOnHand?.[i] || 0}`);
                console.log(`  Quantity On Order: ${parsed.quantityOnOrder?.[i] || 0}`);
                console.log(`  Quantity Reserved: ${parsed.quantityReserved?.[i] || 0}`);
                console.log(`  Facility URL: ${parsed.facilityUrl?.[i] || 'N/A'}`);
                console.log(`  Product URL: ${parsed.productUrl?.[i] || 'N/A'}`);
              }
              
              // Aggregate by product
              console.log('\n📊 AGGREGATING BY PRODUCT:');
              const productTotals = new Map();
              
              for (let i = 0; i < parsed.productId.length; i++) {
                const productId = parsed.productId[i];
                if (!productTotals.has(productId)) {
                  productTotals.set(productId, {
                    quantityOnHand: 0,
                    quantityOnOrder: 0,
                    quantityReserved: 0,
                    locations: new Set()
                  });
                }
                
                const totals = productTotals.get(productId);
                totals.quantityOnHand += parseFloat(parsed.quantityOnHand?.[i] || 0);
                totals.quantityOnOrder += parseFloat(parsed.quantityOnOrder?.[i] || 0);
                totals.quantityReserved += parseFloat(parsed.quantityReserved?.[i] || 0);
                
                if (parsed.facilityUrl?.[i]) {
                  totals.locations.add(parsed.facilityUrl[i]);
                }
              }
              
              console.log(`\nTotal unique products with inventory: ${productTotals.size}`);
              
              // Show first few aggregated products
              let count = 0;
              for (const [productId, totals] of productTotals) {
                if (count++ >= 5) break;
                console.log(`\nProduct ${productId}:`);
                console.log(`  Total On Hand: ${totals.quantityOnHand}`);
                console.log(`  Total On Order: ${totals.quantityOnOrder}`);
                console.log(`  Total Reserved: ${totals.quantityReserved}`);
                console.log(`  Available: ${totals.quantityOnHand - totals.quantityReserved}`);
                console.log(`  Locations: ${totals.locations.size}`);
              }
              
            } else {
              console.log('Unexpected format:', Object.keys(parsed));
              console.log('Data:', JSON.stringify(parsed, null, 2).substring(0, 500));
            }
            
          } catch (e) {
            console.error('Parse error:', e);
            console.log('Response:', data.substring(0, 500));
          }
        } else {
          console.log('❌ Failed');
          console.log('Response:', data.substring(0, 500));
        }
        resolve();
      });
    }).on('error', reject);
  });
}

// Run the test
testInventoryItem().catch(console.error);
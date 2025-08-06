// Test the inventoryitem endpoint with trailing slash
const https = require('https');

const apiKey = 'I9TVdRvblFod';
const apiSecret = '63h4TCI62vlQUYM3btEA7bycoIflGQUz';
const accountPath = 'buildasoilorganics';
const authString = Buffer.from(`${apiKey}:${apiSecret}`).toString('base64');

async function testInventoryItem() {
  console.log('🔍 TESTING FINALE INVENTORYITEM ENDPOINT (WITH TRAILING SLASH)\n');
  console.log('=' .repeat(60));
  
  // Test with trailing slash as per documentation
  const url = `https://app.finaleinventory.com/${accountPath}/api/inventoryitem/?limit=50`;
  return new Promise((resolve, reject) => {
    https.get(url, {
      headers: {
        'Authorization': `Basic ${authString}`,
        'Accept': 'application/json'
      }
    }, (res) => {
      console.log('Headers:', JSON.stringify(res.headers, null, 2));
      
      let data = '';
      
      res.on('data', (chunk) => {
        data += chunk;
      });
      
      res.on('end', () => {
        if (res.statusCode === 200) {
          try {
            const parsed = JSON.parse(data);
            // Check structure
            if (parsed.productId && Array.isArray(parsed.productId)) {
              console.log('Available fields:', Object.keys(parsed));
              // Show first few items
              for (let i = 0; i < Math.min(5, parsed.productId.length); i++) {
              }
              
              // Aggregate by product
              const productTotals = new Map();
              
              for (let i = 0; i < parsed.productId.length; i++) {
                const productId = parsed.productId[i];
                if (!productTotals.has(productId)) {
                  productTotals.set(productId, {
                    quantityOnHand: 0,
                    quantityOnOrder: 0,
                    quantityReserved: 0,
                    locations: 0
                  });
                }
                
                const totals = productTotals.get(productId);
                totals.quantityOnHand += parseFloat(parsed.quantityOnHand?.[i] || 0);
                totals.quantityOnOrder += parseFloat(parsed.quantityOnOrder?.[i] || 0);
                totals.quantityReserved += parseFloat(parsed.quantityReserved?.[i] || 0);
                totals.locations++;
              }
              // Show first few aggregated products
              let count = 0;
              for (const [productId, totals] of productTotals) {
                if (count++ >= 5) break;
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
          console.log('Response:', data.substring(0, 500));
        }
        resolve();
      });
    }).on('error', reject);
  });
}

// Run the test
testInventoryItem().catch(console.error);
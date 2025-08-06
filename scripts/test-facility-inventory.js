// Test facility inventory endpoint properly
const https = require('https');

const apiKey = 'I9TVdRvblFod';
const apiSecret = '63h4TCI62vlQUYM3btEA7bycoIflGQUz';
const accountPath = 'buildasoilorganics';
const authString = Buffer.from(`${apiKey}:${apiSecret}`).toString('base64');

function testFacilityInventory() {
  const url = `https://app.finaleinventory.com/${accountPath}/api/facility/inventory`;
  
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
          console.log('Is Array:', Array.isArray(parsed));
          
          if (typeof parsed === 'object' && !Array.isArray(parsed)) {
            const keys = Object.keys(parsed);
            console.log('First 10 keys:', keys.slice(0, 10));
            
            // Check if keys are numeric (facility IDs)
            const numericKeys = keys.filter(k => /^\d+$/.test(k));
            console.log('\nNumeric keys (facility IDs):', numericKeys.length);
            
            if (numericKeys.length > 0) {
              const firstFacilityId = numericKeys[0];
              const facilityData = parsed[firstFacilityId];
              if (typeof facilityData === 'object') {
                const productIds = Object.keys(facilityData);
                console.log('First 5 product IDs:', productIds.slice(0, 5));
                
                if (productIds.length > 0) {
                  const firstProductId = productIds[0];
                  const productData = facilityData[firstProductId];
                  console.log('Product data:', JSON.stringify(productData, null, 2));
                  
                  // Check multiple products to see the pattern
                  productIds.slice(0, 5).forEach(productId => {
                    const product = facilityData[productId];
                  });
                }
              }
            }
            
            // Also check non-numeric keys
            const nonNumericKeys = keys.filter(k => !/^\d+$/.test(k));
            if (nonNumericKeys.length > 0) {
            }
          }
          
        } catch (e) {
          console.error('\n❌ JSON Parse Error:', e.message);
          console.log('Response preview:', data.substring(0, 500));
        }
      } else {
        console.log('Response:', data.substring(0, 500));
      }
    });
  }).on('error', (err) => {
    console.error('Request error:', err);
  });
}

// Run the test
testFacilityInventory();
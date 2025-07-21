// Test facility inventory endpoint properly
const https = require('https');

const apiKey = 'I9TVdRvblFod';
const apiSecret = '63h4TCI62vlQUYM3btEA7bycoIflGQUz';
const accountPath = 'buildasoilorganics';
const authString = Buffer.from(`${apiKey}:${apiSecret}`).toString('base64');

function testFacilityInventory() {
  console.log('🏭 TESTING FACILITY INVENTORY ENDPOINT\n');
  
  const url = `https://app.finaleinventory.com/${accountPath}/api/facility/inventory`;
  
  https.get(url, {
    headers: {
      'Authorization': `Basic ${authString}`,
      'Accept': 'application/json'
    }
  }, (res) => {
    console.log('Status:', res.statusCode);
    console.log('Headers:', res.headers);
    
    let data = '';
    
    res.on('data', (chunk) => {
      data += chunk;
    });
    
    res.on('end', () => {
      console.log('\nRaw response length:', data.length);
      
      if (res.statusCode === 200) {
        try {
          const parsed = JSON.parse(data);
          
          console.log('\n✅ Successfully parsed JSON!');
          console.log('Type:', typeof parsed);
          console.log('Is Array:', Array.isArray(parsed));
          
          if (typeof parsed === 'object' && !Array.isArray(parsed)) {
            const keys = Object.keys(parsed);
            console.log('Number of keys:', keys.length);
            console.log('First 10 keys:', keys.slice(0, 10));
            
            // Check if keys are numeric (facility IDs)
            const numericKeys = keys.filter(k => /^\d+$/.test(k));
            console.log('\nNumeric keys (facility IDs):', numericKeys.length);
            
            if (numericKeys.length > 0) {
              console.log('\n📍 FACILITY STRUCTURE:');
              const firstFacilityId = numericKeys[0];
              console.log(`\nFacility ID: ${firstFacilityId}`);
              
              const facilityData = parsed[firstFacilityId];
              console.log('Facility data type:', typeof facilityData);
              
              if (typeof facilityData === 'object') {
                const productIds = Object.keys(facilityData);
                console.log('Number of products in facility:', productIds.length);
                console.log('First 5 product IDs:', productIds.slice(0, 5));
                
                if (productIds.length > 0) {
                  console.log('\n📦 PRODUCT INVENTORY STRUCTURE:');
                  const firstProductId = productIds[0];
                  const productData = facilityData[firstProductId];
                  
                  console.log(`\nProduct ID: ${firstProductId}`);
                  console.log('Product data:', JSON.stringify(productData, null, 2));
                  
                  // Check multiple products to see the pattern
                  console.log('\n📊 SAMPLE INVENTORY DATA:');
                  productIds.slice(0, 5).forEach(productId => {
                    const product = facilityData[productId];
                    console.log(`\nProduct ${productId}:`, product);
                  });
                }
              }
            }
            
            // Also check non-numeric keys
            const nonNumericKeys = keys.filter(k => !/^\d+$/.test(k));
            if (nonNumericKeys.length > 0) {
              console.log('\n⚠️  Non-numeric keys found:', nonNumericKeys);
            }
          }
          
        } catch (e) {
          console.error('\n❌ JSON Parse Error:', e.message);
          console.log('Response preview:', data.substring(0, 500));
        }
      } else {
        console.log('\n❌ Request failed');
        console.log('Response:', data.substring(0, 500));
      }
    });
  }).on('error', (err) => {
    console.error('Request error:', err);
  });
}

// Run the test
testFacilityInventory();
// Test the productStock and productInventory endpoints
const https = require('https');

const apiKey = 'I9TVdRvblFod';
const apiSecret = '63h4TCI62vlQUYM3btEA7bycoIflGQUz';
const accountPath = 'buildasoilorganics';
const authString = Buffer.from(`${apiKey}:${apiSecret}`).toString('base64');

async function testProductStock() {
  console.log('🔍 TESTING PRODUCT STOCK ENDPOINTS\n');
  console.log('=' .repeat(60));
  
  // Test productStock endpoint
  console.log('\n📊 Testing /productStock endpoint:');
  
  const stockUrl = `https://app.finaleinventory.com/${accountPath}/api/productStock`;
  
  await new Promise((resolve) => {
    https.get(stockUrl, {
      headers: {
        'Authorization': `Basic ${authString}`,
        'Accept': 'application/json',
        'Content-Type': 'application/json'
      }
    }, (res) => {
      console.log('Status:', res.statusCode);
      console.log('Content-Type:', res.headers['content-type']);
      console.log('Content-Length:', res.headers['content-length']);
      
      let data = '';
      res.on('data', (chunk) => {
        data += chunk;
      });
      
      res.on('end', () => {
        console.log('\nRaw response:', data);
        console.log('Response length:', data.length);
        console.log('Response type:', typeof data);
        
        // Try to parse as JSON
        if (data && data !== 'undefined') {
          try {
            const parsed = JSON.parse(data);
            console.log('\n✅ Parsed as JSON!');
            console.log('Type:', typeof parsed);
            console.log('Is Array:', Array.isArray(parsed));
            console.log('Keys:', Object.keys(parsed).slice(0, 20));
            
            // If it's the facility structure
            if (typeof parsed === 'object' && !Array.isArray(parsed)) {
              const keys = Object.keys(parsed);
              const facilityKeys = keys.filter(k => /^\d+$/.test(k));
              
              if (facilityKeys.length > 0) {
                console.log('\n📍 Found facility-based structure!');
                console.log('Number of facilities:', facilityKeys.length);
                console.log('Facility IDs:', facilityKeys.slice(0, 5));
                
                // Check first facility
                const firstFacility = parsed[facilityKeys[0]];
                console.log('\nFirst facility data:');
                console.log('Type:', typeof firstFacility);
                
                if (typeof firstFacility === 'object') {
                  const productKeys = Object.keys(firstFacility);
                  console.log('Products in facility:', productKeys.length);
                  console.log('First 5 products:', productKeys.slice(0, 5));
                  
                  // Check first product
                  if (productKeys.length > 0) {
                    console.log('\nFirst product data:');
                    console.log(productKeys[0], ':', firstFacility[productKeys[0]]);
                    
                    // Show a few more products
                    console.log('\nSample inventory data:');
                    productKeys.slice(0, 5).forEach(productId => {
                      console.log(`Product ${productId}: ${firstFacility[productId]}`);
                    });
                  }
                }
              }
            }
          } catch (e) {
            console.log('\n❌ Not valid JSON:', e.message);
          }
        }
        resolve();
      });
    }).on('error', (err) => {
      console.error('Request error:', err);
      resolve();
    });
  });
  
  // Test productInventory endpoint
  console.log('\n\n📊 Testing /productInventory endpoint:');
  
  const inventoryUrl = `https://app.finaleinventory.com/${accountPath}/api/productInventory`;
  
  await new Promise((resolve) => {
    https.get(inventoryUrl, {
      headers: {
        'Authorization': `Basic ${authString}`,
        'Accept': 'application/json'
      }
    }, (res) => {
      console.log('Status:', res.statusCode);
      
      let data = '';
      res.on('data', (chunk) => {
        data += chunk;
      });
      
      res.on('end', () => {
        console.log('\nRaw response:', data);
        
        if (data && data !== 'undefined') {
          try {
            const parsed = JSON.parse(data);
            console.log('\n✅ Parsed as JSON!');
            console.log('Structure:', JSON.stringify(parsed, null, 2).substring(0, 500));
          } catch (e) {
            console.log('Not JSON');
          }
        }
        resolve();
      });
    }).on('error', () => resolve());
  });
}

// Run the test
testProductStock().catch(console.error);
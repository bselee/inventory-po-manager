// Test Finale API configuration
const https = require('https');

async function testFinaleConfig() {
  console.log('Testing Finale API Configuration...\n');
  
  // Direct test with credentials from the test-finale-direct endpoint
  const apiKey = 'I9TVdRvblFod';
  const apiSecret = '63h4TCI62vlQUYM3btEA7bycoIflGQUz';
  const accountPath = 'buildasoilorganics';
  
  const authString = Buffer.from(`${apiKey}:${apiSecret}`).toString('base64');
  const url = `https://app.finaleinventory.com/${accountPath}/api/product?limit=1`;
  
  console.log('Testing connection to:', url);
  console.log('Account:', accountPath);
  
  return new Promise((resolve, reject) => {
    https.get(url, {
      headers: {
        'Authorization': `Basic ${authString}`,
        'Accept': 'application/json',
        'Content-Type': 'application/json'
      }
    }, (res) => {
      let data = '';
      
      res.on('data', (chunk) => {
        data += chunk;
      });
      
      res.on('end', () => {
        console.log('\nResponse Status:', res.statusCode);
        console.log('Response Headers:', res.headers);
        
        if (res.statusCode === 200) {
          console.log('\n✅ Finale API connection successful!');
          
          try {
            const parsed = JSON.parse(data);
            console.log('\nResponse type:', Array.isArray(parsed) ? 'Array' : 'Object');
            
            if (parsed.productId && Array.isArray(parsed.productId)) {
              console.log('Format: Parallel arrays');
              console.log('Product count:', parsed.productId.length);
              console.log('First product ID:', parsed.productId[0]);
            } else if (Array.isArray(parsed) && parsed.length > 0) {
              console.log('Format: Standard array');
              console.log('Product count:', parsed.length);
              console.log('First product:', parsed[0]);
            }
            
            console.log('\n✅ Configuration to use in settings:');
            console.log('   API Key:', apiKey);
            console.log('   API Secret:', apiSecret);
            console.log('   Account Path:', accountPath);
            
          } catch (e) {
            console.log('Response preview:', data.substring(0, 200));
          }
        } else {
          console.log('\n❌ Connection failed');
          console.log('Response:', data.substring(0, 500));
        }
        
        resolve();
      });
    }).on('error', (err) => {
      console.error('❌ Request error:', err.message);
      reject(err);
    });
  });
}

// Run the test
testFinaleConfig().catch(console.error);
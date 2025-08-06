// Test Finale API configuration
const https = require('https');

async function testFinaleConfig() {
  // Direct test with credentials from the test-finale-direct endpoint
  const apiKey = 'I9TVdRvblFod';
  const apiSecret = '63h4TCI62vlQUYM3btEA7bycoIflGQUz';
  const accountPath = 'buildasoilorganics';
  
  const authString = Buffer.from(`${apiKey}:${apiSecret}`).toString('base64');
  const url = `https://app.finaleinventory.com/${accountPath}/api/product?limit=1`;
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
        if (res.statusCode === 200) {
          try {
            const parsed = JSON.parse(data);
            console.log('\nResponse type:', Array.isArray(parsed) ? 'Array' : 'Object');
            
            if (parsed.productId && Array.isArray(parsed.productId)) {
            } else if (Array.isArray(parsed) && parsed.length > 0) {
            }
          } catch (e) {
            console.log('Response preview:', data.substring(0, 200));
          }
        } else {
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
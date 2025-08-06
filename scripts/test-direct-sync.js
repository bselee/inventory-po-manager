#!/usr/bin/env node

const http = require('http');
const testSync = async (filterYear) => {
  return new Promise((resolve, reject) => {
    const data = JSON.stringify({ 
      dryRun: false,
      filterYear: filterYear
    });

    const options = {
      hostname: 'localhost',
      port: 3001,
      path: '/api/sync-finale-simple',
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Content-Length': data.length
      }
    };
    const req = http.request(options, (res) => {
      let responseData = '';
      
      res.on('data', (chunk) => {
        responseData += chunk;
      });
      
      res.on('end', () => {
        try {
          const result = JSON.parse(responseData);
          resolve(result);
        } catch (e) {
          console.log('Raw response:', responseData.substring(0, 500));
          reject(e);
        }
      });
    });

    req.on('error', reject);
    req.write(data);
    req.end();
  });
};

// Test different filter options
async function runTests() {
  try {
    // Test with current year
    console.log('\n1. Testing current year (2025):');
    await testSync(2025);
    
    // Test with last 2 years
    console.log('\n2. Testing last 2 years (2024):');
    await testSync(2024);
    
    // Test with no filter
    console.log('\n3. Testing no filter (all data):');
    await testSync(null);
    
  } catch (error) {
    console.error('Error:', error.message);
  }
}

runTests();
#!/usr/bin/env node

const http = require('http');

console.log('\n🚀 SYNCING ALL INVENTORY FROM FINALE\n');

const data = JSON.stringify({ 
  syncType: 'full',
  filterYear: null,  // Get ALL items
  dryRun: false
});

const options = {
  hostname: 'localhost',
  port: 3001,
  path: '/api/sync-finale',
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
      
      if (result.data?.success || result.success) {
        console.log('✅ Sync started successfully!');
        console.log('Check http://localhost:3001/settings for progress');
        console.log('\nOr run this to check inventory count:');
        console.log('curl http://localhost:3001/api/inventory | grep -o "total":[0-9]*');
      } else {
        console.log('❌ Sync failed:', result.data?.error || result.error || result.message);
        
        if (result.data?.message?.includes('configured')) {
          console.log('\n⚠️  Finale API not configured!');
          console.log('1. Go to http://localhost:3001/settings');
          console.log('2. Enter your Finale API credentials');
          console.log('3. Test the connection');
          console.log('4. Then try this sync again');
        }
      }
    } catch (e) {
      console.error('Response:', responseData);
    }
  });
});

req.on('error', (error) => {
  console.error('❌ Error:', error.message);
  if (error.code === 'ECONNREFUSED') {
    console.log('\nMake sure dev server is running: npm run dev');
  }
});

req.write(data);
req.end();

console.log('Request sent. Waiting for response...');
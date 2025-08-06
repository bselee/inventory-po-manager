#!/usr/bin/env node

const http = require('http');

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


      } else {

        if (result.data?.message?.includes('configured')) {


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

  }
});

req.write(data);
req.end();

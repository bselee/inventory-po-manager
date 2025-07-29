#!/usr/bin/env node

const http = require('http');

console.log('Testing Finale API connection...\n');

const options = {
  hostname: 'localhost',
  port: 3001,
  path: '/api/test-finale-direct',
  method: 'GET'
};

const req = http.request(options, (res) => {
  let data = '';
  
  res.on('data', (chunk) => {
    data += chunk;
  });
  
  res.on('end', () => {
    try {
      const result = JSON.parse(data);
      console.log('Result:', JSON.stringify(result, null, 2));
    } catch (e) {
      console.log('Raw response:', data);
    }
  });
});

req.on('error', (error) => {
  console.error('Error:', error);
});

req.end();
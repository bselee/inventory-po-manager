#!/usr/bin/env node

/**
 * Quick Finale API Test
 * Tests the most common API endpoint with your credentials
 */

const https = require('https');

// IMPORTANT: Update these with your actual credentials
const CONFIG = {
  accountPath: 'buildasoilorganics',  // Your account identifier
  apiKey: 'YOUR_API_KEY_HERE',       // Replace with your API key
  apiSecret: 'YOUR_API_SECRET_HERE'   // Replace with your API secret
};

console.log('🔍 Quick Finale API Test');
console.log('========================\n');

// Test the main API endpoint
const authString = Buffer.from(`${CONFIG.apiKey}:${CONFIG.apiSecret}`).toString('base64');
const apiUrl = `/api/${CONFIG.accountPath}/product?limit=1`;

console.log(`Testing: https://app.finaleinventory.com${apiUrl}`);
console.log(`Account: ${CONFIG.accountPath}`);
console.log(`Auth: Basic ${authString.substring(0, 10)}...`);

const options = {
  hostname: 'app.finaleinventory.com',
  port: 443,
  path: apiUrl,
  method: 'GET',
  headers: {
    'Authorization': `Basic ${authString}`,
    'Accept': 'application/json',
    'Content-Type': 'application/json',
    'User-Agent': 'BuildASoil-Test/1.0'
  }
};

const req = https.request(options, (res) => {
  console.log(`\nStatus: ${res.statusCode} ${res.statusMessage}`);
  console.log('Headers:', JSON.stringify(res.headers, null, 2));
  
  let data = '';
  res.on('data', (chunk) => data += chunk);
  
  res.on('end', () => {
    console.log('\nResponse Body:');
    
    if (res.statusCode === 200) {
      try {
        const parsed = JSON.parse(data);
        console.log('✅ SUCCESS! API is working.');
        console.log(`Received ${Array.isArray(parsed) ? parsed.length : 'unknown'} products`);
        
        if (Array.isArray(parsed) && parsed.length > 0) {
          console.log('\nSample product:', JSON.stringify(parsed[0], null, 2));
        }
      } catch (e) {
        console.log('Response:', data.substring(0, 500));
      }
    } else {
      console.log('❌ FAILED');
      console.log('Response:', data || '(empty)');
      
      if (res.statusCode === 401) {
        console.log('\n💡 Fix: Check your API key and secret are correct');
      } else if (res.statusCode === 404) {
        console.log('\n💡 Fix: Check your account path is correct');
      }
    }
    
    console.log('\n📋 Configuration to use in your app:');
    console.log(`Account Path: ${CONFIG.accountPath}`);
    console.log(`API Base URL: https://app.finaleinventory.com/api/${CONFIG.accountPath}/`);
  });
});

req.on('error', (e) => {
  console.error('❌ Request failed:', e.message);
});

req.end();

console.log('\nMaking request...');
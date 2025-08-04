#!/usr/bin/env node

/**
 * Test script to check Finale product structure directly
 * This will help us understand the actual data format
 */

const https = require('https');

const baseUrl = 'https://inventory-po-manager.vercel.app';

console.log('🔍 Testing Finale product data structure...');
console.log(`📍 Using URL: ${baseUrl}`);

// Create a test request to check Finale data structure
const data = JSON.stringify({
  test: true
});

const url = new URL(`${baseUrl}/api/finale-debug`);

const options = {
  hostname: url.hostname,
  port: url.port || 443,
  path: url.pathname,
  method: 'POST',
  headers: {
    'Content-Type': 'application/json',
    'Content-Length': data.length
  },
  timeout: 60000 // 1 minute timeout
};

const req = https.request(options, (res) => {
  let responseData = '';

  res.on('data', (chunk) => {
    responseData += chunk;
  });

  res.on('end', () => {
    try {
      const result = JSON.parse(responseData);
      
      if (res.statusCode === 200 && result.success) {
        console.log('✅ Finale connection successful!');
        
        if (result.sampleProduct) {
          console.log('\n📋 Sample product structure:');
          console.log(JSON.stringify(result.sampleProduct, null, 2));
          
          // Check for supplier data
          console.log('\n🔍 Supplier data analysis:');
          console.log(`Has supplierList: ${!!result.sampleProduct.supplierList}`);
          console.log(`Has supplier: ${!!result.sampleProduct.supplier}`);
          console.log(`Has vendorName: ${!!result.sampleProduct.vendorName}`);
          console.log(`Has vendor: ${!!result.sampleProduct.vendor}`);
          console.log(`Has primarySupplierName: ${!!result.sampleProduct.primarySupplierName}`);
          
          if (result.sampleProduct.supplierList) {
            console.log(`SupplierList length: ${result.sampleProduct.supplierList.length}`);
            if (result.sampleProduct.supplierList.length > 0) {
              console.log('First supplier:', JSON.stringify(result.sampleProduct.supplierList[0], null, 2));
            }
          }
        }
        
        if (result.vendorEndpoint) {
          console.log(`\n✅ Working vendor endpoint: ${result.vendorEndpoint}`);
        }
        
      } else {
        console.error('❌ Finale debug failed!');
        console.error(`Status: ${res.statusCode}`);
        if (result.error) {
          console.error(`Error: ${result.error}`);
        }
      }
    } catch (e) {
      console.error('❌ Failed to parse response:', e.message);
      console.error('Raw response:', responseData.substring(0, 500));
    }
  });
});

req.on('error', (error) => {
  console.error('❌ Request failed:', error.message);
});

req.on('timeout', () => {
  console.error('❌ Request timed out');
  req.destroy();
});

console.log('⏳ Sending test request...');
req.write(data);
req.end();
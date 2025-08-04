#!/usr/bin/env node

/**
 * Test script to check Finale inventory data structure
 * This will help us understand why vendor data isn't being populated
 */

const https = require('https');

const baseUrl = 'https://inventory-po-manager.vercel.app';

console.log('🔍 Testing Finale inventory data structure...');
console.log(`📍 Using URL: ${baseUrl}`);

// First, let's trigger a small inventory sync to see the data structure
const data = JSON.stringify({
  syncType: 'inventory_only',
  limit: 5, // Just get 5 items to inspect
  debug: true
});

const url = new URL(`${baseUrl}/api/sync-finale`);

const options = {
  hostname: url.hostname,
  port: url.port || 443,
  path: url.pathname,
  method: 'POST',
  headers: {
    'Content-Type': 'application/json',
    'Content-Length': data.length
  },
  timeout: 300000 // 5 minute timeout
};

const req = https.request(options, (res) => {
  let responseData = '';

  res.on('data', (chunk) => {
    responseData += chunk;
  });

  res.on('end', () => {
    try {
      const result = JSON.parse(responseData);
      
      if (res.statusCode === 200 || res.statusCode === 409) {
        if (res.statusCode === 409) {
          console.log('⚠️ Sync already running. Checking current data instead...');
        }
        
        // Now let's check the inventory data
        console.log('\n📊 Fetching sample inventory data...');
        
        const inventoryUrl = new URL(`${baseUrl}/api/inventory?limit=5`);
        
        https.get(inventoryUrl.href, (invRes) => {
          let invData = '';
          
          invRes.on('data', (chunk) => {
            invData += chunk;
          });
          
          invRes.on('end', () => {
            try {
              const inventory = JSON.parse(invData);
              
              if (inventory.data && inventory.data.inventory) {
                const items = inventory.data.inventory;
                console.log(`\n✅ Found ${items.length} inventory items`);
                console.log('\n📋 Sample item structure:');
                
                items.forEach((item, index) => {
                  console.log(`\nItem ${index + 1}:`);
                  console.log(`  SKU: ${item.sku}`);
                  console.log(`  Name: ${item.product_name || item.name || 'N/A'}`);
                  console.log(`  Stock: ${item.current_stock || item.stock || 0}`);
                  console.log(`  Vendor: ${item.vendor || 'NO VENDOR DATA'}`);
                  console.log(`  Cost: $${item.cost || 0}`);
                  console.log(`  Location: ${item.location || 'N/A'}`);
                  console.log(`  Has Vendor: ${!!item.vendor}`);
                });
                
                // Summary
                const itemsWithVendor = items.filter(item => item.vendor && item.vendor.trim() !== '').length;
                console.log(`\n📊 Summary:`);
                console.log(`  Total items: ${items.length}`);
                console.log(`  Items with vendor data: ${itemsWithVendor}`);
                console.log(`  Items without vendor: ${items.length - itemsWithVendor}`);
              }
            } catch (e) {
              console.error('❌ Failed to parse inventory response:', e.message);
            }
          });
        }).on('error', (err) => {
          console.error('❌ Failed to fetch inventory:', err.message);
        });
        
      } else {
        console.error('❌ Sync request failed!');
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
  console.error('❌ Request timed out after 5 minutes');
  req.destroy();
});

console.log('⏳ Sending test request...');
req.write(data);
req.end();
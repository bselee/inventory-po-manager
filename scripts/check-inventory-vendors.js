#!/usr/bin/env node

/**
 * Script to check vendor data in existing inventory
 */

const https = require('https');

const baseUrl = 'https://inventory-po-manager.vercel.app';

console.log('🔍 Checking vendor data in inventory...');
console.log(`📍 Using URL: ${baseUrl}`);

const inventoryUrl = new URL(`${baseUrl}/api/inventory?limit=10`);

https.get(inventoryUrl.href, (res) => {
  let data = '';
  
  res.on('data', (chunk) => {
    data += chunk;
  });
  
  res.on('end', () => {
    try {
      const result = JSON.parse(data);
      
      if (result.data && result.data.inventory) {
        const items = result.data.inventory;
        console.log(`\n✅ Found ${items.length} inventory items`);
        console.log('\n📋 Inventory item vendor analysis:');
        
        items.forEach((item, index) => {
          console.log(`\nItem ${index + 1}:`);
          console.log(`  SKU: ${item.sku}`);
          console.log(`  Name: ${item.product_name || item.name || 'N/A'}`);
          console.log(`  Vendor: "${item.vendor || ''}" (${item.vendor ? 'HAS VENDOR' : 'NO VENDOR'})`);
          console.log(`  Stock: ${item.current_stock || item.stock || 0}`);
        });
        
        // Summary
        const itemsWithVendor = items.filter(item => item.vendor && item.vendor.trim() !== '').length;
        console.log(`\n📊 Summary:`);
        console.log(`  Total items checked: ${items.length}`);
        console.log(`  Items with vendor data: ${itemsWithVendor}`);
        console.log(`  Items without vendor: ${items.length - itemsWithVendor}`);
        console.log(`  Percentage with vendors: ${((itemsWithVendor / items.length) * 100).toFixed(1)}%`);
        
        // Check total count
        if (result.data.pagination) {
          console.log(`\n📈 Total inventory:`);
          console.log(`  Total items in database: ${result.data.pagination.total}`);
        }
      } else {
        console.error('❌ No inventory data found in response');
      }
    } catch (e) {
      console.error('❌ Failed to parse response:', e.message);
      console.error('Response:', data.substring(0, 200));
    }
  });
}).on('error', (err) => {
  console.error('❌ Failed to fetch inventory:', err.message);
});
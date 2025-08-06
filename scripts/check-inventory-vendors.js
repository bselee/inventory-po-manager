#!/usr/bin/env node

/**
 * Script to check vendor data in existing inventory
 */

const https = require('https');

const baseUrl = 'https://inventory-po-manager.vercel.app';
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
        items.forEach((item, index) => {
        });
        
        // Summary
        const itemsWithVendor = items.filter(item => item.vendor && item.vendor.trim() !== '').length;
        // Check total count
        if (result.data.pagination) {
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
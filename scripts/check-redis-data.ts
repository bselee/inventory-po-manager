#!/usr/bin/env tsx

import { createClient } from 'redis';
import { config } from 'dotenv';

config({ path: '.env.local' });

async function checkRedisData() {
  const client = createClient({ url: process.env.REDIS_URL });
  await client.connect();

  console.log('Checking Redis data structure...\n');

  // Check for inventory-related keys
  const inventoryKeys = await client.keys('inventory:*');
  console.log('Found', inventoryKeys.length, 'inventory keys');

  // Check for the main inventory cache
  const fullInventory = await client.get('inventory:full');
  console.log('inventory:full exists:', Boolean(fullInventory));
  if (fullInventory) {
    const data = JSON.parse(fullInventory);
    console.log('  - Contains', Array.isArray(data) ? data.length : 0, 'items');
  }

  // Check for summary
  const summary = await client.get('inventory:summary');
  console.log('inventory:summary exists:', Boolean(summary));
  if (summary) {
    console.log('  - Summary:', JSON.parse(summary));
  }

  // Check vendors
  const vendorsFull = await client.get('vendors:full');
  console.log('vendors:full exists:', Boolean(vendorsFull));
  if (vendorsFull) {
    const data = JSON.parse(vendorsFull);
    console.log('  - Contains', Array.isArray(data) ? data.length : 0, 'vendors');
  }

  // Get a sample inventory item
  if (inventoryKeys.length > 0) {
    const sampleKeys = inventoryKeys
      .filter(k => !k.includes(':full') && !k.includes(':summary') && !k.includes(':last_sync') && !k.includes(':sync_status'))
      .slice(0, 3);
    
    console.log('\nSample inventory items:');
    for (const key of sampleKeys) {
      const item = await client.get(key);
      if (item) {
        console.log(`  ${key}:`, JSON.parse(item));
      }
    }
  }

  // Check last sync times
  console.log('\nSync status:');
  const invLastSync = await client.get('inventory:last_sync');
  const vendorLastSync = await client.get('vendors:last_sync');
  console.log('  Inventory last sync:', invLastSync || 'Never');
  console.log('  Vendors last sync:', vendorLastSync || 'Never');

  await client.disconnect();
}

checkRedisData().catch(console.error);
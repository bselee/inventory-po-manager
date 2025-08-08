#!/usr/bin/env node

const https = require('https');
const Redis = require('ioredis');
require('dotenv').config({ path: '.env.local' });

// Initialize Redis client
const redis = new Redis(process.env.REDIS_URL || 'redis://localhost:6379');

// Finale API Configuration
const FINALE_CONFIG = {
  apiKey: process.env.FINALE_API_KEY || 'I9TVdRvblFod',
  apiSecret: process.env.FINALE_API_SECRET || '63h4TCI62vlQUYM3btEA7bycoIflGQUz',
  accountPath: process.env.FINALE_ACCOUNT_PATH || 'buildasoilorganics'
};

// Create Basic Auth header
const auth = Buffer.from(`${FINALE_CONFIG.apiKey}:${FINALE_CONFIG.apiSecret}`).toString('base64');

/**
 * Transform report URL to use JSON format
 */
function transformToJsonUrl(reportUrl) {
  // Replace pivotTableStream with pivotTable
  let url = reportUrl.replace('pivotTableStream', 'pivotTable');
  
  // Replace Report.csv with Report.json
  url = url.replace('Report.csv', 'Report.json');
  
  // Change format parameter to jsonObject
  url = url.replace('format=csv', 'format=jsonObject');
  
  return url;
}

/**
 * Fetch JSON data from Finale Report
 */
async function fetchFinaleJson(reportUrl, reportName) {
  return new Promise((resolve) => {
    const jsonUrl = transformToJsonUrl(reportUrl);
    console.log(`📥 Fetching ${reportName} report...`);
    
    const url = new URL(jsonUrl);
    const options = {
      hostname: url.hostname,
      port: 443,
      path: url.pathname + url.search,
      method: 'GET',
      headers: {
        'Authorization': `Basic ${auth}`,
        'Accept': 'application/json',
        'Content-Type': 'application/json',
        'User-Agent': 'BuildASoil-Inventory/1.0'
      }
    };

    https.get(options, (res) => {
      let data = '';
      
      console.log(`  Response status: ${res.statusCode}`);
      
      res.on('data', (chunk) => {
        data += chunk;
      });
      
      res.on('end', () => {
        if (res.statusCode === 200) {
          try {
            const jsonData = JSON.parse(data);
            console.log(`✅ Received ${Array.isArray(jsonData) ? jsonData.length : 0} records`);
            resolve(jsonData);
          } catch (e) {
            console.log('❌ Failed to parse JSON response');
            resolve(null);
          }
        } else if (res.statusCode === 401) {
          console.log('❌ Authentication failed - check API credentials');
          resolve(null);
        } else {
          console.log(`❌ Request failed with status ${res.statusCode}`);
          resolve(null);
        }
      });
    }).on('error', (err) => {
      console.log(`❌ Network error: ${err.message}`);
      resolve(null);
    });
  });
}

/**
 * Sync vendor data to Redis
 */
async function syncVendors() {
  try {
    console.log('\n🏢 Syncing Vendors to Redis...');
    
    const data = await fetchFinaleJson(process.env.FINALE_VENDORS_REPORT_URL, 'Vendors');
    
    if (!data || !Array.isArray(data)) {
      console.log('❌ No vendor data received');
      return 0;
    }
    
    // Clear existing vendors in Redis
    const vendorKeys = await redis.keys('vendor:*');
    if (vendorKeys.length > 0) {
      await redis.del(...vendorKeys);
    }
    
    // Process and store vendors
    const vendors = [];
    for (let i = 0; i < data.length; i++) {
      const record = data[i];
      
      // Debug first record
      if (i === 0) {
        console.log('  Sample vendor fields:', Object.keys(record).slice(0, 5));
      }
      
      const vendorId = `vendor-${i + 1}`;
      const vendorName = record['Supplier'] || record['Name'] || record['Organization'] || 
                         record['Party'] || record['Vendor'] || 
                         Object.values(record)[0] || `Vendor-${i}`;
      
      const vendor = {
        id: vendorId,
        name: String(vendorName).trim(),
        email: record['Email'] || null,
        phone: record['Phone'] || null,
        address: record['Address'] || null,
        city: record['City'] || null,
        state: record['State'] || null,
        zip: record['Zip'] || record['Postal Code'] || null,
        country: record['Country'] || null,
        website: record['Website'] || null,
        contact_name: record['Contact'] || null,
        payment_terms: record['Payment Terms'] || null,
        active: true,
        notes: record['Notes'] || null,
        last_updated: new Date().toISOString()
      };
      
      // Store individual vendor
      await redis.set(`vendor:${vendorId}`, JSON.stringify(vendor));
      vendors.push(vendor);
    }
    
    // Store vendor list
    await redis.set('vendors:all', JSON.stringify(vendors));
    await redis.set('vendors:count', vendors.length);
    await redis.set('vendors:last_sync', new Date().toISOString());
    
    console.log(`✅ Synced ${vendors.length} vendors to Redis`);
    return vendors.length;
    
  } catch (error) {
    console.error('❌ Error syncing vendors:', error.message);
    return 0;
  }
}

/**
 * Sync inventory data to Redis
 */
async function syncInventory() {
  try {
    console.log('\n📦 Syncing Inventory to Redis...');
    
    const data = await fetchFinaleJson(process.env.FINALE_INVENTORY_REPORT_URL, 'Inventory');
    
    if (!data || !Array.isArray(data)) {
      console.log('❌ No inventory data received');
      return 0;
    }
    
    // Clear existing inventory in Redis
    const inventoryKeys = await redis.keys('inventory:*');
    if (inventoryKeys.length > 0) {
      await redis.del(...inventoryKeys);
    }
    
    // Process and store inventory items
    const items = [];
    for (let i = 0; i < data.length; i++) {
      const record = data[i];
      
      // Debug first record
      if (i === 0) {
        console.log('  Sample inventory fields:', Object.keys(record).slice(0, 10));
      }
      
      // Parse numeric values
      const parseNumber = (val) => {
        if (val === null || val === undefined || val === '') return 0;
        const num = parseFloat(String(val).replace(/,/g, ''));
        return isNaN(num) ? 0 : num;
      };
      
      const itemId = record['Product ID'] || record['SKU'] || `ITEM-${i}`;
      
      const item = {
        id: itemId,
        product_id: itemId,
        product_name: record['Product'] || record['Product Name'] || record['Description'] || 
                     record['Item'] || `Item ${i}`,
        sku: record['SKU'] || record['Product ID'] || null,
        barcode: record['Barcode'] || record['UPC'] || null,
        vendor: record['Supplier'] || record['Vendor'] || record['Supplier '] || null,
        category: record['Category'] || null,
        location: record['Location'] || record['Facility'] || 'Main',
        quantity_available: parseNumber(record['Units in Stock'] || record['In Stock'] || 
                                       record['Available'] || 0),
        quantity_on_hand: parseNumber(record['Units in Stock'] || record['On Hand'] || 0),
        quantity_on_order: parseNumber(record['Units On Order'] || record['On Order'] || 0),
        reorder_point: parseNumber(record['ReOr point'] || record['Reorder Point'] || 10),
        reorder_quantity: parseNumber(record['Qty to Order'] || record['Order Qty'] || 50),
        unit_cost: parseNumber(record['Unit Cost'] || record['Cost'] || 0),
        retail_price: parseNumber(record['Retail Price'] || record['Price'] || 0),
        sales_velocity: parseNumber(record['Sales Velocity Consolidated'] || 
                                   record['Sales Velocity'] || 0),
        sales_last_30_days: parseNumber(record['Sales Last 30 Days'] || 0),
        sales_last_90_days: parseNumber(record['Sales Last 90 Days'] || 0),
        units_remaining: parseNumber(record['Units Remain'] || record['Units in Stock'] || 0),
        status: 'active',
        last_updated: new Date().toISOString()
      };
      
      // Store individual item
      await redis.set(`inventory:${itemId}`, JSON.stringify(item));
      items.push(item);
      
      // Show progress for large datasets
      if ((i + 1) % 100 === 0) {
        console.log(`  Processed ${i + 1} items...`);
      }
    }
    
    // Store inventory list (might be large, so store in chunks)
    const chunkSize = 500;
    for (let i = 0; i < items.length; i += chunkSize) {
      const chunk = items.slice(i, i + chunkSize);
      await redis.set(`inventory:chunk:${Math.floor(i / chunkSize)}`, JSON.stringify(chunk));
    }
    
    // Store metadata
    await redis.set('inventory:all', JSON.stringify(items));
    await redis.set('inventory:count', items.length);
    await redis.set('inventory:chunks', Math.ceil(items.length / chunkSize));
    await redis.set('inventory:last_sync', new Date().toISOString());
    
    console.log(`✅ Synced ${items.length} inventory items to Redis`);
    return items.length;
    
  } catch (error) {
    console.error('❌ Error syncing inventory:', error.message);
    return 0;
  }
}

/**
 * Sync purchase orders to Redis (if we can get them)
 */
async function syncPurchaseOrders() {
  try {
    console.log('\n📋 Creating sample Purchase Orders in Redis...');
    
    // For now, create some sample POs based on inventory data
    const inventoryData = await redis.get('inventory:all');
    if (!inventoryData) {
      console.log('  No inventory data to base POs on');
      return 0;
    }
    
    const inventory = JSON.parse(inventoryData);
    
    // Create sample POs for items that need reordering
    const purchaseOrders = [];
    const lowStockItems = inventory.filter(item => 
      item.quantity_available < item.reorder_point && item.vendor
    );
    
    // Group by vendor
    const vendorGroups = {};
    lowStockItems.forEach(item => {
      if (!vendorGroups[item.vendor]) {
        vendorGroups[item.vendor] = [];
      }
      vendorGroups[item.vendor].push(item);
    });
    
    // Create POs
    let poNumber = 1;
    for (const [vendor, items] of Object.entries(vendorGroups).slice(0, 5)) {
      const po = {
        id: `po-${poNumber}`,
        po_number: `PO-2025-${String(poNumber).padStart(3, '0')}`,
        vendor: vendor,
        vendor_email: null,
        status: poNumber === 1 ? 'sent' : poNumber === 2 ? 'received' : 'draft',
        items: items.slice(0, 5).map(item => ({
          product_id: item.product_id,
          product_name: item.product_name,
          quantity: item.reorder_quantity || 50,
          unit_cost: item.unit_cost || 10,
          total: (item.reorder_quantity || 50) * (item.unit_cost || 10)
        })),
        total_amount: items.slice(0, 5).reduce((sum, item) => 
          sum + ((item.reorder_quantity || 50) * (item.unit_cost || 10)), 0
        ),
        notes: `Reorder for low stock items`,
        created_at: new Date(Date.now() - poNumber * 24 * 60 * 60 * 1000).toISOString(),
        last_updated: new Date().toISOString()
      };
      
      await redis.set(`purchase_order:${po.id}`, JSON.stringify(po));
      purchaseOrders.push(po);
      poNumber++;
    }
    
    // Store PO list
    await redis.set('purchase_orders:all', JSON.stringify(purchaseOrders));
    await redis.set('purchase_orders:count', purchaseOrders.length);
    await redis.set('purchase_orders:last_sync', new Date().toISOString());
    
    console.log(`✅ Created ${purchaseOrders.length} purchase orders in Redis`);
    return purchaseOrders.length;
    
  } catch (error) {
    console.error('❌ Error creating purchase orders:', error.message);
    return 0;
  }
}

/**
 * Test Redis connection
 */
async function testRedisConnection() {
  try {
    await redis.ping();
    console.log('✅ Redis connection successful');
    return true;
  } catch (error) {
    console.error('❌ Redis connection failed:', error.message);
    return false;
  }
}

/**
 * Main sync function
 */
async function main() {
  console.log('🚀 Finale to Redis Sync');
  console.log('================================\n');
  
  // Test Redis connection
  console.log('🔌 Testing Redis connection...');
  const redisConnected = await testRedisConnection();
  if (!redisConnected) {
    console.log('\n❌ Cannot connect to Redis');
    console.log('Please check REDIS_URL in .env.local');
    process.exit(1);
  }
  
  // Check Finale configuration
  if (!FINALE_CONFIG.apiKey || !FINALE_CONFIG.apiSecret) {
    console.error('❌ Missing Finale API credentials');
    process.exit(1);
  }
  
  console.log('\n📌 Configuration:');
  console.log(`  Account: ${FINALE_CONFIG.accountPath}`);
  console.log(`  API Key: ${FINALE_CONFIG.apiKey.substring(0, 4)}...`);
  console.log(`  Redis: Connected`);
  console.log('');
  
  let vendorCount = 0;
  let inventoryCount = 0;
  let poCount = 0;
  
  try {
    // Sync vendors
    vendorCount = await syncVendors();
    
    // Sync inventory
    inventoryCount = await syncInventory();
    
    // Create sample purchase orders
    poCount = await syncPurchaseOrders();
    
  } catch (error) {
    console.error('❌ Sync error:', error.message);
  } finally {
    // Close Redis connection
    await redis.quit();
  }
  
  // Summary
  console.log('\n================================');
  console.log('✅ Sync Complete!');
  console.log(`📊 Results:`);
  console.log(`  • ${vendorCount} vendors in Redis`);
  console.log(`  • ${inventoryCount} inventory items in Redis`);
  console.log(`  • ${poCount} purchase orders in Redis`);
  
  if (vendorCount > 0 || inventoryCount > 0) {
    console.log('\n🎉 SUCCESS! Your Finale data is now in Redis/Vercel KV');
    console.log('\n📍 Next steps:');
    console.log('1. Your app at http://localhost:3000 should now show real data');
    console.log('2. Check the Inventory page for products');
    console.log('3. Check the Vendors page for suppliers');
    console.log('4. Check Purchase Orders for suggested reorders');
  } else {
    console.log('\n⚠️ No data was synced');
    console.log('Please check the Finale report URLs and API credentials');
  }
}

// Run the sync
main().catch(console.error);
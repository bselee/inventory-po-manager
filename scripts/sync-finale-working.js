#!/usr/bin/env node

const https = require('https');
const { createClient } = require('@supabase/supabase-js');
require('dotenv').config({ path: '.env.local' });

// Initialize Supabase
const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

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
    console.log(`  URL: ${jsonUrl.substring(0, 100)}...`);
    
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
      console.log(`  Content-Type: ${res.headers['content-type']}`);
      
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
            console.log('  Response preview:', data.substring(0, 200));
            resolve(null);
          }
        } else if (res.statusCode === 401) {
          console.log('❌ Authentication failed');
          console.log('  Please check API credentials in .env.local');
          resolve(null);
        } else {
          console.log(`❌ Request failed with status ${res.statusCode}`);
          if (data.includes('html')) {
            console.log('  Received HTML - authentication may be required');
          }
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
 * Sync vendor data
 */
async function syncVendors() {
  try {
    console.log('\n🏢 Syncing Vendors from Finale...');
    
    const data = await fetchFinaleJson(process.env.FINALE_VENDORS_REPORT_URL, 'Vendors');
    
    if (!data || !Array.isArray(data)) {
      console.log('❌ No vendor data received');
      return 0;
    }
    
    // Clear existing vendors
    await supabase.from('vendors').delete().neq('id', 0);
    
    // Process vendors
    const vendors = data.map((record, index) => {
      // Debug first record
      if (index === 0) {
        console.log('  Sample vendor fields:', Object.keys(record).slice(0, 5));
      }
      
      // Map fields - check what fields are actually available
      const vendorName = record['Supplier'] || record['Name'] || record['Organization'] || 
                         record['Party'] || record['Vendor'] || 
                         Object.values(record)[0] || `Vendor-${index}`;
      
      return {
        id: index + 1,
        name: String(vendorName).trim(),
        email: record['Email'] || record['email'] || null,
        phone: record['Phone'] || record['phone'] || null,
        address: record['Address'] || record['Street'] || null,
        city: record['City'] || null,
        state: record['State'] || null,
        zip: record['Zip'] || record['Postal Code'] || null,
        country: record['Country'] || null,
        website: record['Website'] || null,
        contact_name: record['Contact'] || record['Contact Name'] || null,
        payment_terms: record['Payment Terms'] || record['Terms'] || null,
        active: true,
        notes: record['Notes'] || null
      };
    });
    
    // Insert vendors in batches
    const batchSize = 50;
    let insertedCount = 0;
    
    for (let i = 0; i < vendors.length; i += batchSize) {
      const batch = vendors.slice(i, i + batchSize);
      const { error } = await supabase
        .from('vendors')
        .insert(batch);
      
      if (error) {
        console.log(`⚠️ Error inserting batch: ${error.message}`);
      } else {
        insertedCount += batch.length;
      }
    }
    
    console.log(`✅ Synced ${insertedCount} vendors`);
    return insertedCount;
    
  } catch (error) {
    console.error('❌ Error syncing vendors:', error.message);
    return 0;
  }
}

/**
 * Sync inventory data
 */
async function syncInventory() {
  try {
    console.log('\n📦 Syncing Inventory from Finale...');
    
    const data = await fetchFinaleJson(process.env.FINALE_INVENTORY_REPORT_URL, 'Inventory');
    
    if (!data || !Array.isArray(data)) {
      console.log('❌ No inventory data received');
      return 0;
    }
    
    // Clear existing inventory
    await supabase.from('inventory_items').delete().neq('id', '00000000-0000-0000-0000-000000000000');
    
    // Process inventory items
    const items = data.map((record, index) => {
      // Debug first record
      if (index === 0) {
        console.log('  Sample inventory fields:', Object.keys(record).slice(0, 10));
      }
      
      // Parse numeric values
      const parseNumber = (val) => {
        if (val === null || val === undefined || val === '') return 0;
        const num = parseFloat(String(val).replace(/,/g, ''));
        return isNaN(num) ? 0 : num;
      };
      
      // Map fields based on what's actually in the data
      return {
        product_id: record['Product ID'] || record['SKU'] || record['Item ID'] || 
                   record['Product'] || `ITEM-${index}`,
        product_name: record['Product'] || record['Product Name'] || record['Description'] || 
                     record['Item'] || record['Name'] || `Item ${index}`,
        sku: record['SKU'] || record['Product ID'] || record['Item ID'] || null,
        barcode: record['Barcode'] || record['UPC'] || null,
        vendor: record['Supplier'] || record['Vendor'] || record['Supplier '] || 
                record['Primary Supplier'] || null,
        category: record['Category'] || record['Product Category'] || record['Group'] || null,
        location: record['Location'] || record['Facility'] || record['Warehouse'] || 'Main',
        quantity_available: parseNumber(record['Units in Stock'] || record['In Stock'] || 
                                       record['Available'] || record['Qty Available'] || 
                                       record['Stock'] || 0),
        quantity_on_hand: parseNumber(record['Units in Stock'] || record['On Hand'] || 
                                     record['Qty on Hand'] || record['Stock'] || 0),
        quantity_on_order: parseNumber(record['Units On Order'] || record['On Order'] || 
                                      record['PO Qty'] || 0),
        reorder_point: parseNumber(record['ReOr point'] || record['Reorder Point'] || 
                                  record['Min Stock'] || 10),
        reorder_quantity: parseNumber(record['Qty to Order'] || record['Reorder Qty'] || 
                                      record['Order Qty'] || 50),
        unit_cost: parseNumber(record['Unit Cost'] || record['Cost'] || 
                              record['Average Cost'] || record['Avg Cost'] || 0),
        retail_price: parseNumber(record['Retail Price'] || record['Price'] || 
                                 record['Sell Price'] || record['MSRP'] || 0),
        sales_velocity: parseNumber(record['Sales Velocity'] || record['Velocity'] || 
                                   record['Sales Velocity Consolidated'] || 0),
        sales_last_30_days: parseNumber(record['Sales Last 30 Days'] || record['30 Day Sales'] || 
                                       record['Sales 30d'] || 0),
        sales_last_90_days: parseNumber(record['Sales Last 90 Days'] || record['90 Day Sales'] || 
                                       record['Sales 90d'] || 0),
        units_remaining: parseNumber(record['Units Remain'] || record['Units Remaining'] || 
                                    record['Remaining'] || record['Units in Stock'] || 0),
        status: 'active',
        last_updated: new Date().toISOString()
      };
    });
    
    // Insert items in batches
    const batchSize = 100;
    let insertedCount = 0;
    
    for (let i = 0; i < items.length; i += batchSize) {
      const batch = items.slice(i, i + batchSize);
      const { error } = await supabase
        .from('inventory_items')
        .insert(batch);
      
      if (error) {
        console.log(`⚠️ Error inserting batch: ${error.message}`);
      } else {
        insertedCount += batch.length;
      }
    }
    
    console.log(`✅ Synced ${insertedCount} inventory items`);
    return insertedCount;
    
  } catch (error) {
    console.error('❌ Error syncing inventory:', error.message);
    return 0;
  }
}

/**
 * Sync reorder report data
 */
async function syncReorderData() {
  try {
    console.log('\n📋 Syncing Reorder Data from Finale...');
    
    if (!process.env.FINALE_REORDER_REPORT_URL) {
      console.log('  No reorder report URL configured');
      return 0;
    }
    
    const data = await fetchFinaleJson(process.env.FINALE_REORDER_REPORT_URL, 'Reorder');
    
    if (!data || !Array.isArray(data)) {
      console.log('  No reorder data received');
      return 0;
    }
    
    console.log(`  Processing ${data.length} reorder records...`);
    
    // Update existing inventory items with reorder data
    for (const record of data.slice(0, 100)) { // Process first 100 to avoid timeouts
      const productId = record['Product ID'] || record['SKU'] || record['Item ID'];
      if (productId) {
        const updates = {
          reorder_point: parseFloat(record['ReOr point'] || record['Reorder Point'] || 0) || null,
          reorder_quantity: parseFloat(record['Qty to Order'] || record['Order Qty'] || 0) || null,
          sales_last_30_days: parseFloat(record['Sales Last 30 Days'] || 0) || null,
          sales_last_90_days: parseFloat(record['Sales Last 90 Days'] || 0) || null
        };
        
        await supabase
          .from('inventory_items')
          .update(updates)
          .eq('product_id', productId);
      }
    }
    
    console.log(`✅ Updated reorder data`);
    return data.length;
    
  } catch (error) {
    console.error('❌ Error syncing reorder data:', error.message);
    return 0;
  }
}

/**
 * Main sync function
 */
async function main() {
  console.log('🚀 Finale Live Data Sync');
  console.log('================================\n');
  
  // Check configuration
  if (!FINALE_CONFIG.apiKey || !FINALE_CONFIG.apiSecret) {
    console.error('❌ Missing Finale API credentials');
    console.log('\nPlease ensure these are set in .env.local:');
    console.log('  FINALE_API_KEY=your_key');
    console.log('  FINALE_API_SECRET=your_secret');
    process.exit(1);
  }
  
  console.log('📌 Configuration:');
  console.log(`  Account: ${FINALE_CONFIG.accountPath}`);
  console.log(`  API Key: ${FINALE_CONFIG.apiKey.substring(0, 4)}...`);
  console.log('');
  
  let vendorCount = 0;
  let inventoryCount = 0;
  
  try {
    // Sync vendors
    vendorCount = await syncVendors();
    
    // Sync inventory
    inventoryCount = await syncInventory();
    
    // Sync additional reorder data if available
    await syncReorderData();
    
  } catch (error) {
    console.error('❌ Sync error:', error.message);
  }
  
  // Summary
  console.log('\n================================');
  console.log('✅ Sync Complete!');
  console.log(`📊 Results:`);
  console.log(`  • ${vendorCount} vendors`);
  console.log(`  • ${inventoryCount} inventory items`);
  
  if (vendorCount > 0 || inventoryCount > 0) {
    console.log('\n🎉 SUCCESS! Your Finale data is now loaded');
    console.log('\n📍 Next steps:');
    console.log('1. Visit http://localhost:3000/inventory');
    console.log('2. Visit http://localhost:3000/vendors');
    console.log('3. Your real Finale data should now be visible!');
  } else {
    console.log('\n⚠️ No data was synced');
    console.log('\nTroubleshooting:');
    console.log('1. Open this URL in your browser while logged into Finale:');
    console.log(`   ${process.env.FINALE_INVENTORY_REPORT_URL}`);
    console.log('2. Verify it downloads a CSV file with data');
    console.log('3. Check that API access is enabled in Finale');
    console.log('4. Ensure your API user has report access permissions');
  }
}

// Run the sync
main().catch(console.error);
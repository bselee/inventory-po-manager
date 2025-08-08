#!/usr/bin/env node

const https = require('https');
const { createClient } = require('@supabase/supabase-js');
const { parse } = require('csv-parse/sync');
require('dotenv').config({ path: '.env.local' });

// Initialize Supabase
const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

// Finale API Configuration
const FINALE_CONFIG = {
  apiKey: process.env.FINALE_API_KEY,
  apiSecret: process.env.FINALE_API_SECRET,
  accountPath: process.env.FINALE_ACCOUNT_PATH,
  baseUrl: process.env.FINALE_BASE_URL || 'https://app.finaleinventory.com',
  vendorsReportUrl: process.env.FINALE_VENDORS_REPORT_URL,
  inventoryReportUrl: process.env.FINALE_INVENTORY_REPORT_URL,
  reorderReportUrl: process.env.FINALE_REORDER_REPORT_URL
};

// Create Basic Auth header
const auth = Buffer.from(`${FINALE_CONFIG.apiKey}:${FINALE_CONFIG.apiSecret}`).toString('base64');

/**
 * Fetch CSV data from Finale Report URL
 */
async function fetchFinaleReport(reportUrl) {
  return new Promise((resolve, reject) => {
    console.log(`📥 Fetching report from Finale...`);
    
    const url = new URL(reportUrl);
    const options = {
      hostname: url.hostname,
      port: 443,
      path: url.pathname + url.search,
      method: 'GET',
      headers: {
        'Authorization': `Basic ${auth}`,
        'Accept': 'text/csv,application/csv',
        'User-Agent': 'BuildASoil-Inventory-Manager/1.0'
      }
    };

    https.get(options, (res) => {
      let data = '';
      
      res.on('data', (chunk) => {
        data += chunk;
      });
      
      res.on('end', () => {
        if (res.statusCode === 200) {
          resolve(data);
        } else {
          console.log('Response status:', res.statusCode);
          console.log('Response headers:', res.headers);
          reject(new Error(`HTTP ${res.statusCode}: ${data.substring(0, 500)}`));
        }
      });
    }).on('error', reject);
  });
}

/**
 * Parse and sync vendor data
 */
async function syncVendors() {
  try {
    console.log('\n🏢 Syncing Vendors from Finale...');
    
    const csvData = await fetchFinaleReport(FINALE_CONFIG.vendorsReportUrl);
    const records = parse(csvData, {
      columns: true,
      skip_empty_lines: true,
      trim: true
    });
    
    console.log(`📊 Found ${records.length} vendors in Finale`);
    
    // Clear existing vendors
    await supabase.from('vendors').delete().neq('id', 0);
    
    // Process vendors
    const vendors = records.map((record, index) => {
      // Extract vendor data from CSV columns
      const vendorName = record['Supplier'] || record['Name'] || record['Organization'] || `Vendor-${index}`;
      
      return {
        id: index + 1,
        name: vendorName,
        email: record['Email'] || null,
        phone: record['Phone'] || null,
        address: record['Address'] || null,
        city: record['City'] || null,
        state: record['State'] || null,
        zip: record['Zip'] || null,
        country: record['Country'] || null,
        website: record['Website'] || null,
        contact_name: record['Contact'] || null,
        payment_terms: record['Payment Terms'] || null,
        lead_time_days: parseInt(record['Lead Time']) || null,
        minimum_order: parseFloat(record['Min Order']) || null,
        active: true,
        notes: record['Notes'] || null,
        finale_vendor_id: record['ID'] || record['Supplier ID'] || null
      };
    });
    
    // Insert vendors in batches
    const batchSize = 50;
    for (let i = 0; i < vendors.length; i += batchSize) {
      const batch = vendors.slice(i, i + batchSize);
      const { error } = await supabase
        .from('vendors')
        .insert(batch);
      
      if (error) {
        console.log(`⚠️ Error inserting vendors batch ${i/batchSize + 1}:`, error.message);
      } else {
        console.log(`✅ Inserted batch ${i/batchSize + 1} (${batch.length} vendors)`);
      }
    }
    
    console.log(`✅ Successfully synced ${vendors.length} vendors`);
    return vendors.length;
    
  } catch (error) {
    console.error('❌ Error syncing vendors:', error.message);
    return 0;
  }
}

/**
 * Parse and sync inventory data
 */
async function syncInventory() {
  try {
    console.log('\n📦 Syncing Inventory from Finale...');
    
    const csvData = await fetchFinaleReport(FINALE_CONFIG.inventoryReportUrl);
    const records = parse(csvData, {
      columns: true,
      skip_empty_lines: true,
      trim: true
    });
    
    console.log(`📊 Found ${records.length} inventory items in Finale`);
    
    // Clear existing inventory_items table
    await supabase.from('inventory_items').delete().neq('id', '00000000-0000-0000-0000-000000000000');
    
    // Process inventory items
    const items = records.map((record, index) => {
      // Parse numeric values
      const parseNumber = (val) => {
        if (!val) return 0;
        const num = parseFloat(val.toString().replace(/,/g, ''));
        return isNaN(num) ? 0 : num;
      };
      
      return {
        product_id: record['Product ID'] || record['SKU'] || `ITEM-${index}`,
        product_name: record['Product'] || record['Description'] || record['Item'] || `Item ${index}`,
        sku: record['SKU'] || record['Product ID'] || null,
        barcode: record['Barcode'] || null,
        vendor: record['Supplier'] || record['Vendor'] || null,
        category: record['Category'] || null,
        location: record['Location'] || 'Main',
        quantity_available: parseNumber(record['Units in Stock'] || record['Available'] || record['Qty Available'] || 0),
        quantity_on_hand: parseNumber(record['Units in Stock'] || record['On Hand'] || record['Qty on Hand'] || 0),
        quantity_on_order: parseNumber(record['Units On Order'] || record['On Order'] || 0),
        reorder_point: parseNumber(record['ReOr point'] || record['Reorder Point'] || 10),
        reorder_quantity: parseNumber(record['Qty to Order'] || record['Reorder Qty'] || 50),
        unit_cost: parseNumber(record['Unit Cost'] || record['Cost'] || 0),
        retail_price: parseNumber(record['Retail Price'] || record['Price'] || 0),
        last_sale_date: record['Last Sale'] || null,
        last_purchase_date: record['Last Purchase Date'] || null,
        sales_velocity: parseNumber(record['Sales Velocity'] || 0),
        sales_last_30_days: parseNumber(record['Sales Last 30 Days'] || 0),
        sales_last_90_days: parseNumber(record['Sales Last 90 Days'] || 0),
        units_remaining: parseNumber(record['Units Remain'] || record['Units in Stock'] || 0),
        status: record['Status'] || 'active',
        finale_product_id: record['Product ID'] || null,
        notes: record['Notes'] || null,
        last_updated: new Date().toISOString()
      };
    });
    
    // Insert items in batches
    const batchSize = 100;
    for (let i = 0; i < items.length; i += batchSize) {
      const batch = items.slice(i, i + batchSize);
      const { error } = await supabase
        .from('inventory_items')
        .insert(batch);
      
      if (error) {
        console.log(`⚠️ Error inserting inventory batch ${i/batchSize + 1}:`, error.message);
      } else {
        console.log(`✅ Inserted batch ${i/batchSize + 1} (${batch.length} items)`);
      }
    }
    
    console.log(`✅ Successfully synced ${items.length} inventory items`);
    return items.length;
    
  } catch (error) {
    console.error('❌ Error syncing inventory:', error.message);
    return 0;
  }
}

/**
 * Fetch additional data using Finale REST API
 */
async function fetchFinaleRestData(endpoint) {
  return new Promise((resolve, reject) => {
    const url = `${FINALE_CONFIG.baseUrl}/${FINALE_CONFIG.accountPath}/api/${endpoint}`;
    console.log(`🔍 Fetching ${endpoint} from Finale API...`);
    
    const urlObj = new URL(url);
    const options = {
      hostname: urlObj.hostname,
      port: 443,
      path: urlObj.pathname,
      method: 'GET',
      headers: {
        'Authorization': `Basic ${auth}`,
        'Accept': 'application/json',
        'Content-Type': 'application/json'
      }
    };

    https.get(options, (res) => {
      let data = '';
      
      res.on('data', (chunk) => {
        data += chunk;
      });
      
      res.on('end', () => {
        if (res.statusCode === 200) {
          try {
            resolve(JSON.parse(data));
          } catch (e) {
            resolve([]);
          }
        } else {
          console.log(`API returned status ${res.statusCode}`);
          resolve([]);
        }
      });
    }).on('error', (err) => {
      console.log(`API error: ${err.message}`);
      resolve([]);
    });
  });
}

/**
 * Main sync function
 */
async function main() {
  console.log('🚀 Starting Finale Data Sync');
  console.log('================================\n');
  
  // Check configuration
  if (!FINALE_CONFIG.apiKey || !FINALE_CONFIG.apiSecret) {
    console.error('❌ Missing Finale API credentials in .env.local');
    console.log('\nPlease add:');
    console.log('FINALE_API_KEY=your_api_key');
    console.log('FINALE_API_SECRET=your_api_secret');
    process.exit(1);
  }
  
  let vendorCount = 0;
  let inventoryCount = 0;
  
  try {
    // Sync vendors
    vendorCount = await syncVendors();
    
    // Sync inventory
    inventoryCount = await syncInventory();
    
    // Try to fetch purchase orders via REST API
    console.log('\n📋 Attempting to fetch Purchase Orders...');
    const purchaseOrders = await fetchFinaleRestData('order');
    if (Array.isArray(purchaseOrders) && purchaseOrders.length > 0) {
      console.log(`Found ${purchaseOrders.length} purchase orders`);
      // Process purchase orders if available
    } else {
      console.log('No purchase orders found or API not accessible');
    }
    
  } catch (error) {
    console.error('❌ Sync error:', error.message);
  }
  
  // Summary
  console.log('\n================================');
  console.log('✅ Sync Complete!');
  console.log(`📊 Synced ${vendorCount} vendors`);
  console.log(`📦 Synced ${inventoryCount} inventory items`);
  console.log('\n🎯 Next steps:');
  console.log('1. Run: npm run dev');
  console.log('2. Visit: http://localhost:3000');
  console.log('3. Your inventory and vendor data should now be available!');
}

// Run the sync
main().catch(console.error);
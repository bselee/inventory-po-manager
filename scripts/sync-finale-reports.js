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
  apiKey: process.env.FINALE_API_KEY || 'I9TVdRvblFod',
  apiSecret: process.env.FINALE_API_SECRET || '63h4TCI62vlQUYM3btEA7bycoIflGQUz',
  accountPath: process.env.FINALE_ACCOUNT_PATH || 'buildasoilorganics',
  baseUrl: 'https://app.finaleinventory.com'
};

// Create Basic Auth header
const auth = Buffer.from(`${FINALE_CONFIG.apiKey}:${FINALE_CONFIG.apiSecret}`).toString('base64');

/**
 * Extract report ID from Finale report URL
 */
function extractReportId(url) {
  const match = url.match(/pivotTableStream\/(\d+)\//);
  return match ? match[1] : null;
}

/**
 * Fetch CSV report from Finale using the Reporting API
 */
async function fetchFinaleReport(reportUrl, reportName) {
  return new Promise((resolve, reject) => {
    console.log(`📥 Fetching ${reportName} report...`);
    
    // Extract report ID from the URL
    const reportId = extractReportId(reportUrl);
    if (!reportId) {
      console.log('❌ Could not extract report ID from URL');
      resolve(null);
      return;
    }
    
    // Build the proper API endpoint
    const apiPath = `/${FINALE_CONFIG.accountPath}/api/report/${reportId}`;
    console.log(`  Report ID: ${reportId}`);
    console.log(`  API Path: ${apiPath}`);
    
    const options = {
      hostname: 'app.finaleinventory.com',
      port: 443,
      path: apiPath,
      method: 'GET',
      headers: {
        'Authorization': `Basic ${auth}`,
        'Accept': 'text/csv,application/csv,*/*',
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
          // Check if we got CSV data
          if (data.startsWith('<')) {
            console.log('❌ Received HTML instead of CSV. Trying alternative method...');
            // Try fetching with cookie authentication
            fetchWithCookieAuth(reportUrl, reportName).then(resolve).catch(reject);
          } else {
            console.log(`✅ Received CSV data (${data.length} bytes)`);
            resolve(data);
          }
        } else if (res.statusCode === 401) {
          console.log('❌ Authentication failed - check API credentials');
          resolve(null);
        } else {
          console.log(`❌ Failed with status ${res.statusCode}`);
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
 * Alternative: Use the direct report URL with authentication
 */
async function fetchWithCookieAuth(reportUrl, reportName) {
  return new Promise((resolve) => {
    console.log(`🔄 Trying direct URL fetch for ${reportName}...`);
    
    const url = new URL(reportUrl);
    
    // Add authentication to the URL
    url.username = FINALE_CONFIG.apiKey;
    url.password = FINALE_CONFIG.apiSecret;
    
    const options = {
      hostname: url.hostname,
      port: 443,
      path: url.pathname + url.search,
      method: 'GET',
      auth: `${FINALE_CONFIG.apiKey}:${FINALE_CONFIG.apiSecret}`,
      headers: {
        'Accept': 'text/csv,application/csv,*/*',
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
        if (res.statusCode === 200 && !data.startsWith('<')) {
          console.log(`✅ Received CSV data (${data.length} bytes)`);
          resolve(data);
        } else {
          console.log('❌ Could not fetch CSV data');
          resolve(null);
        }
      });
    }).on('error', () => {
      resolve(null);
    });
  });
}

/**
 * Parse and sync vendor data
 */
async function syncVendors() {
  try {
    console.log('\n🏢 Syncing Vendors from Finale...');
    
    const csvData = await fetchFinaleReport(process.env.FINALE_VENDORS_REPORT_URL, 'Vendors');
    
    if (!csvData) {
      console.log('❌ Could not fetch vendor data');
      return 0;
    }
    
    const records = parse(csvData, {
      columns: true,
      skip_empty_lines: true,
      trim: true,
      relax_quotes: true,
      relax_column_count: true
    });
    
    console.log(`📊 Parsed ${records.length} vendor records`);
    
    if (records.length === 0) {
      console.log('⚠️ No vendor records found in CSV');
      return 0;
    }
    
    // Clear existing vendors
    await supabase.from('vendors').delete().neq('id', 0);
    
    // Process vendors - map column names from the CSV
    const vendors = records.map((record, index) => {
      // Debug first record to see column names
      if (index === 0) {
        console.log('  Sample record columns:', Object.keys(record));
      }
      
      // Try different possible column names
      const vendorName = record['Supplier'] || record['Name'] || record['Organization'] || 
                         record['Party'] || record['Vendor'] || `Vendor-${index}`;
      
      return {
        id: index + 1,
        name: vendorName,
        email: record['Email'] || record['email'] || null,
        phone: record['Phone'] || record['phone'] || null,
        address: record['Address'] || record['address'] || null,
        city: record['City'] || record['city'] || null,
        state: record['State'] || record['state'] || null,
        zip: record['Zip'] || record['Postal Code'] || null,
        country: record['Country'] || record['country'] || null,
        website: record['Website'] || record['website'] || null,
        contact_name: record['Contact'] || record['Contact Name'] || null,
        payment_terms: record['Payment Terms'] || record['Terms'] || null,
        lead_time_days: parseInt(record['Lead Time'] || record['Lead Days'] || 0) || null,
        active: true,
        notes: record['Notes'] || record['Comments'] || null
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
        console.log(`  Inserted batch ${Math.floor(i/batchSize) + 1} (${batch.length} vendors)`);
      }
    }
    
    console.log(`✅ Successfully synced ${insertedCount} vendors`);
    return insertedCount;
    
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
    
    const csvData = await fetchFinaleReport(process.env.FINALE_INVENTORY_REPORT_URL, 'Inventory');
    
    if (!csvData) {
      console.log('❌ Could not fetch inventory data');
      return 0;
    }
    
    const records = parse(csvData, {
      columns: true,
      skip_empty_lines: true,
      trim: true,
      relax_quotes: true,
      relax_column_count: true
    });
    
    console.log(`📊 Parsed ${records.length} inventory records`);
    
    if (records.length === 0) {
      console.log('⚠️ No inventory records found in CSV');
      return 0;
    }
    
    // Clear existing inventory
    await supabase.from('inventory_items').delete().neq('id', '00000000-0000-0000-0000-000000000000');
    
    // Process inventory items
    const items = records.map((record, index) => {
      // Debug first record
      if (index === 0) {
        console.log('  Sample record columns:', Object.keys(record).slice(0, 10));
      }
      
      // Parse numeric values safely
      const parseNumber = (val) => {
        if (!val) return 0;
        const num = parseFloat(String(val).replace(/,/g, ''));
        return isNaN(num) ? 0 : num;
      };
      
      return {
        product_id: record['Product ID'] || record['SKU'] || record['Item ID'] || `ITEM-${index}`,
        product_name: record['Product'] || record['Description'] || record['Item'] || 
                     record['Product Name'] || `Item ${index}`,
        sku: record['SKU'] || record['Product ID'] || null,
        barcode: record['Barcode'] || record['UPC'] || null,
        vendor: record['Supplier'] || record['Vendor'] || record['Supplier '] || null,
        category: record['Category'] || record['Product Category'] || null,
        location: record['Location'] || record['Facility'] || 'Main',
        quantity_available: parseNumber(record['Units in Stock'] || record['Available'] || 
                                       record['In Stock'] || record['Qty Available'] || 0),
        quantity_on_hand: parseNumber(record['Units in Stock'] || record['On Hand'] || 
                                     record['Qty on Hand'] || 0),
        quantity_on_order: parseNumber(record['Units On Order'] || record['On Order'] || 0),
        reorder_point: parseNumber(record['ReOr point'] || record['Reorder Point'] || 
                                  record['ReOrder Point'] || 10),
        reorder_quantity: parseNumber(record['Qty to Order'] || record['Reorder Qty'] || 
                                      record['Order Qty'] || 50),
        unit_cost: parseNumber(record['Unit Cost'] || record['Cost'] || record['Average Cost'] || 0),
        retail_price: parseNumber(record['Retail Price'] || record['Price'] || record['Sell Price'] || 0),
        sales_velocity: parseNumber(record['Sales Velocity'] || record['Velocity'] || 0),
        sales_last_30_days: parseNumber(record['Sales Last 30 Days'] || record['30 Day Sales'] || 0),
        sales_last_90_days: parseNumber(record['Sales Last 90 Days'] || record['90 Day Sales'] || 0),
        units_remaining: parseNumber(record['Units Remain'] || record['Units Remaining'] || 
                                    record['Remaining'] || 0),
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
        console.log(`  Inserted batch ${Math.floor(i/batchSize) + 1} (${batch.length} items)`);
      }
    }
    
    console.log(`✅ Successfully synced ${insertedCount} inventory items`);
    return insertedCount;
    
  } catch (error) {
    console.error('❌ Error syncing inventory:', error.message);
    return 0;
  }
}

/**
 * Main sync function
 */
async function main() {
  console.log('🚀 Finale Reports Sync');
  console.log('================================\n');
  
  // Check configuration
  if (!FINALE_CONFIG.apiKey || !FINALE_CONFIG.apiSecret) {
    console.error('❌ Missing Finale API credentials in .env.local');
    process.exit(1);
  }
  
  if (!process.env.FINALE_VENDORS_REPORT_URL || !process.env.FINALE_INVENTORY_REPORT_URL) {
    console.error('❌ Missing Finale report URLs in .env.local');
    process.exit(1);
  }
  
  let vendorCount = 0;
  let inventoryCount = 0;
  
  try {
    // Sync vendors first
    vendorCount = await syncVendors();
    
    // Then sync inventory
    inventoryCount = await syncInventory();
    
  } catch (error) {
    console.error('❌ Sync error:', error.message);
  }
  
  // Summary
  console.log('\n================================');
  console.log('✅ Sync Complete!');
  console.log(`📊 Results:`);
  console.log(`  • ${vendorCount} vendors synced`);
  console.log(`  • ${inventoryCount} inventory items synced`);
  
  if (vendorCount > 0 || inventoryCount > 0) {
    console.log('\n🎯 Success! Your Finale data is now in the database');
    console.log('Next steps:');
    console.log('1. The dev server should be running at http://localhost:3000');
    console.log('2. Check the Inventory page to see your products');
    console.log('3. Check the Vendors page to see your suppliers');
  } else {
    console.log('\n⚠️ No data was synced. This could mean:');
    console.log('1. The report URLs require browser authentication');
    console.log('2. The reports are empty in Finale');
    console.log('3. API access needs to be enabled in Finale');
    console.log('\nTry opening one of the report URLs in your browser while logged into Finale');
    console.log('to verify they return CSV data.');
  }
}

// Run the sync
main().catch(console.error);
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
  accountPath: process.env.FINALE_ACCOUNT_PATH || 'buildasoilorganics',
  baseUrl: process.env.FINALE_BASE_URL || 'https://app.finaleinventory.com'
};

// Create Basic Auth header
const auth = Buffer.from(`${FINALE_CONFIG.apiKey}:${FINALE_CONFIG.apiSecret}`).toString('base64');

/**
 * Fetch data from Finale REST API
 */
async function fetchFinaleAPI(endpoint, params = '') {
  return new Promise((resolve, reject) => {
    const url = `${FINALE_CONFIG.baseUrl}/${FINALE_CONFIG.accountPath}/api/${endpoint}${params}`;
    console.log(`🔍 Fetching: ${endpoint}`);
    
    const urlObj = new URL(url);
    const options = {
      hostname: urlObj.hostname,
      port: 443,
      path: urlObj.pathname + urlObj.search,
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
      
      res.on('data', (chunk) => {
        data += chunk;
      });
      
      res.on('end', () => {
        console.log(`  Response status: ${res.statusCode}`);
        
        if (res.statusCode === 200) {
          try {
            const jsonData = JSON.parse(data);
            resolve(jsonData);
          } catch (e) {
            console.log('  Failed to parse JSON:', e.message);
            console.log('  Response preview:', data.substring(0, 200));
            resolve(null);
          }
        } else if (res.statusCode === 401) {
          console.log('  ❌ Authentication failed - check API credentials');
          resolve(null);
        } else if (res.statusCode === 403) {
          console.log('  ❌ Access forbidden - API access may not be enabled');
          resolve(null);
        } else {
          console.log(`  Unexpected status: ${res.statusCode}`);
          console.log('  Response:', data.substring(0, 200));
          resolve(null);
        }
      });
    }).on('error', (err) => {
      console.log(`  Network error: ${err.message}`);
      resolve(null);
    });
  });
}

/**
 * Sync products (inventory)
 */
async function syncProducts() {
  console.log('\n📦 Syncing Products/Inventory...');
  
  // Try different endpoints
  const endpoints = [
    'product',
    'products',
    'inventory',
    'stock'
  ];
  
  let products = null;
  for (const endpoint of endpoints) {
    products = await fetchFinaleAPI(endpoint);
    if (products && Array.isArray(products)) {
      console.log(`✅ Found ${products.length} products using /${endpoint}`);
      break;
    } else if (products && products.data) {
      products = products.data;
      console.log(`✅ Found ${products.length} products using /${endpoint}`);
      break;
    }
  }
  
  if (!products || !Array.isArray(products)) {
    console.log('❌ Could not fetch products from API');
    return 0;
  }
  
  // Clear existing inventory
  await supabase.from('inventory_items').delete().neq('id', '00000000-0000-0000-0000-000000000000');
  
  // Process products
  const items = products.map((product, index) => ({
    product_id: product.productId || product.id || `PROD-${index}`,
    product_name: product.productName || product.name || product.description || `Product ${index}`,
    sku: product.sku || product.productId || null,
    barcode: product.barcode || product.upc || null,
    vendor: product.primarySupplierName || product.supplier || null,
    category: product.productGroupName || product.category || null,
    location: product.primaryLocationName || 'Main',
    quantity_available: product.quantityAvailable || product.available || 0,
    quantity_on_hand: product.quantityOnHand || product.onHand || 0,
    quantity_on_order: product.quantityOnOrder || product.onOrder || 0,
    reorder_point: product.reorderPoint || 10,
    reorder_quantity: product.reorderQuantity || 50,
    unit_cost: product.averageCost || product.unitCost || 0,
    retail_price: product.retailPrice || product.price || 0,
    status: product.statusId === 'PRODUCT_ACTIVE' ? 'active' : 'inactive',
    finale_product_id: product.productId || product.id || null,
    last_updated: new Date().toISOString()
  }));
  
  // Insert items in batches
  const batchSize = 100;
  for (let i = 0; i < items.length; i += batchSize) {
    const batch = items.slice(i, i + batchSize);
    const { error } = await supabase
      .from('inventory_items')
      .insert(batch);
    
    if (error) {
      console.log(`⚠️ Error inserting batch: ${error.message}`);
    }
  }
  
  console.log(`✅ Synced ${items.length} products`);
  return items.length;
}

/**
 * Sync suppliers/vendors
 */
async function syncSuppliers() {
  console.log('\n🏢 Syncing Suppliers/Vendors...');
  
  // Try different endpoints
  const endpoints = [
    'supplier',
    'suppliers',
    'vendor',
    'vendors',
    'party'
  ];
  
  let suppliers = null;
  for (const endpoint of endpoints) {
    suppliers = await fetchFinaleAPI(endpoint);
    if (suppliers && Array.isArray(suppliers)) {
      console.log(`✅ Found ${suppliers.length} suppliers using /${endpoint}`);
      break;
    } else if (suppliers && suppliers.data) {
      suppliers = suppliers.data;
      console.log(`✅ Found ${suppliers.length} suppliers using /${endpoint}`);
      break;
    }
  }
  
  if (!suppliers || !Array.isArray(suppliers)) {
    console.log('❌ Could not fetch suppliers from API');
    return 0;
  }
  
  // Clear existing vendors
  await supabase.from('vendors').delete().neq('id', 0);
  
  // Process suppliers
  const vendors = suppliers.map((supplier, index) => ({
    id: index + 1,
    name: supplier.partyName || supplier.name || supplier.companyName || `Supplier ${index}`,
    email: supplier.email || supplier.primaryEmail || null,
    phone: supplier.phone || supplier.primaryPhone || null,
    address: supplier.address || supplier.street || null,
    city: supplier.city || null,
    state: supplier.state || supplier.stateProvince || null,
    zip: supplier.postalCode || supplier.zip || null,
    country: supplier.country || null,
    website: supplier.website || null,
    contact_name: supplier.contactName || supplier.primaryContact || null,
    payment_terms: supplier.paymentTerms || null,
    lead_time_days: supplier.leadTimeDays || null,
    active: supplier.statusId === 'PARTY_ACTIVE' || true,
    finale_vendor_id: supplier.partyId || supplier.id || null
  }));
  
  // Insert vendors in batches
  const batchSize = 50;
  for (let i = 0; i < vendors.length; i += batchSize) {
    const batch = vendors.slice(i, i + batchSize);
    const { error } = await supabase
      .from('vendors')
      .insert(batch);
    
    if (error) {
      console.log(`⚠️ Error inserting batch: ${error.message}`);
    }
  }
  
  console.log(`✅ Synced ${vendors.length} vendors`);
  return vendors.length;
}

/**
 * Sync purchase orders
 */
async function syncPurchaseOrders() {
  console.log('\n📋 Syncing Purchase Orders...');
  
  const orders = await fetchFinaleAPI('order');
  
  if (!orders || !Array.isArray(orders)) {
    console.log('❌ Could not fetch purchase orders from API');
    return 0;
  }
  
  console.log(`✅ Found ${orders.length} purchase orders`);
  
  // Clear existing orders
  await supabase.from('purchase_orders').delete().neq('id', '00000000-0000-0000-0000-000000000000');
  
  // Process orders (filter for purchase orders)
  const purchaseOrders = orders
    .filter(order => order.orderTypeId === 'PURCHASE_ORDER' || order.type === 'purchase')
    .map(order => ({
      vendor: order.supplierName || order.partyName || 'Unknown',
      vendor_email: order.supplierEmail || null,
      status: order.statusId === 'ORDER_COMPLETED' ? 'received' : 
              order.statusId === 'ORDER_SENT' ? 'sent' : 'draft',
      total_amount: order.grandTotal || order.total || 0,
      notes: order.internalNotes || order.notes || null,
      finale_order_id: order.orderId || order.id || null,
      created_at: order.orderDate || new Date().toISOString()
    }));
  
  if (purchaseOrders.length > 0) {
    const { error } = await supabase
      .from('purchase_orders')
      .insert(purchaseOrders);
    
    if (error) {
      console.log(`⚠️ Error inserting purchase orders: ${error.message}`);
    } else {
      console.log(`✅ Synced ${purchaseOrders.length} purchase orders`);
    }
  }
  
  return purchaseOrders.length;
}

/**
 * Test API connection
 */
async function testConnection() {
  console.log('\n🔌 Testing Finale API Connection...');
  console.log(`  URL: ${FINALE_CONFIG.baseUrl}/${FINALE_CONFIG.accountPath}/api`);
  console.log(`  API Key: ${FINALE_CONFIG.apiKey.substring(0, 4)}...`);
  
  // Try to fetch account info
  const account = await fetchFinaleAPI('account');
  if (account) {
    console.log('✅ API connection successful!');
    console.log(`  Account: ${account.accountName || account.name || 'Unknown'}`);
    return true;
  }
  
  console.log('❌ Could not connect to Finale API');
  console.log('\n📝 Please check:');
  console.log('1. API credentials are correct in .env.local');
  console.log('2. API access is enabled in Finale (Settings → Integrations → API Access)');
  console.log('3. Your user has API permissions');
  
  return false;
}

/**
 * Main sync function
 */
async function main() {
  console.log('🚀 Finale Direct API Sync');
  console.log('================================');
  
  // Test connection first
  const connected = await testConnection();
  if (!connected) {
    console.log('\n⚠️ Sync aborted due to connection issues');
    process.exit(1);
  }
  
  let productCount = 0;
  let vendorCount = 0;
  let orderCount = 0;
  
  try {
    // Sync data
    productCount = await syncProducts();
    vendorCount = await syncSuppliers();
    orderCount = await syncPurchaseOrders();
    
  } catch (error) {
    console.error('❌ Sync error:', error.message);
  }
  
  // Summary
  console.log('\n================================');
  console.log('✅ Sync Complete!');
  console.log(`📦 ${productCount} products synced`);
  console.log(`🏢 ${vendorCount} vendors synced`);
  console.log(`📋 ${orderCount} purchase orders synced`);
  
  if (productCount > 0 || vendorCount > 0) {
    console.log('\n🎯 Success! Your data is ready');
    console.log('1. The development server should already be running');
    console.log('2. Visit: http://localhost:3000');
    console.log('3. Check the Inventory, Vendors, and Purchase Orders pages');
  } else {
    console.log('\n⚠️ No data was synced. Please check:');
    console.log('1. Finale API access is enabled');
    console.log('2. Your account has data to sync');
    console.log('3. API credentials are correct');
  }
}

// Run the sync
main().catch(console.error);
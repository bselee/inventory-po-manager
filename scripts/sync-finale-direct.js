// Direct Finale Sync Script - Uses Supabase directly
require('dotenv').config({ path: '.env.local' });
const { createClient } = require('@supabase/supabase-js');

// Initialize Supabase
const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
);
async function getFinaleConfig() {
  // First try to get from database
  const { data: settings, error } = await supabase
    .from('settings')
    .select('*')
    .single();

  if (error || !settings) {
    return {
      apiKey: process.env.FINALE_API_KEY,
      apiSecret: process.env.FINALE_API_SECRET,
      accountPath: process.env.FINALE_ACCOUNT_PATH || 'buildasoilorganics'
    };
  }

  return {
    apiKey: settings.finale_api_key || process.env.FINALE_API_KEY,
    apiSecret: settings.finale_api_secret || process.env.FINALE_API_SECRET,
    accountPath: settings.finale_account_path || process.env.FINALE_ACCOUNT_PATH || 'buildasoilorganics'
  };
}

async function syncInventory() {
  try {
    const config = await getFinaleConfig();
    
    if (!config.apiKey || !config.apiSecret) {
      console.error('❌ Missing Finale API credentials!');
      console.error('Please set FINALE_API_KEY and FINALE_API_SECRET in .env.local');
      return;
    }
    const authHeader = `Basic ${Buffer.from(`${config.apiKey}:${config.apiSecret}`).toString('base64')}`;
    const baseUrl = `https://app.finaleinventory.com/${config.accountPath}/api`;
    
    // Fetch products with filter for last 2 years
    const filterYear = new Date().getFullYear() - 1;
    const url = `${baseUrl}/product?limit=100&filter=lastUpdatedDate%20%3E%3D%20'${filterYear}-01-01'`;
    
    console.log('Fetching from:', url.replace(authHeader, '[HIDDEN]'));

    const response = await fetch(url, {
      headers: { 'Authorization': authHeader }
    });

    if (!response.ok) {
      console.error(`❌ Finale API error: ${response.status} ${response.statusText}`);
      const text = await response.text();
      console.error('Response:', text.substring(0, 200));
      return;
    }

    const data = await response.json();
    
    if (!data.productList) {
      console.error('❌ No productList in response');
      console.error('Response structure:', Object.keys(data));
      return;
    }

    const products = data.productList;
    if (products.length === 0) {
      return;
    }

    // Clear existing inventory
    const { error: deleteError } = await supabase
      .from('inventory_items')
      .delete()
      .neq('id', '00000000-0000-0000-0000-000000000000');

    if (deleteError) {
      console.error('Error clearing inventory:', deleteError);
    }

    // Transform and insert products
    const inventoryItems = products.map(product => ({
      sku: product.productId || product.sku,
      product_name: product.productName || product.name || product.productId,
      current_stock: parseInt(product.quantityAvailable || product.quantity || 0),
      reorder_point: parseInt(product.reorderPoint || 0),
      reorder_quantity: parseInt(product.reorderQuantity || 0),
      unit_cost: parseFloat(product.unitCost || product.cost || 0),
      location: product.location || product.facilityName || 'Main',
      vendor: product.vendor || product.supplierName || '',
      category: product.category || '',
      last_updated: new Date().toISOString()
    }));

    // Insert in batches
    const batchSize = 50;
    let inserted = 0;

    for (let i = 0; i < inventoryItems.length; i += batchSize) {
      const batch = inventoryItems.slice(i, i + batchSize);
      const { error: insertError } = await supabase
        .from('inventory_items')
        .insert(batch);

      if (insertError) {
        console.error('Error inserting batch:', insertError);
      } else {
        inserted += batch.length;
        process.stdout.write(`\rInserted ${inserted}/${inventoryItems.length} items...`);
      }
    }
    // Show sample of imported data
    inventoryItems.slice(0, 5).forEach(item => {
    });

  } catch (error) {
    console.error('❌ Sync failed:', error.message);
    if (error.message.includes('fetch')) {
      console.error('\n💡 Network error. Check your internet connection.');
    }
  }
}

// Run the sync
syncInventory();
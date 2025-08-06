require('dotenv').config({ path: '.env.local' });
const { createClient } = require('@supabase/supabase-js');

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
);

async function runSync() {
  // Get credentials from database
  const { data: settings, error } = await supabase
    .from('settings')
    .select('finale_api_key, finale_api_secret, finale_account_path')
    .single();

  if (error || !settings) {
    console.error('❌ Could not fetch settings:', error?.message);
    return;
  }
  console.log('  API Key:', settings.finale_api_key ? '***' + settings.finale_api_key.slice(-4) : 'Missing');
  console.log('  API Secret:', settings.finale_api_secret ? '***' + settings.finale_api_secret.slice(-4) : 'Missing');
  if (!settings.finale_api_key || !settings.finale_api_secret) {
    console.error('\n❌ API credentials are missing!');
    return;
  }

  // Create sync log entry
  const { data: syncLog, error: logError } = await supabase
    .from('sync_logs')
    .insert({
      sync_type: 'full_sync',
      status: 'running',
      started_at: new Date().toISOString()
    })
    .select()
    .single();

  const syncId = syncLog?.id;
  try {
    // Call the Finale API
    const authHeader = `Basic ${Buffer.from(`${settings.finale_api_key}:${settings.finale_api_secret}`).toString('base64')}`;
    const baseUrl = `https://app.finaleinventory.com/${settings.finale_account_path}/api`;
    const filterYear = new Date().getFullYear() - 1;
    const url = `${baseUrl}/product?limit=500`;
    
    const response = await fetch(url, {
      headers: { 'Authorization': authHeader }
    });

    if (!response.ok) {
      throw new Error(`Finale API error: ${response.status} ${response.statusText}`);
    }

    const data = await response.json();
    
    // Handle Finale's response format
    let products = [];
    if (data.productList) {
      products = data.productList;
    } else if (data.products) {
      products = data.products;
    } else if (Array.isArray(data)) {
      products = data;
    }
    if (products.length === 0) {
      return;
    }

    // Clear existing inventory
    await supabase.from('inventory_items').delete().neq('id', '00000000-0000-0000-0000-000000000000');

    // Transform and insert products
    const inventoryItems = products.map(product => ({
      sku: product.productId || product.sku || product.id,
      product_name: product.productName || product.name || product.description || 'Unknown',
      current_stock: parseInt(product.quantityAvailable || product.quantity || product.qtyAvailable || 0),
      reorder_point: parseInt(product.reorderPoint || product.minQuantity || 0),
      reorder_quantity: parseInt(product.reorderQuantity || product.orderQuantity || 0),
      unit_cost: parseFloat(product.unitCost || product.cost || product.averageCost || 0),
      location: product.location || product.warehouseName || product.facility || 'Main',
      vendor: product.primaryVendor || product.vendor || product.supplier || '',
      category: product.category || product.productType || '',
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

    // Update sync log
    if (syncId) {
      await supabase
        .from('sync_logs')
        .update({
          status: 'success',
          completed_at: new Date().toISOString(),
          items_processed: products.length,
          items_updated: inserted
        })
        .eq('id', syncId);
    }
  } catch (error) {
    console.error('\n❌ Sync failed:', error.message);
    
    // Update sync log with error
    if (syncId) {
      await supabase
        .from('sync_logs')
        .update({
          status: 'error',
          completed_at: new Date().toISOString(),
          errors: [error.message]
        })
        .eq('id', syncId);
    }
  }
}

runSync();
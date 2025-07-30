require('dotenv').config({ path: '.env.local' });
const { createClient } = require('@supabase/supabase-js');

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
);

async function syncWithEnvCredentials() {
  console.log('🚀 Starting Finale Sync with .env credentials...\n');

  // Use credentials from environment
  const apiKey = process.env.FINALE_API_KEY;
  const apiSecret = process.env.FINALE_API_SECRET;
  let accountPath = process.env.FINALE_ACCOUNT_PATH;

  // Fix account path - extract just the account name
  if (accountPath && accountPath.includes('finaleinventory.com/')) {
    const match = accountPath.match(/finaleinventory\.com\/([^\/]+)/);
    if (match) {
      accountPath = match[1];
      console.log(`📋 Fixed account path: ${accountPath}`);
    }
  }

  console.log('✅ Using credentials from .env.local:');
  console.log('  API Key:', apiKey ? '***' + apiKey.slice(-4) : 'Missing');
  console.log('  API Secret:', apiSecret ? '***' + apiSecret.slice(-4) : 'Missing');
  console.log('  Account Path:', accountPath);

  if (!apiKey || !apiSecret) {
    console.error('\n❌ API credentials are missing in .env.local!');
    return;
  }

  // Create sync log entry
  const { data: syncLog } = await supabase
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
    const authHeader = `Basic ${Buffer.from(`${apiKey}:${apiSecret}`).toString('base64')}`;
    const baseUrl = `https://app.finaleinventory.com/${accountPath}/api`;
    
    console.log('\n🔄 Fetching products from Finale...');
    const url = `${baseUrl}/product?limit=500`;
    
    console.log('URL:', url);
    
    const response = await fetch(url, {
      headers: { 
        'Authorization': authHeader,
        'Accept': 'application/json'
      }
    });

    console.log('Response status:', response.status);

    if (!response.ok) {
      const text = await response.text();
      console.error('Response body:', text.substring(0, 500));
      throw new Error(`Finale API error: ${response.status} ${response.statusText}`);
    }

    const data = await response.json();
    console.log('Response type:', typeof data);
    console.log('Response keys:', Object.keys(data).slice(0, 10));
    
    // Handle various Finale response formats
    let products = [];
    if (data.productList) {
      products = data.productList;
    } else if (data.products) {
      products = data.products;
    } else if (Array.isArray(data)) {
      products = data;
    } else if (data.data && Array.isArray(data.data)) {
      products = data.data;
    }

    console.log(`\n✅ Fetched ${products.length} products from Finale`);

    if (products.length === 0) {
      console.log('⚠️  No products found.');
      console.log('Response structure:', JSON.stringify(data, null, 2).substring(0, 500));
      
      // Also save credentials to Supabase for future use
      console.log('\n💾 Saving credentials to Supabase for app use...');
      await supabase
        .from('settings')
        .upsert({
          id: 1,
          finale_api_key: apiKey,
          finale_api_secret: apiSecret,
          finale_account_path: accountPath,
          low_stock_threshold: 10,
          sync_frequency_minutes: 60,
          sync_enabled: true
        });
      
      return;
    }

    // Clear existing inventory
    console.log('\n🗑️  Clearing old inventory...');
    await supabase.from('inventory_items').delete().neq('id', '00000000-0000-0000-0000-000000000000');

    // Transform and insert products
    console.log('💾 Inserting inventory data...\n');
    
    const inventoryItems = products.map(product => ({
      sku: product.productId || product.sku || product.id || 'NO-SKU',
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

    // Save credentials to Supabase for future use
    console.log('\n\n💾 Saving credentials to Supabase for app use...');
    await supabase
      .from('settings')
      .upsert({
        id: 1,
        finale_api_key: apiKey,
        finale_api_secret: apiSecret,
        finale_account_path: accountPath,
        low_stock_threshold: 10,
        sync_frequency_minutes: 60,
        sync_enabled: true
      });

    console.log('\n✅ SYNC COMPLETE!');
    console.log(`📦 ${inserted} inventory items imported`);
    console.log('\n🎉 Your inventory is now available at http://localhost:3000/inventory');
    console.log('✅ Credentials saved to Supabase - future syncs will work from the app!');

  } catch (error) {
    console.error('\n❌ Sync failed:', error.message);
    
    if (error.message.includes('404')) {
      console.error('\n💡 404 error usually means:');
      console.error('1. The account path is incorrect');
      console.error('2. The API endpoint has changed');
      console.error(`3. Try using just "buildasoilorganics" instead of the full URL`);
    }
    
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

syncWithEnvCredentials();
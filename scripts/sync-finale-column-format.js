require('dotenv').config({ path: '.env.local' });
const { createClient } = require('@supabase/supabase-js');

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
);

async function syncFinale() {
  console.log('🚀 Starting Finale Sync (Column Format Handler)...\n');

  // Use credentials from environment
  const apiKey = process.env.FINALE_API_KEY;
  const apiSecret = process.env.FINALE_API_SECRET;
  let accountPath = process.env.FINALE_ACCOUNT_PATH;

  // Fix account path
  if (accountPath && accountPath.includes('finaleinventory.com/')) {
    const match = accountPath.match(/finaleinventory\.com\/([^\/]+)/);
    if (match) {
      accountPath = match[1];
    }
  }
  try {
    const authHeader = `Basic ${Buffer.from(`${apiKey}:${apiSecret}`).toString('base64')}`;
    const baseUrl = `https://app.finaleinventory.com/${accountPath}/api`;
    const url = `${baseUrl}/product?limit=500`;
    
    const response = await fetch(url, {
      headers: { 
        'Authorization': authHeader,
        'Accept': 'application/json'
      }
    });

    if (!response.ok) {
      throw new Error(`API error: ${response.status}`);
    }

    const data = await response.json();
    
    // Handle Finale's column format
    let products = [];
    
    if (data.productId && Array.isArray(data.productId)) {
      // This is column format - transform to row format
      const numProducts = data.productId.length;
      
      for (let i = 0; i < numProducts; i++) {
        const product = {};
        // Map each column to the product object
        Object.keys(data).forEach(key => {
          if (Array.isArray(data[key]) && data[key][i] !== undefined) {
            product[key] = data[key][i];
          }
        });
        products.push(product);
      }
    } else if (data.productList) {
      products = data.productList;
    } else if (Array.isArray(data)) {
      products = data;
    }
    if (products.length === 0) {
      return;
    }

    // Show sample product structure
    if (products.length > 0) {
      console.log(JSON.stringify(products[0], null, 2));
    }

    // Now fetch additional product details if needed
    // Clear existing inventory
    await supabase.from('inventory_items').delete().neq('id', '00000000-0000-0000-0000-000000000000');

    // Transform and insert products
    const inventoryItems = products.map(product => ({
      sku: product.productId || product.sku || 'NO-SKU',
      product_name: product.internalName || product.productName || product.productId || 'Unknown',
      current_stock: parseInt(product.quantityAvailable || product.quantity || 0),
      reorder_point: parseInt(product.reorderLevel || product.reorderPoint || 0),
      reorder_quantity: parseInt(product.reorderQuantity || 0),
      unit_cost: parseFloat(product.unitCost || product.averageCost || product.lastCost || 0),
      location: product.primaryLocation || product.location || 'Main',
      vendor: product.primaryVendor || product.vendor || '',
      category: product.productTypeId || product.category || '',
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

    // Save credentials to Supabase
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
    // Show first few items
    inventoryItems.slice(0, 5).forEach(item => {
    });

  } catch (error) {
    console.error('\n❌ Sync failed:', error.message);
  }
}

syncFinale();
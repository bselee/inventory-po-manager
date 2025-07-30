require('dotenv').config({ path: '.env.local' });
const { createClient } = require('@supabase/supabase-js');

// Use the CORRECT Supabase keys from top of .env.local
const supabaseUrl = 'https://htsconqmnzthnkvogbwu.supabase.co';
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imh0c2NvbnFtbnp0aG5rdm9nYnd1Iiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc1MjYwNTc3NSwiZXhwIjoyMDY4MTgxNzc1fQ.uQDz6k9xfa8NxuEPEGUi9bjeuUD2-n8tqBKFSZYCn2c';

const supabase = createClient(supabaseUrl, supabaseKey);

async function syncFinale() {
  console.log('🚀 Starting Finale Sync (FIXED VERSION)...\n');

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

  console.log('✅ Using credentials:');
  console.log('  Account Path:', accountPath);

  try {
    const authHeader = `Basic ${Buffer.from(`${apiKey}:${apiSecret}`).toString('base64')}`;
    const baseUrl = `https://app.finaleinventory.com/${accountPath}/api`;
    
    console.log('\n🔄 Fetching products from Finale...');
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
      console.log('📊 Converting from column format...');
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
    }

    console.log(`✅ Found ${products.length} products`);

    // Clear existing inventory
    console.log('\n🗑️  Clearing old inventory...');
    const { error: deleteError } = await supabase
      .from('inventory_items')
      .delete()
      .neq('id', '00000000-0000-0000-0000-000000000000');
    
    if (deleteError) {
      console.error('Delete error:', deleteError);
    }

    // Transform and insert products
    console.log('💾 Inserting inventory data...\n');
    
    const inventoryItems = products.map(product => ({
      sku: product.productId || 'NO-SKU',
      product_name: product.internalName || product.productName || product.productId || 'Unknown',
      current_stock: parseInt(product.quantityAvailable || product.quantity || 0),
      reorder_point: parseInt(product.reorderLevel || product.reorderPoint || 0),
      reorder_quantity: parseInt(product.reorderQuantity || 0),
      unit_cost: parseFloat(product.unitCost || product.cost || product.averageCost || product.lastCost || 0),
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
      const { data: insertData, error: insertError } = await supabase
        .from('inventory_items')
        .insert(batch)
        .select();

      if (insertError) {
        console.error('Error inserting batch:', insertError);
      } else {
        inserted += insertData.length;
        process.stdout.write(`\rInserted ${inserted}/${inventoryItems.length} items...`);
      }
    }

    // Save credentials to Supabase settings
    console.log('\n\n💾 Saving credentials to Supabase settings...');
    const { error: settingsError } = await supabase
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
    
    if (settingsError) {
      console.error('Settings error:', settingsError);
    }

    console.log('\n✅ SYNC COMPLETE!');
    console.log(`📦 ${inserted} inventory items imported`);
    console.log('\n🎉 Your inventory is now available at http://localhost:3000/inventory');

    // Show first few items
    console.log('\nFirst 5 items imported:');
    inventoryItems.slice(0, 5).forEach(item => {
      console.log(`  - ${item.sku}: ${item.product_name} (Stock: ${item.current_stock})`);
    });

  } catch (error) {
    console.error('\n❌ Sync failed:', error.message);
  }
}

syncFinale();
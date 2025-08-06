require('dotenv').config({ path: '.env.local' });
const { createClient } = require('@supabase/supabase-js');

// Use the CORRECT Supabase keys
const supabaseUrl = 'https://htsconqmnzthnkvogbwu.supabase.co';
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imh0c2NvbnFtbnp0aG5rdm9nYnd1Iiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc1MjYwNTc3NSwiZXhwIjoyMDY4MTgxNzc1fQ.uQDz6k9xfa8NxuEPEGUi9bjeuUD2-n8tqBKFSZYCn2c';

const supabase = createClient(supabaseUrl, supabaseKey);

async function syncFinale() {
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
    const url = `${baseUrl}/product?limit=1000`; // Get more products
    
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
      const numProducts = data.productId.length;
      
      for (let i = 0; i < numProducts; i++) {
        const product = {};
        Object.keys(data).forEach(key => {
          if (Array.isArray(data[key]) && data[key][i] !== undefined) {
            product[key] = data[key][i];
          }
        });
        products.push(product);
      }
    }
    // Clear existing inventory
    await supabase.from('inventory_items').delete().neq('id', '00000000-0000-0000-0000-000000000000');

    // Transform products - ONLY USE COLUMNS THAT EXIST IN THE TABLE
    const inventoryItems = products.map(product => ({
      sku: product.productId || 'NO-SKU',
      product_name: product.internalName || product.productName || product.productId || 'Unknown',
      current_stock: parseInt(product.quantityAvailable || product.quantity || 0),
      reorder_point: parseInt(product.reorderLevel || product.reorderPoint || 0),
      reorder_quantity: parseInt(product.reorderQuantity || 0),
      unit_cost: parseFloat(product.unitCost || product.cost || product.averageCost || product.lastCost || 0),
      location: product.primaryLocation || product.location || 'Main',
      vendor: product.primaryVendor || product.vendor || '',
      // Remove category field as it doesn't exist in the table
      last_updated: new Date().toISOString()
    }));

    // Insert ALL items at once (Supabase can handle it)
    const { data: insertData, error: insertError } = await supabase
      .from('inventory_items')
      .insert(inventoryItems)
      .select();

    if (insertError) {
      console.error('❌ Error inserting inventory:', insertError);
      
      // Try smaller batches if bulk insert fails
      let inserted = 0;
      const batchSize = 50;
      
      for (let i = 0; i < inventoryItems.length; i += batchSize) {
        const batch = inventoryItems.slice(i, i + batchSize);
        const { data: batchData, error: batchError } = await supabase
          .from('inventory_items')
          .insert(batch)
          .select();

        if (!batchError && batchData) {
          inserted += batchData.length;
          process.stdout.write(`\rInserted ${inserted}/${inventoryItems.length} items...`);
        }
      }
    } else {
    }

    // Save credentials to settings (with proper format)
    // First check if settings exist
    const { data: existingSettings } = await supabase
      .from('settings')
      .select('id')
      .limit(1)
      .single();

    const settingsData = {
      finale_api_key: apiKey,
      finale_api_secret: apiSecret,
      finale_account_path: accountPath,
      low_stock_threshold: 10,
      sync_frequency_minutes: 60,
      sync_enabled: true
    };

    if (existingSettings) {
      // Update existing
      await supabase
        .from('settings')
        .update(settingsData)
        .eq('id', existingSettings.id);
    } else {
      // Insert new
      await supabase
        .from('settings')
        .insert(settingsData);
    }

    console.log('\n' + '='.repeat(60));
    console.log('='.repeat(60));
    // Show sample of imported items
    console.log('-'.repeat(60));
    inventoryItems.slice(0, 10).forEach(item => {
    });
    console.log('-'.repeat(60));

  } catch (error) {
    console.error('\n❌ Sync failed:', error.message);
  }
}

syncFinale();
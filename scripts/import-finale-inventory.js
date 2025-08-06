require('dotenv').config({ path: '.env.local' });
const { createClient } = require('@supabase/supabase-js');

const supabaseUrl = 'https://htsconqmnzthnkvogbwu.supabase.co';
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imh0c2NvbnFtbnp0aG5rdm9nYnd1Iiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc1MjYwNTc3NSwiZXhwIjoyMDY4MTgxNzc1fQ.uQDz6k9xfa8NxuEPEGUi9bjeuUD2-n8tqBKFSZYCn2c';

const supabase = createClient(supabaseUrl, supabaseKey);

async function importFinaleInventory() {
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
    const url = `${baseUrl}/product?limit=2000`;
    
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
    
    // Convert from column format to row format
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

    // Transform to match Supabase table structure
    const inventoryItems = products.map(product => ({
      sku: product.productId || 'NO-SKU',
      product_name: product.internalName || product.productName || product.productId || 'Unknown',
      stock: parseInt(product.quantityAvailable || product.quantity || 0),  // Using 'stock' not 'current_stock'
      reorder_point: parseInt(product.reorderLevel || product.reorderPoint || 0),
      reorder_quantity: parseInt(product.reorderQuantity || 0),
      cost: parseFloat(product.unitCost || product.cost || product.averageCost || 0),  // Using 'cost' not 'unit_cost'
      location: product.primaryLocation || product.location || 'Main',
      vendor: product.primaryVendor || product.vendor || '',
      last_updated: new Date().toISOString()
    }));

    // Insert in batches
    const batchSize = 100;
    let inserted = 0;
    
    for (let i = 0; i < inventoryItems.length; i += batchSize) {
      const batch = inventoryItems.slice(i, i + batchSize);
      const { data: batchData, error: batchError } = await supabase
        .from('inventory_items')
        .insert(batch)
        .select();

      if (batchError) {
        console.error(`Batch ${i/batchSize + 1} error:`, batchError.message);
      } else if (batchData) {
        inserted += batchData.length;
        process.stdout.write(`\r✅ Imported ${inserted}/${inventoryItems.length} items...`);
      }
    }

    console.log('\n\n' + '='.repeat(60));
    console.log('='.repeat(60));
    // Show sample
    console.log('-'.repeat(80));
    console.log('SKU'.padEnd(15) + ' | ' + 'Product Name'.padEnd(40) + ' | ' + 'Stock'.padEnd(8) + ' | Cost');
    console.log('-'.repeat(80));
    inventoryItems.slice(0, 20).forEach(item => {
      .padEnd(15) + ' | ' + 
        item.product_name.substring(0, 39).padEnd(40) + ' | ' + 
        String(item.stock).padEnd(8) + ' | $' + 
        item.cost.toFixed(2)
      );
    });
    console.log('-'.repeat(80));

  } catch (error) {
    console.error('\n❌ Import failed:', error.message);
  }
}

importFinaleInventory();
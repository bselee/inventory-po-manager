// Full Finale sync - sync all products
const https = require('https');
const { createClient } = require('@supabase/supabase-js');

// Finale API credentials
const apiKey = 'I9TVdRvblFod';
const apiSecret = '63h4TCI62vlQUYM3btEA7bycoIflGQUz';
const accountPath = 'buildasoilorganics';
const authString = Buffer.from(`${apiKey}:${apiSecret}`).toString('base64');

// Supabase credentials
const supabaseUrl = 'https://htsconqmnzthnkvogbwu.supabase.co';
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imh0c2NvbnFtbnp0aG5rdm9nYnd1Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTI2MDU3NzUsImV4cCI6MjA2ODE4MTc3NX0.AVyKmrQey0wZx6DfWkZv3OYjCzrHeLguw5lv7uVg1wY';
const supabase = createClient(supabaseUrl, supabaseKey);

async function fetchFinaleData(endpoint) {
  const url = `https://app.finaleinventory.com/${accountPath}/api${endpoint}`;
  
  return new Promise((resolve, reject) => {
    https.get(url, {
      headers: {
        'Authorization': `Basic ${authString}`,
        'Accept': 'application/json'
      }
    }, (res) => {
      let data = '';
      res.on('data', chunk => data += chunk);
      res.on('end', () => {
        if (res.statusCode === 200) {
          try {
            resolve(JSON.parse(data));
          } catch (e) {
            reject(new Error('Invalid JSON response'));
          }
        } else {
          reject(new Error(`HTTP ${res.statusCode}: ${data.substring(0, 100)}`));
        }
      });
    }).on('error', reject);
  });
}

async function fullSync() {
  console.log('🚀 FULL FINALE TO SUPABASE SYNC\n');
  console.log('=' .repeat(60));
  
  const startTime = Date.now();
  
  try {
    // 1. Create sync log
    console.log('\n1. Creating sync log...');
    const { data: syncLog } = await supabase
      .from('sync_logs')
      .insert({
        sync_type: 'finale_inventory',
        status: 'running',
        synced_at: new Date().toISOString(),
        items_processed: 0,
        items_updated: 0,
        errors: []
      })
      .select()
      .single();
    
    console.log('✅ Created sync log:', syncLog?.id);
    
    // 2. Fetch ALL products from Finale (paginated)
    console.log('\n2. Fetching all products from Finale...');
    const allProducts = [];
    let offset = 0;
    const limit = 100;
    let hasMore = true;
    
    while (hasMore) {
      process.stdout.write(`   Fetching products ${offset + 1}-${offset + limit}...`);
      const batch = await fetchFinaleData(`/product?limit=${limit}&offset=${offset}`);
      
      if (batch.productId && Array.isArray(batch.productId)) {
        const batchSize = batch.productId.length;
        
        // Convert parallel arrays to objects
        for (let i = 0; i < batchSize; i++) {
          const product = {};
          for (const [key, value] of Object.entries(batch)) {
            if (Array.isArray(value) && value.length >= batchSize) {
              product[key] = value[i];
            }
          }
          allProducts.push(product);
        }
        
        console.log(` got ${batchSize}`);
        hasMore = batchSize === limit;
        offset += limit;
      } else {
        hasMore = false;
      }
    }
    
    console.log(`✅ Found ${allProducts.length} total products`);
    
    // 3. Fetch ALL inventory data
    console.log('\n3. Fetching all inventory data...');
    let inventoryData = { productId: [], quantityOnHand: [], quantityReserved: [], quantityOnOrder: [] };
    let invOffset = 0;
    const invLimit = 1000;
    hasMore = true;
    
    while (hasMore) {
      process.stdout.write(`   Fetching inventory ${invOffset + 1}-${invOffset + invLimit}...`);
      const batch = await fetchFinaleData(`/inventoryitem/?limit=${invLimit}&offset=${invOffset}`);
      
      if (batch.productId && Array.isArray(batch.productId)) {
        const batchSize = batch.productId.length;
        
        // Append to arrays
        inventoryData.productId.push(...batch.productId);
        inventoryData.quantityOnHand.push(...(batch.quantityOnHand || []));
        inventoryData.quantityReserved.push(...(batch.quantityReserved || []));
        inventoryData.quantityOnOrder.push(...(batch.quantityOnOrder || []));
        
        console.log(` got ${batchSize}`);
        hasMore = batchSize === invLimit;
        invOffset += invLimit;
      } else {
        hasMore = false;
      }
    }
    
    console.log(`✅ Found ${inventoryData.productId.length} inventory records`);
    
    // 4. Aggregate inventory by product
    console.log('\n4. Aggregating inventory by product...');
    const inventoryMap = new Map();
    
    for (let i = 0; i < inventoryData.productId.length; i++) {
      const productId = inventoryData.productId[i];
      if (!inventoryMap.has(productId)) {
        inventoryMap.set(productId, {
          quantityOnHand: 0,
          quantityReserved: 0,
          quantityOnOrder: 0
        });
      }
      
      const inv = inventoryMap.get(productId);
      inv.quantityOnHand += parseFloat(inventoryData.quantityOnHand?.[i] || 0);
      inv.quantityReserved += parseFloat(inventoryData.quantityReserved?.[i] || 0);
      inv.quantityOnOrder += parseFloat(inventoryData.quantityOnOrder?.[i] || 0);
    }
    
    console.log(`✅ Aggregated inventory for ${inventoryMap.size} products`);
    
    // 5. Prepare and batch upsert to Supabase
    console.log('\n5. Syncing to Supabase...');
    const batchSize = 50;
    let totalProcessed = 0;
    let totalUpdated = 0;
    const errors = [];
    
    for (let i = 0; i < allProducts.length; i += batchSize) {
      const batch = allProducts.slice(i, i + batchSize);
      const itemsToUpsert = [];
      
      for (const product of batch) {
        const productId = product.productId;
        const inv = inventoryMap.get(productId) || { quantityOnHand: 0, quantityReserved: 0 };
        
        itemsToUpsert.push({
          sku: productId,
          product_name: product.internalName || product.productName || productId,
          stock: Math.round(inv.quantityOnHand),
          location: 'Shipping',
          reorder_point: 0,
          reorder_quantity: 0,
          vendor: null,
          cost: 0,
          last_updated: new Date().toISOString()
        });
      }
      
      process.stdout.write(`   Batch ${Math.floor(i / batchSize) + 1}/${Math.ceil(allProducts.length / batchSize)}...`);
      
      const { data: upserted, error: upsertError } = await supabase
        .from('inventory_items')
        .upsert(itemsToUpsert, {
          onConflict: 'sku',
          ignoreDuplicates: false
        })
        .select();
      
      if (upsertError) {
        console.log(` ❌ Error: ${upsertError.message}`);
        errors.push({ batch: i / batchSize + 1, error: upsertError.message });
      } else {
        console.log(` ✅ Updated ${upserted?.length || 0} items`);
        totalUpdated += upserted?.length || 0;
      }
      
      totalProcessed += itemsToUpsert.length;
      
      // Update sync log periodically
      if (syncLog && i % 500 === 0) {
        await supabase
          .from('sync_logs')
          .update({
            items_processed: totalProcessed,
            items_updated: totalUpdated,
            metadata: { progress: `${Math.round(totalProcessed / allProducts.length * 100)}%` }
          })
          .eq('id', syncLog.id);
      }
    }
    
    // 6. Final sync log update
    if (syncLog) {
      const duration = Date.now() - startTime;
      await supabase
        .from('sync_logs')
        .update({
          status: errors.length === 0 ? 'success' : 'partial',
          items_processed: totalProcessed,
          items_updated: totalUpdated,
          errors: errors.map(e => e.error),
          duration_ms: duration
        })
        .eq('id', syncLog.id);
    }
    
    // 7. Summary
    const duration = Math.round((Date.now() - startTime) / 1000);
    console.log('\n\n📊 SYNC COMPLETE');
    console.log('=' .repeat(60));
    console.log(`Duration: ${duration} seconds`);
    console.log(`Products found: ${allProducts.length}`);
    console.log(`Items processed: ${totalProcessed}`);
    console.log(`Items updated: ${totalUpdated}`);
    console.log(`Errors: ${errors.length}`);
    
    // 8. Final inventory count
    const { count } = await supabase
      .from('inventory_items')
      .select('*', { count: 'exact', head: true });
    
    console.log(`\n✅ Total items in database: ${count}`);
    
    // 9. Show sample items with stock
    console.log('\n📦 Sample items with stock:');
    const { data: stockedItems } = await supabase
      .from('inventory_items')
      .select('sku, product_name, stock')
      .gt('stock', 0)
      .order('stock', { ascending: false })
      .limit(10);
    
    if (stockedItems && stockedItems.length > 0) {
      stockedItems.forEach((item, i) => {
        console.log(`${i + 1}. ${item.sku} - ${item.product_name}: ${item.stock} units`);
      });
    } else {
      console.log('No items with stock found');
    }
    
  } catch (error) {
    console.error('\n\n❌ Sync error:', error.message);
    console.error(error.stack);
  }
}

// Run the full sync
fullSync();
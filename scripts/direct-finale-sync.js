// Direct Finale sync test without using the API endpoint
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

async function syncFinaleToSupabase() {
  console.log('=' .repeat(60));
  
  try {
    // 1. Clear any stuck sync logs
    const { error: updateError } = await supabase
      .from('sync_logs')
      .update({ status: 'error', errors: ['Manually terminated'] })
      .eq('sync_type', 'finale_inventory')
      .eq('status', 'running');
    
    if (updateError) {
    } else {
    }
    
    // 2. Create new sync log
    const { data: syncLog, error: logError } = await supabase
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
    
    if (logError) {
    } else {
    }
    
    // 3. Fetch products from Finale
    const products = await fetchFinaleData('/product?limit=100');
    // 4. Fetch inventory from Finale
    const inventory = await fetchFinaleData('/inventoryitem/?limit=1000');
    // 5. Aggregate inventory by product
    const inventoryMap = new Map();
    
    if (inventory.productId && Array.isArray(inventory.productId)) {
      for (let i = 0; i < inventory.productId.length; i++) {
        const productId = inventory.productId[i];
        if (!inventoryMap.has(productId)) {
          inventoryMap.set(productId, {
            quantityOnHand: 0,
            quantityReserved: 0,
            quantityOnOrder: 0
          });
        }
        
        const inv = inventoryMap.get(productId);
        inv.quantityOnHand += parseFloat(inventory.quantityOnHand?.[i] || 0);
        inv.quantityReserved += parseFloat(inventory.quantityReserved?.[i] || 0);
        inv.quantityOnOrder += parseFloat(inventory.quantityOnOrder?.[i] || 0);
      }
    }
    // 6. Prepare data for Supabase
    const itemsToUpsert = [];
    
    if (products.productId && Array.isArray(products.productId)) {
      for (let i = 0; i < Math.min(50, products.productId.length); i++) { // Limit to 50 for testing
        const productId = products.productId[i];
        const inv = inventoryMap.get(productId) || { quantityOnHand: 0, quantityReserved: 0 };
        
        itemsToUpsert.push({
          sku: productId,
          product_name: products.internalName?.[i] || products.productName?.[i] || productId,
          stock: Math.round(inv.quantityOnHand),
          location: 'Shipping',
          reorder_point: 0,
          reorder_quantity: 0,
          vendor: null,
          cost: 0,
          last_updated: new Date().toISOString()
        });
      }
    }
    // 7. Upsert to Supabase
    const { data: upserted, error: upsertError } = await supabase
      .from('inventory_items')
      .upsert(itemsToUpsert, {
        onConflict: 'sku',
        ignoreDuplicates: false
      })
      .select();
    
    if (upsertError) {
      console.error('❌ Upsert error:', upsertError);
    } else {
    }
    
    // 8. Update sync log
    if (syncLog) {
      await supabase
        .from('sync_logs')
        .update({
          status: upsertError ? 'error' : 'success',
          items_processed: itemsToUpsert.length,
          items_updated: upserted?.length || 0,
          errors: upsertError ? [upsertError.message] : [],
          duration_ms: Date.now() - new Date(syncLog.synced_at).getTime()
        })
        .eq('id', syncLog.id);
    }
    
    // 9. Show sample synced data
    if (upserted && upserted.length > 0) {
      upserted.slice(0, 5).forEach((item, i) => {
      });
    }
    
    // 10. Final inventory count
    const { count } = await supabase
      .from('inventory_items')
      .select('*', { count: 'exact', head: true });
  } catch (error) {
    console.error('\n❌ Sync error:', error.message);
    console.error(error.stack);
  }
}

// Run the sync
syncFinaleToSupabase();
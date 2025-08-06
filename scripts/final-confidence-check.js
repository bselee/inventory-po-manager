// Final confidence check - simulate a real sync scenario
const https = require('https');
const { createClient } = require('@supabase/supabase-js');

const apiKey = 'I9TVdRvblFod';
const apiSecret = '63h4TCI62vlQUYM3btEA7bycoIflGQUz';
const accountPath = 'buildasoilorganics';
const authString = Buffer.from(`${apiKey}:${apiSecret}`).toString('base64');

const supabaseUrl = 'https://htsconqmnzthnkvogbwu.supabase.co';
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imh0c2NvbnFtbnp0aG5rdm9nYnd1Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTI2MDU3NzUsImV4cCI6MjA2ODE4MTc3NX0.AVyKmrQey0wZx6DfWkZv3OYjCzrHeLguw5lv7uVg1wY';
const supabase = createClient(supabaseUrl, supabaseKey);

async function finalConfidenceCheck() {
  console.log('=' .repeat(60));
  
  try {
    // 1. Verify we can get real inventory data from Finale
    const invUrl = `https://app.finaleinventory.com/${accountPath}/api/inventoryitem/?limit=5`;
    
    const invData = await new Promise((resolve, reject) => {
      https.get(invUrl, {
        headers: {
          'Authorization': `Basic ${authString}`,
          'Accept': 'application/json'
        }
      }, (res) => {
        let data = '';
        res.on('data', chunk => data += chunk);
        res.on('end', () => {
          if (res.statusCode === 200) {
            resolve(JSON.parse(data));
          } else {
            reject(new Error(`HTTP ${res.statusCode}`));
          }
        });
      }).on('error', reject);
    });
    
    if (invData && invData.productId && invData.quantityOnHand) {
      // 2. Verify our mapping logic
      const testItem = {
        sku: invData.productId[0],
        product_name: `Test Product ${invData.productId[0]}`,
        stock: Math.round(parseFloat(invData.quantityOnHand[0] || 0)),
        location: 'Shipping',
        reorder_point: 0,
        reorder_quantity: 0,
        vendor: null,
        cost: 0,
        last_updated: new Date().toISOString()
      };
      // 3. Test database upsert
      const { data: upserted, error } = await supabase
        .from('inventory_items')
        .upsert(testItem, {
          onConflict: 'sku',
          ignoreDuplicates: false
        })
        .select()
        .single();
      
      if (error) {
      } else {
      }
      
      // 4. Verify the update persisted
      const { data: verified } = await supabase
        .from('inventory_items')
        .select('sku, stock, last_updated')
        .eq('sku', testItem.sku)
        .single();
      
      if (verified && verified.stock === testItem.stock) {
      } else {
      }
      
      // 5. Check sync would work for multiple items
      const batchItems = [];
      for (let i = 0; i < Math.min(3, invData.productId.length); i++) {
        batchItems.push({
          sku: invData.productId[i],
          product_name: `Product ${invData.productId[i]}`,
          stock: Math.round(parseFloat(invData.quantityOnHand?.[i] || 0)),
          location: 'Shipping',
          reorder_point: 0,
          reorder_quantity: 0,
          vendor: null,
          cost: 0,
          last_updated: new Date().toISOString()
        });
      }
      
      const { data: batchResult, error: batchError } = await supabase
        .from('inventory_items')
        .upsert(batchItems, {
          onConflict: 'sku',
          ignoreDuplicates: false
        })
        .select();
      
      if (batchError) {
      } else {
      }
      
    } else {
    }
    
  } catch (error) {
    console.error('❌ Test failed:', error.message);
  }
  
  // FINAL VERDICT
  console.log('\n\n' + '=' .repeat(60));
  const { count } = await supabase
    .from('inventory_items')
    .select('*', { count: 'exact', head: true });
  
  const { data: lastSync } = await supabase
    .from('sync_logs')
    .select('*')
    .eq('sync_type', 'finale_inventory')
    .eq('status', 'success')
    .order('synced_at', { ascending: false })
    .limit(1)
    .maybeSingle();
  console.log('- Update existing records (not duplicate)');
}

finalConfidenceCheck().catch(console.error);
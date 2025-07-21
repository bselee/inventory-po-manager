// Check sync status and inventory count
const { createClient } = require('@supabase/supabase-js');

const supabaseUrl = 'https://htsconqmnzthnkvogbwu.supabase.co';
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imh0c2NvbnFtbnp0aG5rdm9nYnd1Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTI2MDU3NzUsImV4cCI6MjA2ODE4MTc3NX0.AVyKmrQey0wZx6DfWkZv3OYjCzrHeLguw5lv7uVg1wY';
const supabase = createClient(supabaseUrl, supabaseKey);

async function checkStatus() {
  console.log('📊 CHECKING SYNC STATUS\n');
  console.log('=' .repeat(60));
  
  // 1. Get running sync
  const { data: runningSync } = await supabase
    .from('sync_logs')
    .select('*')
    .eq('sync_type', 'finale_inventory')
    .eq('status', 'running')
    .order('synced_at', { ascending: false })
    .limit(1)
    .maybeSingle();
  
  if (runningSync) {
    const runtime = Math.round((Date.now() - new Date(runningSync.synced_at).getTime()) / 1000 / 60);
    console.log('\n🔄 SYNC IN PROGRESS');
    console.log(`Sync ID: ${runningSync.id}`);
    console.log(`Running for: ${runtime} minutes`);
    console.log(`Items processed: ${runningSync.items_processed || 0}`);
    console.log(`Items updated: ${runningSync.items_updated || 0}`);
    console.log(`Progress: ${runningSync.metadata?.progress || 'Unknown'}`);
  } else {
    console.log('\n✅ No sync currently running');
  }
  
  // 2. Get last completed sync
  const { data: lastSync } = await supabase
    .from('sync_logs')
    .select('*')
    .eq('sync_type', 'finale_inventory')
    .in('status', ['success', 'partial', 'error'])
    .order('synced_at', { ascending: false })
    .limit(1)
    .maybeSingle();
  
  if (lastSync) {
    console.log('\n📅 LAST COMPLETED SYNC');
    console.log(`Sync ID: ${lastSync.id}`);
    console.log(`Status: ${lastSync.status}`);
    console.log(`Time: ${lastSync.synced_at}`);
    console.log(`Duration: ${lastSync.duration_ms ? Math.round(lastSync.duration_ms / 1000) + 's' : 'Unknown'}`);
    console.log(`Items processed: ${lastSync.items_processed || 0}`);
    console.log(`Items updated: ${lastSync.items_updated || 0}`);
    if (lastSync.errors?.length > 0) {
      console.log(`Errors: ${lastSync.errors.length}`);
    }
  }
  
  // 3. Current inventory count
  const { count } = await supabase
    .from('inventory_items')
    .select('*', { count: 'exact', head: true });
  
  console.log('\n📦 INVENTORY STATUS');
  console.log(`Total items in database: ${count}`);
  
  // 4. Items with stock
  const { count: stockCount } = await supabase
    .from('inventory_items')
    .select('*', { count: 'exact', head: true })
    .gt('stock', 0);
  
  console.log(`Items with stock > 0: ${stockCount}`);
  
  // 5. Sample items
  console.log('\n🔍 SAMPLE ITEMS WITH STOCK');
  const { data: samples } = await supabase
    .from('inventory_items')
    .select('sku, product_name, stock')
    .gt('stock', 0)
    .order('stock', { ascending: false })
    .limit(10);
  
  if (samples && samples.length > 0) {
    samples.forEach((item, i) => {
      console.log(`${i + 1}. ${item.sku}: ${item.stock} units - ${item.product_name}`);
    });
  }
  
  // 6. Terminate stuck sync if needed
  if (runningSync) {
    const runtime = Math.round((Date.now() - new Date(runningSync.synced_at).getTime()) / 1000 / 60);
    if (runtime > 30) {
      console.log('\n⚠️ TERMINATING STUCK SYNC');
      await supabase
        .from('sync_logs')
        .update({
          status: 'error',
          errors: [`Sync terminated after ${runtime} minutes`],
          duration_ms: runtime * 60 * 1000
        })
        .eq('id', runningSync.id);
      console.log('✅ Terminated');
    }
  }
}

checkStatus().catch(console.error);
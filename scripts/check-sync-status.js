// Check sync status and inventory count
const { createClient } = require('@supabase/supabase-js');

const supabaseUrl = 'https://htsconqmnzthnkvogbwu.supabase.co';
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imh0c2NvbnFtbnp0aG5rdm9nYnd1Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTI2MDU3NzUsImV4cCI6MjA2ODE4MTc3NX0.AVyKmrQey0wZx6DfWkZv3OYjCzrHeLguw5lv7uVg1wY';
const supabase = createClient(supabaseUrl, supabaseKey);

async function checkStatus() {
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
  } else {
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
    if (lastSync.errors?.length > 0) {
    }
  }
  
  // 3. Current inventory count
  const { count } = await supabase
    .from('inventory_items')
    .select('*', { count: 'exact', head: true });
  // 4. Items with stock
  const { count: stockCount } = await supabase
    .from('inventory_items')
    .select('*', { count: 'exact', head: true })
    .gt('stock', 0);
  // 5. Sample items
  const { data: samples } = await supabase
    .from('inventory_items')
    .select('sku, product_name, stock')
    .gt('stock', 0)
    .order('stock', { ascending: false })
    .limit(10);
  
  if (samples && samples.length > 0) {
    samples.forEach((item, i) => {
    });
  }
  
  // 6. Terminate stuck sync if needed
  if (runningSync) {
    const runtime = Math.round((Date.now() - new Date(runningSync.synced_at).getTime()) / 1000 / 60);
    if (runtime > 30) {
      await supabase
        .from('sync_logs')
        .update({
          status: 'error',
          errors: [`Sync terminated after ${runtime} minutes`],
          duration_ms: runtime * 60 * 1000
        })
        .eq('id', runningSync.id);
    }
  }
}

checkStatus().catch(console.error);
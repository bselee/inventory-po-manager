// Test Supabase directly to see inventory data
const { createClient } = require('@supabase/supabase-js');

const supabaseUrl = 'https://htsconqmnzthnkvogbwu.supabase.co';
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imh0c2NvbnFtbnp0aG5rdm9nYnd1Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTI2MDU3NzUsImV4cCI6MjA2ODE4MTc3NX0.AVyKmrQey0wZx6DfWkZv3OYjCzrHeLguw5lv7uVg1wY';

const supabase = createClient(supabaseUrl, supabaseKey);

async function testSupabaseData() {
  console.log('=' .repeat(60));
  
  // 1. Check inventory items
  const { data: items, error: itemsError, count } = await supabase
    .from('inventory_items')
    .select('*', { count: 'exact' })
    .order('quantity_on_hand', { ascending: false })
    .limit(10);
  
  if (itemsError) {
    console.error('Error fetching items:', itemsError);
  } else {
    if (items && items.length > 0) {
      items.forEach((item, i) => {
      });
    } else {
    }
  }
  
  // 2. Check sync logs
  const { data: logs, error: logsError } = await supabase
    .from('sync_logs')
    .select('*')
    .eq('sync_type', 'finale_inventory')
    .order('synced_at', { ascending: false })
    .limit(5);
  
  if (logsError) {
    console.error('Error fetching logs:', logsError);
  } else if (logs && logs.length > 0) {
    logs.forEach((log, i) => {
      console.log(`   Duration: ${log.duration_ms ? `${Math.round(log.duration_ms / 1000)}s` : 'Unknown'}`);
      
      if (log.errors && log.errors.length > 0) {
      }
    });
  } else {
  }
  
  // 3. Check settings
  const { data: settings, error: settingsError } = await supabase
    .from('settings')
    .select('*')
    .maybeSingle();
  
  if (settingsError) {
    console.error('Error fetching settings:', settingsError);
  } else if (settings) {
  } else {
  }
}

// Run the test
testSupabaseData().catch(console.error);
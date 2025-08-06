// Test Supabase directly to see inventory data
const { createClient } = require('@supabase/supabase-js');

// Load environment variables
require('dotenv').config({ path: '.env.local' });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseKey) {
  console.error('Missing Supabase credentials');
  process.exit(1);
}

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
    .single();
  
  if (settingsError) {
    console.error('Error fetching settings:', settingsError);
  } else if (settings) {
  }
}

// Run the test
testSupabaseData().catch(console.error);
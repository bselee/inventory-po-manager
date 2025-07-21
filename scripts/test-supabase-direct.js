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
  console.log('🔍 TESTING SUPABASE DATA\n');
  console.log('=' .repeat(60));
  
  // 1. Check inventory items
  console.log('\n1. Checking inventory_items table...');
  const { data: items, error: itemsError, count } = await supabase
    .from('inventory_items')
    .select('*', { count: 'exact' })
    .order('quantity_on_hand', { ascending: false })
    .limit(10);
  
  if (itemsError) {
    console.error('Error fetching items:', itemsError);
  } else {
    console.log(`Total items in database: ${count}`);
    
    if (items && items.length > 0) {
      console.log('\nTop 10 items by quantity:');
      items.forEach((item, i) => {
        console.log(`\n${i + 1}. ${item.sku} - ${item.description || 'No description'}`);
        console.log(`   On Hand: ${item.quantity_on_hand}`);
        console.log(`   Available: ${item.quantity_available}`);
        console.log(`   Cost: $${item.cost || 0}`);
        console.log(`   Last Synced: ${item.last_synced || 'Never'}`);
      });
    } else {
      console.log('No items found in inventory_items table');
    }
  }
  
  // 2. Check sync logs
  console.log('\n\n2. Checking sync_logs table...');
  const { data: logs, error: logsError } = await supabase
    .from('sync_logs')
    .select('*')
    .eq('sync_type', 'finale_inventory')
    .order('synced_at', { ascending: false })
    .limit(5);
  
  if (logsError) {
    console.error('Error fetching logs:', logsError);
  } else if (logs && logs.length > 0) {
    console.log(`Found ${logs.length} recent sync logs:`);
    
    logs.forEach((log, i) => {
      console.log(`\n${i + 1}. Sync ID: ${log.id}`);
      console.log(`   Status: ${log.status}`);
      console.log(`   Time: ${log.synced_at}`);
      console.log(`   Items Processed: ${log.items_processed || 0}`);
      console.log(`   Items Updated: ${log.items_updated || 0}`);
      console.log(`   Duration: ${log.duration_ms ? `${Math.round(log.duration_ms / 1000)}s` : 'Unknown'}`);
      
      if (log.errors && log.errors.length > 0) {
        console.log(`   Errors: ${log.errors.length}`);
        console.log(`   First error: ${log.errors[0]}`);
      }
    });
  } else {
    console.log('No sync logs found');
  }
  
  // 3. Check settings
  console.log('\n\n3. Checking settings table...');
  const { data: settings, error: settingsError } = await supabase
    .from('settings')
    .select('*')
    .single();
  
  if (settingsError) {
    console.error('Error fetching settings:', settingsError);
  } else if (settings) {
    console.log('Settings found:');
    console.log(`  Auto sync enabled: ${settings.finale_auto_sync_enabled || false}`);
    console.log(`  Sync interval: ${settings.finale_sync_interval_hours || 0} hours`);
    console.log(`  Account path: ${settings.finale_account_path || 'Not set'}`);
    console.log(`  API key: ${settings.finale_api_key ? '***' + settings.finale_api_key.slice(-4) : 'Not set'}`);
  }
}

// Run the test
testSupabaseData().catch(console.error);
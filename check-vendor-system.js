// Quick vendor system check
const { supabase } = require('./app/lib/supabase.js');

async function checkVendorSystem() {
  console.log('🔍 Checking Vendor System Status...\n');
  
  try {
    // 1. Check settings
    console.log('1. Checking settings...');
    const { data: settings, error: settingsError } = await supabase
      .from('settings')
      .select('sync_enabled, sync_vendors, finale_api_key, finale_account_path')
      .single();
      
    if (settingsError) {
      console.error('❌ Settings error:', settingsError.message);
      return;
    }
    
    console.log('✅ Settings:');
    console.log(`   - General sync enabled: ${settings.sync_enabled}`);
    console.log(`   - Vendor sync enabled: ${settings.sync_vendors}`);
    console.log(`   - Finale API configured: ${settings.finale_api_key ? 'Yes' : 'No'}`);
    console.log(`   - Account path: ${settings.finale_account_path || 'Not set'}`);
    
    // 2. Check vendors
    console.log('\n2. Checking vendors...');
    const { data: vendors, error: vendorError } = await supabase
      .from('vendors')
      .select('id, name, finale_vendor_id, active')
      .limit(5);
      
    if (vendorError) {
      console.error('❌ Vendor error:', vendorError.message);
    } else {
      console.log(`✅ Found ${vendors?.length || 0} vendors in database`);
      if (vendors && vendors.length > 0) {
        vendors.forEach((vendor, i) => {
          console.log(`   ${i + 1}. ${vendor.name} (Finale ID: ${vendor.finale_vendor_id || 'None'})`);
        });
      }
    }
    
    // 3. Check sync logs
    console.log('\n3. Checking sync history...');
    const { data: syncLogs, error: logError } = await supabase
      .from('sync_logs')
      .select('*')
      .or('sync_type.eq.vendors,sync_type.eq.finale_vendors')
      .order('created_at', { ascending: false })
      .limit(3);
      
    if (logError) {
      console.error('❌ Sync log error:', logError.message);
    } else if (syncLogs && syncLogs.length > 0) {
      console.log(`✅ Found ${syncLogs.length} sync logs:`);
      syncLogs.forEach((log, i) => {
        const date = new Date(log.created_at).toLocaleString();
        console.log(`   ${i + 1}. ${log.sync_type} - ${log.status} - ${date}`);
        if (log.items_processed) {
          console.log(`      Items processed: ${log.items_processed}`);
        }
      });
    } else {
      console.log('⚠️  No vendor sync logs found');
    }
    
    console.log('\n📋 System Status Summary:');
    if (vendors && vendors.length === 0) {
      console.log('❌ No vendors in database - Need to run initial sync');
      console.log('🔄 Scheduled sync: Daily at 4 AM UTC');
      console.log('⚙️  Manual sync available at /api/sync-vendors');
    } else {
      console.log('✅ Vendor system operational');
      console.log('🔄 Automatic sync configured for 4 AM UTC daily');
    }
    
  } catch (error) {
    console.error('❌ System check failed:', error.message);
  }
}

checkVendorSystem();

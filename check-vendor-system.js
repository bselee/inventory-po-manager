// Quick vendor system check
const { supabase } = require('./app/lib/supabase.js');

async function checkVendorSystem() {
  try {
    // 1. Check settings
    const { data: settings, error: settingsError } = await supabase
      .from('settings')
      .select('sync_enabled, sync_vendors, finale_api_key, finale_account_path')
      .single();
      
    if (settingsError) {
      console.error('❌ Settings error:', settingsError.message);
      return;
    }
    // 2. Check vendors
    const { data: vendors, error: vendorError } = await supabase
      .from('vendors')
      .select('id, name, finale_vendor_id, active')
      .limit(5);
      
    if (vendorError) {
      console.error('❌ Vendor error:', vendorError.message);
    } else {
      if (vendors && vendors.length > 0) {
        vendors.forEach((vendor, i) => {
        });
      }
    }
    
    // 3. Check sync logs
    const { data: syncLogs, error: logError } = await supabase
      .from('sync_logs')
      .select('*')
      .or('sync_type.eq.vendors,sync_type.eq.finale_vendors')
      .order('created_at', { ascending: false })
      .limit(3);
      
    if (logError) {
      console.error('❌ Sync log error:', logError.message);
    } else if (syncLogs && syncLogs.length > 0) {
      syncLogs.forEach((log, i) => {
        const date = new Date(log.created_at).toLocaleString();
        if (log.items_processed) {
        }
      });
    } else {
    }
    if (vendors && vendors.length === 0) {
    } else {
    }
    
  } catch (error) {
    console.error('❌ System check failed:', error.message);
  }
}

checkVendorSystem();

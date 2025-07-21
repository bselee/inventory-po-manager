// Configure auto-sync settings
const { createClient } = require('@supabase/supabase-js');

const supabaseUrl = 'https://htsconqmnzthnkvogbwu.supabase.co';
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imh0c2NvbnFtbnp0aG5rdm9nYnd1Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTI2MDU3NzUsImV4cCI6MjA2ODE4MTc3NX0.AVyKmrQey0wZx6DfWkZv3OYjCzrHeLguw5lv7uVg1wY';
const supabase = createClient(supabaseUrl, supabaseKey);

async function configureAutoSync() {
  console.log('⚙️  CONFIGURING AUTO-SYNC\n');
  console.log('=' .repeat(60));
  
  // 1. Check current settings
  console.log('\n1. Checking current settings...');
  const { data: currentSettings, error: fetchError } = await supabase
    .from('settings')
    .select('*')
    .maybeSingle();
  
  if (fetchError) {
    console.error('Error fetching settings:', fetchError);
    return;
  }
  
  if (currentSettings) {
    console.log('Current settings:');
    console.log(`  Auto-sync enabled: ${currentSettings.finale_auto_sync_enabled || false}`);
    console.log(`  Sync interval: ${currentSettings.finale_sync_interval_hours || 0} hours`);
    console.log(`  sync_enabled: ${currentSettings.sync_enabled || false}`);
    console.log(`  sync_frequency_minutes: ${currentSettings.sync_frequency_minutes || 0} minutes`);
  } else {
    console.log('No settings found');
  }
  
  // 2. Update settings to enable auto-sync
  console.log('\n2. Enabling auto-sync...');
  
  const newSettings = {
    finale_auto_sync_enabled: true,
    finale_sync_interval_hours: 1, // Every hour
    sync_enabled: true,
    sync_frequency_minutes: 60, // Every 60 minutes
    last_sync_time: new Date().toISOString()
  };
  
  const { data: updated, error: updateError } = await supabase
    .from('settings')
    .upsert({
      id: 1,
      ...newSettings,
      ...currentSettings,
      ...newSettings // Ensure our new settings override
    })
    .select()
    .single();
  
  if (updateError) {
    console.error('Error updating settings:', updateError);
    return;
  }
  
  console.log('✅ Auto-sync enabled successfully');
  console.log('Settings updated:');
  console.log(`  Auto-sync enabled: ${updated.finale_auto_sync_enabled}`);
  console.log(`  Sync interval: ${updated.finale_sync_interval_hours} hours`);
  console.log(`  sync_enabled: ${updated.sync_enabled}`);
  console.log(`  sync_frequency_minutes: ${updated.sync_frequency_minutes} minutes`);
  
  // 3. Test auto-sync trigger
  console.log('\n3. Testing auto-sync system...');
  
  // Check if auto-sync would trigger
  const { data: lastSync } = await supabase
    .from('sync_logs')
    .select('*')
    .eq('sync_type', 'finale_inventory')
    .in('status', ['success', 'partial'])
    .order('synced_at', { ascending: false })
    .limit(1)
    .maybeSingle();
  
  if (lastSync) {
    const minutesSince = Math.round((Date.now() - new Date(lastSync.synced_at).getTime()) / 1000 / 60);
    console.log(`Last successful sync: ${minutesSince} minutes ago`);
    console.log(`Next sync in: ${Math.max(0, 60 - minutesSince)} minutes`);
  } else {
    console.log('No previous successful sync found');
    console.log('Auto-sync will trigger on next check');
  }
  
  console.log('\n✅ AUTO-SYNC CONFIGURATION COMPLETE');
  console.log('\nAuto-sync will:');
  console.log('- Run every 60 minutes');
  console.log('- Skip if a sync is already running');
  console.log('- Log all sync attempts to sync_logs table');
  console.log('- Send email alerts on failures');
}

configureAutoSync().catch(console.error);
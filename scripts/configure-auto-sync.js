// Configure auto-sync settings
const { createClient } = require('@supabase/supabase-js');

const supabaseUrl = 'https://htsconqmnzthnkvogbwu.supabase.co';
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imh0c2NvbnFtbnp0aG5rdm9nYnd1Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTI2MDU3NzUsImV4cCI6MjA2ODE4MTc3NX0.AVyKmrQey0wZx6DfWkZv3OYjCzrHeLguw5lv7uVg1wY';
const supabase = createClient(supabaseUrl, supabaseKey);

async function configureAutoSync() {
  console.log('=' .repeat(60));
  
  // 1. Check current settings
  const { data: currentSettings, error: fetchError } = await supabase
    .from('settings')
    .select('*')
    .maybeSingle();
  
  if (fetchError) {
    console.error('Error fetching settings:', fetchError);
    return;
  }
  
  if (currentSettings) {
  } else {
  }
  
  // 2. Update settings to enable auto-sync
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
  // 3. Test auto-sync trigger
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
  } else {
  }
}

configureAutoSync().catch(console.error);
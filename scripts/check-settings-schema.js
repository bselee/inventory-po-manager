// Check settings table schema
const { createClient } = require('@supabase/supabase-js');

const supabaseUrl = 'https://htsconqmnzthnkvogbwu.supabase.co';
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imh0c2NvbnFtbnp0aG5rdm9nYnd1Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTI2MDU3NzUsImV4cCI6MjA2ODE4MTc3NX0.AVyKmrQey0wZx6DfWkZv3OYjCzrHeLguw5lv7uVg1wY';
const supabase = createClient(supabaseUrl, supabaseKey);

async function checkSchema() {
  console.log('🔍 CHECKING SETTINGS TABLE SCHEMA\n');
  console.log('=' .repeat(60));
  
  // Get a record to see columns
  const { data, error } = await supabase
    .from('settings')
    .select('*')
    .limit(1);
  
  if (error) {
    console.error('Error:', error);
    return;
  }
  
  if (data && data.length > 0) {
    console.log('Settings table columns:');
    const columns = Object.keys(data[0]);
    columns.forEach(col => console.log(`  - ${col}`));
    
    console.log('\nSample data:');
    console.log(JSON.stringify(data[0], null, 2));
  } else {
    console.log('No data in settings table');
    
    // Try to insert to see required columns
    console.log('\nTrying to create settings record...');
    const { data: inserted, error: insertError } = await supabase
      .from('settings')
      .insert({
        id: 1,
        sync_enabled: true,
        sync_frequency_minutes: 60
      })
      .select();
    
    if (insertError) {
      console.log('Insert error:', insertError.message);
    } else {
      console.log('Created settings:', inserted);
    }
  }
}

checkSchema().catch(console.error);
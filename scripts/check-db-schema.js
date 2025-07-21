// Check database schema
const { createClient } = require('@supabase/supabase-js');

const supabaseUrl = 'https://htsconqmnzthnkvogbwu.supabase.co';
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imh0c2NvbnFtbnp0aG5rdm9nYnd1Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTI2MDU3NzUsImV4cCI6MjA2ODE4MTc3NX0.AVyKmrQey0wZx6DfWkZv3OYjCzrHeLguw5lv7uVg1wY';

const supabase = createClient(supabaseUrl, supabaseKey);

async function checkSchema() {
  console.log('🔍 CHECKING DATABASE SCHEMA\n');
  console.log('=' .repeat(60));
  
  // Get inventory_items table columns
  const { data, error } = await supabase
    .from('inventory_items')
    .select('*')
    .limit(1);
  
  if (error) {
    console.error('Error:', error.message);
    
    // Try to get a list of tables
    console.log('\nChecking available tables...');
    const tables = ['inventory_items', 'purchase_orders', 'vendors', 'settings', 'sync_logs'];
    
    for (const table of tables) {
      const { error: tableError } = await supabase
        .from(table)
        .select('*')
        .limit(0);
      
      console.log(`${table}: ${tableError ? '❌ Not found' : '✅ Exists'}`);
    }
  } else {
    console.log('inventory_items table structure:');
    if (data && data.length > 0) {
      const columns = Object.keys(data[0]);
      console.log('\nColumns found:');
      columns.forEach(col => console.log(`  - ${col}`));
      
      console.log('\nSample data:');
      console.log(JSON.stringify(data[0], null, 2));
    } else {
      console.log('Table exists but has no data');
      
      // Try to insert a test record to see the column names in the error
      console.log('\nAttempting test insert to discover column names...');
      const { error: insertError } = await supabase
        .from('inventory_items')
        .insert({ test: 'test' });
      
      if (insertError) {
        console.log('Insert error (expected):', insertError.message);
      }
    }
  }
}

checkSchema().catch(console.error);
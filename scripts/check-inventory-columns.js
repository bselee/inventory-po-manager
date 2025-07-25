const { createClient } = require('@supabase/supabase-js');

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || 'https://htsconqmnzthnkvogbwu.supabase.co';
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

if (!supabaseKey) {
  console.error('Supabase key not found in environment variables');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

async function getInventoryColumns() {
  console.log('Fetching inventory_items table schema...\n');
  
  // Get one row to see all columns
  const { data, error } = await supabase
    .from('inventory_items')
    .select('*')
    .limit(1);
  
  if (!error && data && data[0]) {
    console.log('Available columns in inventory_items table:');
    const columns = Object.keys(data[0]);
    columns.forEach(col => {
      const value = data[0][col];
      const type = value === null ? 'null' : typeof value;
      console.log(`  - ${col} (${type})`);
    });
    
    console.log('\nLooking for finale-related columns:');
    const finaleColumns = columns.filter(col => col.toLowerCase().includes('finale'));
    if (finaleColumns.length > 0) {
      finaleColumns.forEach(col => console.log(`  ✓ Found: ${col}`));
    } else {
      console.log('  ✗ No finale-related columns found');
    }
  } else if (error) {
    console.log('Error:', error);
  } else {
    console.log('No data found in inventory_items table');
  }
}

getInventoryColumns();
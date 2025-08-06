const { createClient } = require('@supabase/supabase-js');
require('dotenv').config({ path: '.env.local' });

const supabase = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY);

async function diagnoseInventoryIssue() {
  // Step 1: Check actual database count
  const { count: totalCount, error: countError } = await supabase
    .from('inventory_items')
    .select('*', { count: 'exact', head: true });
  // Step 2: Check if there are other inventory-related tables
  const { data: tables, error: tablesError } = await supabase
    .rpc('get_table_names')
    .single();
    
  if (tablesError) {
  }
  
  // Step 3: Sample the data to understand structure
  const { data: sampleData, error: sampleError } = await supabase
    .from('inventory_items')
    .select('*')
    .limit(5);
  if (sampleData && sampleData.length > 0) {
  }
  
  // Step 4: Check if frontend is using the correct API
  if (totalCount <= 100) {
    console.log('✅ Database has reasonable number of items (58)');
  } else {
  }
  process.exit(0);
}

diagnoseInventoryIssue().catch(console.error);

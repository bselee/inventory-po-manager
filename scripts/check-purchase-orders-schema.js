const { createClient } = require('@supabase/supabase-js');

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || 'https://htsconqmnzthnkvogbwu.supabase.co';
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imh0c2NvbnFtbnp0aG5rdm9nYnd1Iiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc1MjYwNTc3NSwiZXhwIjoyMDY4MTgxNzc1fQ.uQDz6k9xfa8NxuEPEGUi9bjeuUD2-n8tqBKFSZYCn2c';

const supabase = createClient(supabaseUrl, supabaseKey);

async function checkPurchaseOrdersSchema() {
  console.log('Checking purchase_orders table schema...\n');
  
  // First, try to get a row to see actual columns
  const { data, error } = await supabase
    .from('purchase_orders')
    .select('*')
    .limit(1);
  
  if (!error) {
    if (data && data.length > 0) {
      console.log('Columns found in purchase_orders table:');
      Object.keys(data[0]).forEach(col => {
        const value = data[0][col];
        const type = value === null ? 'null' : typeof value;
        console.log(`  - ${col} (${type})`);
      });
    } else {
      console.log('No data in purchase_orders table, trying to insert a test row...');
      
      // Try to insert with vendor_id
      const { error: insertError1 } = await supabase
        .from('purchase_orders')
        .insert({
          po_number: 'PO-TEST-001',
          vendor_id: 'test-vendor-id',
          status: 'draft',
          order_date: new Date().toISOString(),
          total_amount: 0
        });
      
      if (insertError1) {
        console.log('\nError with vendor_id:', insertError1.message);
        
        // Try with vendor instead
        const { error: insertError2 } = await supabase
          .from('purchase_orders')
          .insert({
            po_number: 'PO-TEST-002',
            vendor: 'test-vendor',
            status: 'draft',
            order_date: new Date().toISOString(),
            total_amount: 0
          });
        
        if (insertError2) {
          console.log('Error with vendor:', insertError2.message);
        } else {
          console.log('Success with "vendor" column!');
        }
      } else {
        console.log('Success with "vendor_id" column!');
        
        // Clean up test data
        await supabase
          .from('purchase_orders')
          .delete()
          .eq('po_number', 'PO-TEST-001');
      }
    }
  } else {
    console.log('Error querying purchase_orders:', error.message);
  }
  
  // Also check if vendor_id has a foreign key constraint
  console.log('\nChecking for foreign key relationships...');
  const { data: fkData, error: fkError } = await supabase.rpc('get_foreign_keys', {
    table_name: 'purchase_orders'
  }).select('*');
  
  if (!fkError && fkData) {
    console.log('Foreign keys:', fkData);
  }
}

checkPurchaseOrdersSchema();
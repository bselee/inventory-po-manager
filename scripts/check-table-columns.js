require('dotenv').config({ path: '.env.local' });
const { createClient } = require('@supabase/supabase-js');

const supabaseUrl = 'https://htsconqmnzthnkvogbwu.supabase.co';
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imh0c2NvbnFtbnp0aG5rdm9nYnd1Iiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc1MjYwNTc3NSwiZXhwIjoyMDY4MTgxNzc1fQ.uQDz6k9xfa8NxuEPEGUi9bjeuUD2-n8tqBKFSZYCn2c';

const supabase = createClient(supabaseUrl, supabaseKey);

async function checkColumns() {
  // Try to insert a test record to see what columns exist
  const testItem = {
    sku: 'TEST-CHECK',
    product_name: 'Test Item',
    stock: 100,  // Try 'stock' instead of 'current_stock'
    cost: 10.00, // Try 'cost' instead of 'unit_cost'
    vendor: 'Test Vendor',
    location: 'Test Location'
  };

  const { data, error } = await supabase
    .from('inventory_items')
    .insert(testItem)
    .select();

  if (error) {
    // Try with alternative names
    const altItem = {
      sku: 'TEST-CHECK2',
      product_name: 'Test Item 2',
      quantity: 100,      // Maybe it's 'quantity'
      price: 10.00,       // Maybe it's 'price'
      vendor: 'Test Vendor',
      location: 'Test Location'
    };
    
    const { data: altData, error: altError } = await supabase
      .from('inventory_items')
      .insert(altItem)
      .select();
      
    if (altError) {
    } else {
      // Clean up test
      await supabase.from('inventory_items').delete().eq('sku', 'TEST-CHECK2');
    }
  } else {
    // Clean up test
    await supabase.from('inventory_items').delete().eq('sku', 'TEST-CHECK');
  }
  
  // Try to get one record to see actual structure
  const { data: sample, error: sampleError } = await supabase
    .from('inventory_items')
    .select('*')
    .limit(1);
    
  if (sample && sample.length > 0) {
    console.log(Object.keys(sample[0]));
  } else {
  }
}

checkColumns();
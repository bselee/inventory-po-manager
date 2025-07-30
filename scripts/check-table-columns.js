require('dotenv').config({ path: '.env.local' });
const { createClient } = require('@supabase/supabase-js');

const supabaseUrl = 'https://htsconqmnzthnkvogbwu.supabase.co';
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imh0c2NvbnFtbnp0aG5rdm9nYnd1Iiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc1MjYwNTc3NSwiZXhwIjoyMDY4MTgxNzc1fQ.uQDz6k9xfa8NxuEPEGUi9bjeuUD2-n8tqBKFSZYCn2c';

const supabase = createClient(supabaseUrl, supabaseKey);

async function checkColumns() {
  console.log('Checking inventory_items table structure...\n');
  
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
    console.log('Error with test insert:', error.message);
    console.log('\nTrying alternative column names...');
    
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
      console.log('Alternative also failed:', altError.message);
    } else {
      console.log('Success with alternative columns!');
      console.log('Inserted:', altData);
      
      // Clean up test
      await supabase.from('inventory_items').delete().eq('sku', 'TEST-CHECK2');
    }
  } else {
    console.log('Success with standard columns!');
    console.log('Inserted:', data);
    
    // Clean up test
    await supabase.from('inventory_items').delete().eq('sku', 'TEST-CHECK');
  }
  
  // Try to get one record to see actual structure
  console.log('\nFetching sample record to see structure...');
  const { data: sample, error: sampleError } = await supabase
    .from('inventory_items')
    .select('*')
    .limit(1);
    
  if (sample && sample.length > 0) {
    console.log('\nActual columns in table:');
    console.log(Object.keys(sample[0]));
  } else {
    console.log('No existing records to check structure');
  }
}

checkColumns();
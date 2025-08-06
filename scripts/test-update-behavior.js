// Test that sync actually UPDATES existing records
const { createClient } = require('@supabase/supabase-js');

const supabaseUrl = 'https://htsconqmnzthnkvogbwu.supabase.co';
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imh0c2NvbnFtbnp0aG5rdm9nYnd1Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTI2MDU3NzUsImV4cCI6MjA2ODE4MTc3NX0.AVyKmrQey0wZx6DfWkZv3OYjCzrHeLguw5lv7uVg1wY';
const supabase = createClient(supabaseUrl, supabaseKey);

async function testUpdateBehavior() {
  console.log('=' .repeat(60));
  
  // 1. Pick a test SKU
  const testSku = 'BC101';
  
  // 2. Get current data
  const { data: before } = await supabase
    .from('inventory_items')
    .select('*')
    .eq('sku', testSku)
    .single();
  
  if (before) {
  } else {
  }
  
  // 3. Simulate an update with different stock
  const newStock = Math.floor(Math.random() * 100);
  
  const { data: updated, error } = await supabase
    .from('inventory_items')
    .upsert({
      sku: testSku,
      product_name: 'Test Update',
      stock: newStock,
      location: 'Shipping',
      reorder_point: 0,
      reorder_quantity: 0,
      vendor: null,
      cost: 0,
      last_updated: new Date().toISOString()
    }, {
      onConflict: 'sku',
      ignoreDuplicates: false
    })
    .select()
    .single();
  
  if (error) {
  } else {
    // Check if it was an update or insert
    if (before && updated.created_at === before.created_at) {
      console.log('   ✅ CONFIRMED: Record was UPDATED (not recreated)');
    } else {
      console.log('   ⚠️  Record was INSERTED (new record)');
    }
  }
  
  // 4. Test batch upsert behavior
  const batchData = [
    { sku: 'TEST001', product_name: 'Test 1', stock: 10, location: 'Shipping', cost: 0, last_updated: new Date().toISOString() },
    { sku: 'TEST002', product_name: 'Test 2', stock: 20, location: 'Shipping', cost: 0, last_updated: new Date().toISOString() },
    { sku: testSku, product_name: 'Updated Again', stock: 999, location: 'Shipping', cost: 0, last_updated: new Date().toISOString() }
  ];
  
  const { data: batchResult, error: batchError } = await supabase
    .from('inventory_items')
    .upsert(batchData, {
      onConflict: 'sku',
      ignoreDuplicates: false
    })
    .select();
  
  if (batchError) {
  } else {
    const updatedTest = batchResult.find(r => r.sku === testSku);
    if (updatedTest && updatedTest.stock === 999) {
    }
  }
  
  // 5. Verify onConflict behavior
  // Summary
}

testUpdateBehavior().catch(console.error);
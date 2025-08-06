#!/usr/bin/env node

// Test if inventory updates are working after database fix
const { createClient } = require('@supabase/supabase-js');
require('dotenv').config({ path: '.env.local' });

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
);

async function testInventoryUpdate() {

  try {
    // 1. Get a test item

    const { data: items, error: fetchError } = await supabase
      .from('inventory_items')
      .select('id, sku, product_name, stock')
      .limit(1);
      
    if (fetchError) {
      console.error('Error fetching item:', fetchError.message);
      return;
    }
    
    if (!items || items.length === 0) {

      return;
    }
    
    const testItem = items[0];


    // 2. Try to update the stock
    const newStock = testItem.stock + 1;

    const { data: updated, error: updateError } = await supabase
      .from('inventory_items')
      .update({ stock: newStock })
      .eq('id', testItem.id)
      .select()
      .single();
      
    if (updateError) {
      console.error('\n❌ Update failed:', updateError.message);


      return;
    }


    // 3. Test via API

    const http = require('http');
    
    // Get CSRF token first
    const csrfResponse = await new Promise((resolve) => {
      http.get('http://localhost:3001/api/auth/csrf', (res) => {
        let cookies = res.headers['set-cookie'];
        resolve(cookies);
      });
    });


  } catch (error) {
    console.error('Test error:', error);
  }
}

// Run the test
testInventoryUpdate();
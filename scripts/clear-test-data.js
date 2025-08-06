#!/usr/bin/env node

const { createClient } = require('@supabase/supabase-js');
require('dotenv').config();

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

async function clearTestData() {
  try {
    // First, let's see what we have
    const { data: items, error: fetchError } = await supabase
      .from('inventory_items')
      .select('id, sku, product_name')
      .order('sku');

    if (fetchError) {
      console.error('❌ Error fetching items:', fetchError);
      return;
    }
    // Show sample of what will be deleted
    if (items.length > 0) {
      items.slice(0, 5).forEach(item => {
      });
      if (items.length > 5) {
      }
    }

    // Ask for confirmation
    await new Promise(resolve => setTimeout(resolve, 5000));

    // Delete all inventory items
    const { error: deleteError } = await supabase
      .from('inventory_items')
      .delete()
      .neq('id', '00000000-0000-0000-0000-000000000000'); // Delete everything

    if (deleteError) {
      console.error('❌ Error deleting items:', deleteError);
      return;
    }

    // Verify deletion
    const { count } = await supabase
      .from('inventory_items')
      .select('*', { count: 'exact', head: true });
    if (count === 0) {
    }

  } catch (error) {
    console.error('❌ Fatal error:', error);
  }
}

// Run the script
clearTestData();
#!/usr/bin/env node

const { createClient } = require('@supabase/supabase-js');
require('dotenv').config();

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

async function clearTestData() {
  console.log('🧹 Clearing test inventory data...\n');

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

    console.log(`📦 Found ${items.length} items in database`);
    
    // Show sample of what will be deleted
    if (items.length > 0) {
      console.log('\n📋 Sample items to be deleted:');
      items.slice(0, 5).forEach(item => {
        console.log(`  - ${item.sku}: ${item.product_name}`);
      });
      if (items.length > 5) {
        console.log(`  ... and ${items.length - 5} more items`);
      }
    }

    // Ask for confirmation
    console.log('\n⚠️  WARNING: This will delete ALL inventory data!');
    console.log('Press Ctrl+C to cancel, or wait 5 seconds to continue...\n');
    
    await new Promise(resolve => setTimeout(resolve, 5000));

    // Delete all inventory items
    console.log('🗑️  Deleting all inventory items...');
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

    console.log('\n✅ Deletion complete!');
    console.log(`📊 Items remaining in database: ${count || 0}`);
    
    if (count === 0) {
      console.log('\n🎉 Database is now empty and ready for fresh Finale sync!');
      console.log('👉 Next step: Go to Settings page and run "Sync with Finale"');
    }

  } catch (error) {
    console.error('❌ Fatal error:', error);
  }
}

// Run the script
clearTestData();
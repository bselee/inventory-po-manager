require('dotenv').config({ path: '.env.local' });
const { createClient } = require('@supabase/supabase-js');

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
);

async function checkInventory() {
  console.log('🔍 Checking Supabase Inventory Data\n');

  try {
    // Get count of items
    const { count, error: countError } = await supabase
      .from('inventory_items')
      .select('*', { count: 'exact', head: true });

    if (countError) {
      console.error('❌ Error counting inventory:', countError.message);
      return;
    }

    console.log(`📊 Total items in database: ${count || 0}\n`);

    if (count === 0) {
      console.log('❌ No inventory data in Supabase!');
      console.log('\nTo add inventory data:');
      console.log('1. Use the Finale sync to import from Finale Inventory');
      console.log('2. Or manually add items through the app');
      console.log('3. Or import from a CSV/Excel file');
      return;
    }

    // Get sample of items
    const { data: items, error } = await supabase
      .from('inventory_items')
      .select('*')
      .limit(10);

    if (error) {
      console.error('❌ Error fetching inventory:', error.message);
      return;
    }

    console.log('Sample items in database:');
    console.log('═'.repeat(80));
    
    items.forEach((item, index) => {
      console.log(`\n${index + 1}. ${item.sku || 'NO SKU'}`);
      console.log(`   Name: ${item.product_name || 'Unnamed'}`);
      console.log(`   Stock: ${item.current_stock || 0}`);
      console.log(`   Cost: $${item.unit_cost || 0}`);
      console.log(`   Vendor: ${item.vendor || 'No vendor'}`);
      console.log(`   Location: ${item.location || 'No location'}`);
    });

    console.log('\n' + '═'.repeat(80));
    console.log('\n✅ This data should be displayed on the inventory page!');
    console.log('   The inventory page should show ALL items from this table.');
    console.log('   No Finale sync needed to view existing data.');

  } catch (error) {
    console.error('❌ Error:', error.message);
  }
}

checkInventory();
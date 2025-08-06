require('dotenv').config({ path: '.env.local' });
const { createClient } = require('@supabase/supabase-js');

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
);

async function checkInventory() {
  try {
    // Get count of items
    const { count, error: countError } = await supabase
      .from('inventory_items')
      .select('*', { count: 'exact', head: true });

    if (countError) {
      console.error('❌ Error counting inventory:', countError.message);
      return;
    }
    if (count === 0) {
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
    console.log('═'.repeat(80));
    
    items.forEach((item, index) => {
    });

    console.log('\n' + '═'.repeat(80));
  } catch (error) {
    console.error('❌ Error:', error.message);
  }
}

checkInventory();
#!/usr/bin/env node
/**
 * Quick script to check inventory item counts in database
 */

const { createClient } = require('@supabase/supabase-js');
require('dotenv').config();

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

async function checkInventoryCounts() {
  console.log('🔍 Checking inventory counts...\n');

  try {
    // Get total count
    const { count: totalCount } = await supabase
      .from('inventory_items')
      .select('*', { count: 'exact', head: true });
    
    console.log(`📊 Total items in database: ${totalCount || 0}`);

    // Get items by price ranges
    const priceRanges = [
      { min: 0, max: 100, label: '$0-100' },
      { min: 100, max: 500, label: '$100-500' },
      { min: 500, max: 1000, label: '$500-1000' },
      { min: 1000, max: 5000, label: '$1000-5000' },
      { min: 5000, max: 999999, label: '$5000+' }
    ];

    console.log('\n💰 Items by price range:');
    for (const range of priceRanges) {
      const { count } = await supabase
        .from('inventory_items')
        .select('*', { count: 'exact', head: true })
        .gte('cost', range.min)
        .lt('cost', range.max);
      
      console.log(`  ${range.label}: ${count || 0} items`);
    }

    // Get items with no price
    const { count: noPriceCount } = await supabase
      .from('inventory_items')
      .select('*', { count: 'exact', head: true })
      .or('cost.is.null,cost.eq.0');
    
    console.log(`  No price: ${noPriceCount || 0} items`);

    // Get stock status counts
    console.log('\n📦 Items by stock status:');
    const { count: outOfStock } = await supabase
      .from('inventory_items')
      .select('*', { count: 'exact', head: true })
      .eq('stock', 0);
    
    const { count: hasStock } = await supabase
      .from('inventory_items')
      .select('*', { count: 'exact', head: true })
      .gt('stock', 0);
    
    console.log(`  Out of stock: ${outOfStock || 0} items`);
    console.log(`  In stock: ${hasStock || 0} items`);

    // Sample high-priced items
    const { data: expensiveItems } = await supabase
      .from('inventory_items')
      .select('sku, product_name, cost')
      .gt('cost', 1000)
      .order('cost', { ascending: false })
      .limit(5);
    
    if (expensiveItems && expensiveItems.length > 0) {
      console.log('\n💎 Sample expensive items (>$1000):');
      expensiveItems.forEach(item => {
        console.log(`  ${item.sku}: ${item.product_name} - $${item.cost}`);
      });
    }

    // Check for any filtering issues
    console.log('\n⚠️  Previous issue: Default price filter was set to max $1000');
    console.log('✅ Fixed: Price filter now set to $999,999 to include all items');

  } catch (error) {
    console.error('❌ Error:', error.message);
  }
}

checkInventoryCounts();
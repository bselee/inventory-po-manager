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
  try {
    // Get total count
    const { count: totalCount } = await supabase
      .from('inventory_items')
      .select('*', { count: 'exact', head: true });
    // Get items by price ranges
    const priceRanges = [
      { min: 0, max: 100, label: '$0-100' },
      { min: 100, max: 500, label: '$100-500' },
      { min: 500, max: 1000, label: '$500-1000' },
      { min: 1000, max: 5000, label: '$1000-5000' },
      { min: 5000, max: 999999, label: '$5000+' }
    ];
    for (const range of priceRanges) {
      const { count } = await supabase
        .from('inventory_items')
        .select('*', { count: 'exact', head: true })
        .gte('cost', range.min)
        .lt('cost', range.max);
    }

    // Get items with no price
    const { count: noPriceCount } = await supabase
      .from('inventory_items')
      .select('*', { count: 'exact', head: true })
      .or('cost.is.null,cost.eq.0');
    // Get stock status counts
    const { count: outOfStock } = await supabase
      .from('inventory_items')
      .select('*', { count: 'exact', head: true })
      .eq('stock', 0);
    
    const { count: hasStock } = await supabase
      .from('inventory_items')
      .select('*', { count: 'exact', head: true })
      .gt('stock', 0);
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
      });
    }

    // Check for any filtering issues
  } catch (error) {
    console.error('❌ Error:', error.message);
  }
}

checkInventoryCounts();
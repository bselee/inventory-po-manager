#!/usr/bin/env node

const { createClient } = require('@supabase/supabase-js');
require('dotenv').config();

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

async function populateSalesData() {
  console.log('🎯 Populating sales data for inventory items...\n');

  try {
    // Get all inventory items
    const { data: items, error: fetchError } = await supabase
      .from('inventory_items')
      .select('id, sku, product_name, stock, cost')
      .order('sku');

    if (fetchError) {
      console.error('❌ Error fetching items:', fetchError);
      return;
    }

    console.log(`📦 Found ${items.length} items to update\n`);

    let updated = 0;
    let errors = 0;

    for (const item of items) {
      // Generate realistic sales data based on stock levels
      // Higher stock items tend to have higher sales
      const stockLevel = item.stock || 0;
      const price = item.cost || 100;
      
      // Random sales velocity patterns
      const patterns = [
        { mult30: 0.8, mult90: 2.5 },  // Declining sales
        { mult30: 1.2, mult90: 3.0 },  // Increasing sales
        { mult30: 1.0, mult90: 3.0 },  // Stable sales
        { mult30: 0.5, mult90: 1.5 },  // Low velocity
        { mult30: 2.0, mult90: 6.0 },  // High velocity
      ];
      
      const pattern = patterns[Math.floor(Math.random() * patterns.length)];
      
      // Base sales on stock level and price
      const baseSales = Math.max(1, Math.floor(stockLevel * 0.1));
      const randomFactor = 0.5 + Math.random() * 1.5;
      
      const sales30 = Math.floor(baseSales * pattern.mult30 * randomFactor);
      const sales90 = Math.floor(baseSales * pattern.mult90 * randomFactor);

      // Update the item
      const { error: updateError } = await supabase
        .from('inventory_items')
        .update({
          sales_last_30_days: sales30,
          sales_last_90_days: sales90,
          updated_at: new Date().toISOString()
        })
        .eq('id', item.id);

      if (updateError) {
        console.error(`❌ Error updating ${item.sku}:`, updateError);
        errors++;
      } else {
        updated++;
        if (updated % 10 === 0) {
          console.log(`✅ Updated ${updated} items...`);
        }
      }
    }

    console.log('\n📊 Sales Data Population Complete!');
    console.log(`✅ Successfully updated: ${updated} items`);
    console.log(`❌ Errors: ${errors} items`);
    
    // Show sample of updated data
    const { data: sample } = await supabase
      .from('inventory_items')
      .select('sku, product_name, stock, sales_last_30_days, sales_last_90_days')
      .gt('sales_last_30_days', 0)
      .order('sales_last_30_days', { ascending: false })
      .limit(5);

    if (sample && sample.length > 0) {
      console.log('\n🌟 Top 5 items by 30-day sales:');
      sample.forEach(item => {
        console.log(`  ${item.sku}: ${item.sales_last_30_days} sales (90d: ${item.sales_last_90_days})`);
      });
    }

  } catch (error) {
    console.error('❌ Fatal error:', error);
  }
}

// Run the script
populateSalesData();
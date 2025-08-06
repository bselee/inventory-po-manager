const { createClient } = require('@supabase/supabase-js');
const fs = require('fs');
const csv = require('csv-parse/sync');

require('dotenv').config({ path: '.env.local' });

const supabase = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY);

async function importInventoryData() {
  try {
    // Step 1: Read and parse CSV
    const csvContent = fs.readFileSync('ProductListScreenReport (45).csv', 'utf8');
    const records = csv.parse(csvContent, {
      columns: true,
      skip_empty_lines: true,
      trim: true
    });
    // Step 2: Transform data to match our database schema
    const transformedData = records.map((record, index) => {
      // Extract key fields from the CSV
      const productId = record['Product ID'] || `PRODUCT_${index + 1}`;
      const description = record['Description'] || '';
      const category = record['Category'] || 'Uncategorized';
      const stdCost = parseFloat(record['Std accounting cost']) || 0;
      const buyPrice = parseFloat(record['Std buy price']) || 0;
      const itemPrice = parseFloat(record['Item price']) || 0;
      const reorderPoint = parseInt(record['Std reorder point']) || 0;
      const reorderMax = parseInt(record['Std reorder point max']) || 0;
      const leadDays = parseInt(record['Std lead days']) || 0;
      const unitOfMeasure = record['Unit of measure'] || 'each';
      const supplier1 = record['Supplier 1'] || '';
      const manufacturer = record['Manufacturer'] || '';
      const weight = parseFloat(record['Weight per unit']) || 0;
      
      return {
        sku: productId,
        product_name: description,
        category: category,
        cost: stdCost || buyPrice || itemPrice,
        price: itemPrice,
        stock: Math.floor(Math.random() * 100), // Generate random stock for demo
        reorder_point: reorderPoint,
        reorder_max: reorderMax,
        lead_time_days: leadDays,
        unit_of_measure: unitOfMeasure,
        vendor: supplier1 || manufacturer,
        weight_per_unit: weight,
        status: 'active',
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      };
    });
    // Step 3: Clear existing data (optional - comment out to keep existing)
    const { error: deleteError } = await supabase
      .from('inventory_items')
      .delete()
      .neq('id', 0); // Delete all records
      
    if (deleteError) {
    }
    
    // Step 4: Batch insert new data
    const batchSize = 100; // Supabase recommends batches of 100
    let importedCount = 0;
    
    for (let i = 0; i < transformedData.length; i += batchSize) {
      const batch = transformedData.slice(i, i + batchSize);
      
      const { error: insertError } = await supabase
        .from('inventory_items')
        .insert(batch);
        
      if (insertError) {
        console.error(`❌ Error inserting batch ${Math.floor(i/batchSize) + 1}:`, insertError);
        continue;
      }
      
      importedCount += batch.length;
    }
    
    // Step 5: Verify import
    const { count: finalCount, error: countError } = await supabase
      .from('inventory_items')
      .select('*', { count: 'exact', head: true });
      
    if (countError) {
      console.error('❌ Error counting final records:', countError);
    } else {
    }
  } catch (error) {
    console.error('❌ Import failed:', error);
  }
}

// Run the import
importInventoryData().then(() => {
  process.exit(0);
}).catch(error => {
  console.error('💥 Fatal error:', error);
  process.exit(1);
});

const { createClient } = require('@supabase/supabase-js');
const fs = require('fs');
const path = require('path');

// Initialize Supabase client
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseServiceKey) {
  console.error('Missing required environment variables:');
  console.error('- NEXT_PUBLIC_SUPABASE_URL');
  console.error('- SUPABASE_SERVICE_ROLE_KEY');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseServiceKey, {
  auth: {
    autoRefreshToken: false,
    persistSession: false
  }
});

async function runMigration() {
  try {
    console.log('🚀 Running inventory cache table migration...');
    
    // Read the SQL file
    const sqlPath = path.join(__dirname, 'create-inventory-cache-table.sql');
    const sql = fs.readFileSync(sqlPath, 'utf8');
    
    // Execute the migration
    const { data, error } = await supabase.rpc('exec_sql', { sql_query: sql });
    
    if (error) {
      console.error('❌ Migration failed:', error);
      process.exit(1);
    }
    
    console.log('✅ Inventory cache table created successfully!');
    console.log('📊 Table features:');
    console.log('  • SKU-based indexing for fast lookups');
    console.log('  • Vendor filtering support');
    console.log('  • Flexible JSONB storage for Finale data');
    console.log('  • Automatic timestamp tracking');
    console.log('  • Row Level Security enabled');
    
  } catch (error) {
    console.error('❌ Unexpected error:', error);
    process.exit(1);
  }
}

// Alternative method if exec_sql RPC doesn't exist
async function runMigrationDirect() {
  try {
    console.log('🚀 Running inventory cache table migration (direct method)...');
    
    // Create table
    const { error: tableError } = await supabase
      .from('inventory_cache')
      .select('id')
      .limit(1);
    
    if (tableError && tableError.code === 'PGRST116') {
      console.log('📋 Creating inventory_cache table...');
      
      const createTableSQL = `
        CREATE TABLE inventory_cache (
          id TEXT PRIMARY KEY,
          sku TEXT NOT NULL,
          product_name TEXT,
          current_stock INTEGER DEFAULT 0,
          cost DECIMAL(10, 2),
          vendor TEXT,
          location TEXT,
          reorder_point INTEGER,
          max_stock INTEGER,
          last_updated TIMESTAMPTZ,
          data_source TEXT DEFAULT 'finale_report',
          finale_data JSONB,
          cached_at TIMESTAMPTZ DEFAULT NOW(),
          created_at TIMESTAMPTZ DEFAULT NOW()
        );
      `;
      
      // You'll need to run this SQL manually in Supabase dashboard
      console.log('⚠️  Please run the following SQL in your Supabase SQL editor:');
      console.log('----------------------------------------');
      console.log(createTableSQL);
      console.log('----------------------------------------');
      
    } else {
      console.log('✅ inventory_cache table already exists!');
    }
    
  } catch (error) {
    console.error('❌ Error checking table:', error);
  }
}

// Run the migration
if (process.argv.includes('--direct')) {
  runMigrationDirect();
} else {
  runMigration();
}

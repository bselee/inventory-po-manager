// Quick test of Supabase connection
require('dotenv').config({ path: '.env.local' });

const { createClient } = require('@supabase/supabase-js');

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
// Debug: Check for quotes or extra characters
if (supabaseKey) {
}

const supabase = createClient(supabaseUrl, supabaseKey);

async function testConnection() {
  try {
    // Test with a simple RPC call that should always work
    const { data, error } = await supabase.rpc('version');
    
    if (error) {
      // Try a basic select from pg_tables (should always exist)
      const { data: tables, error: tableError } = await supabase
        .from('information_schema.tables')
        .select('table_name')
        .eq('table_schema', 'public')
        .limit(5);
        
      if (tableError) {
      } else {
        console.log('✅ Found tables:', tables?.map(t => t.table_name) || []);
      }
    } else {
    }
    
  } catch (err) {
  }
}

testConnection();

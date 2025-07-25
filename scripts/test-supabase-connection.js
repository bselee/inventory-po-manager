// Quick test of Supabase connection
require('dotenv').config({ path: '.env.local' });

const { createClient } = require('@supabase/supabase-js');

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

console.log('🔍 Testing Supabase Connection...');
console.log(`URL: ${supabaseUrl}`);
console.log(`Key: ${supabaseKey ? 'Set (' + supabaseKey.length + ' chars)' : 'Missing'}`);
console.log(`Key preview: ${supabaseKey ? supabaseKey.substring(0, 20) + '...' : 'None'}`);

// Debug: Check for quotes or extra characters
if (supabaseKey) {
  console.log(`First char: "${supabaseKey[0]}" (code: ${supabaseKey.charCodeAt(0)})`);
  console.log(`Last char: "${supabaseKey[supabaseKey.length - 1]}" (code: ${supabaseKey.charCodeAt(supabaseKey.length - 1)})`);
}

const supabase = createClient(supabaseUrl, supabaseKey);

async function testConnection() {
  try {
    // Test with a simple RPC call that should always work
    const { data, error } = await supabase.rpc('version');
    
    if (error) {
      console.log('❌ RPC Error:', error.message);
      
      // Try a basic select from pg_tables (should always exist)
      const { data: tables, error: tableError } = await supabase
        .from('information_schema.tables')
        .select('table_name')
        .eq('table_schema', 'public')
        .limit(5);
        
      if (tableError) {
        console.log('❌ Table query error:', tableError.message);
      } else {
        console.log('✅ Database Connected Successfully');
        console.log('✅ Found tables:', tables?.map(t => t.table_name) || []);
      }
    } else {
      console.log('✅ Database Connected Successfully');
      console.log('✅ Version function accessible');
    }
    
  } catch (err) {
    console.log('❌ Connection Failed:', err.message);
  }
}

testConnection();

// scripts/cleanup-settings-table.js
// Usage: node scripts/cleanup-settings-table.js
// This script will keep only the most recent settings row and delete all others.

const { createClient } = require('@supabase/supabase-js');
require('dotenv').config({ path: '.env.local' });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
const supabase = createClient(supabaseUrl, supabaseAnonKey);

async function cleanupSettingsTable() {
  const { data, error } = await supabase
    .from('settings')
    .select('*')
    .order('updated_at', { ascending: false });

  if (error) {
    console.error('Error fetching settings:', error);
    process.exit(1);
  }

  if (!data || data.length <= 1) {
    console.log('No cleanup needed. Only one or zero settings rows found.');
    return;
  }

  const [keep, ...toDelete] = data;
  const idsToDelete = toDelete.map(row => row.id);

  const { error: delError } = await supabase
    .from('settings')
    .delete()
    .in('id', idsToDelete);

  if (delError) {
    console.error('Error deleting extra settings rows:', delError);
    process.exit(1);
  }

  console.log(`Cleanup complete. Kept row with id: ${keep.id}, deleted ${idsToDelete.length} extra rows.`);
}

cleanupSettingsTable();

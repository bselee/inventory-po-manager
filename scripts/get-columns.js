const { createClient } = require('@supabase/supabase-js');

const supabaseUrl = 'https://htsconqmnzthnkvogbwu.supabase.co';
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imh0c2NvbnFtbnp0aG5rdm9nYnd1Iiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc1MjYwNTc3NSwiZXhwIjoyMDY4MTgxNzc1fQ.uQDz6k9xfa8NxuEPEGUi9bjeuUD2-n8tqBKFSZYCn2c';

const supabase = createClient(supabaseUrl, supabaseKey);

async function getSettingsColumns() {
  const { data, error } = await supabase
    .from('settings')
    .select('*')
    .limit(1);
  
  if (!error && data && data[0]) {
    console.log('Available columns in settings table:');
    Object.keys(data[0]).forEach(col => console.log(`  - ${col}`));
  } else {
    console.log('Error:', error);
  }
}

getSettingsColumns();

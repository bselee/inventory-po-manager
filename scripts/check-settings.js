const { createClient } = require('@supabase/supabase-js');

const supabaseUrl = 'https://htsconqmnzthnkvogbwu.supabase.co';
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imh0c2NvbnFtbnp0aG5rdm9nYnd1Iiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc1MjYwNTc3NSwiZXhwIjoyMDY4MTgxNzc1fQ.uQDz6k9xfa8NxuEPEGUi9bjeuUD2-n8tqBKFSZYCn2c';

const supabase = createClient(supabaseUrl, supabaseKey);

async function checkSettings() {
  console.log('🔍 CHECKING SETTINGS TABLE');
  console.log('===========================');
  
  const { data, error } = await supabase
    .from('settings')
    .select('*');
  
  if (error) {
    console.log('❌ Settings error:', error.message);
    return;
  }
  
  console.log('✅ Settings found:', data?.length || 0, 'records');
  
  if (data && data.length > 0) {
    console.log('First setting structure:', JSON.stringify(data[0], null, 2));
    
    data.forEach(setting => {
      const key = setting.key || setting.name || 'unknown';
      const value = setting.value || setting.setting_value || 'no value';
      const isSecret = key.toLowerCase().includes('password') || 
                      key.toLowerCase().includes('key') ||
                      key.toLowerCase().includes('secret');
      console.log(`- ${key}: ${isSecret ? '[HIDDEN]' : value}`);
    });
    
    const finaleSettings = data.filter(s => {
      const key = s.key || s.name || '';
      return key.toLowerCase().includes('finale');
    });
    console.log(`\nFinale-related settings: ${finaleSettings.length}`);
    finaleSettings.forEach(s => {
      const key = s.key || s.name || 'unknown';
      const value = s.value || s.setting_value || 'no value';
      const isSecret = key.toLowerCase().includes('password') || 
                      key.toLowerCase().includes('key') ||
                      key.toLowerCase().includes('secret');
      console.log(`  ${key}: ${isSecret ? '[HIDDEN]' : value}`);
    });
  }
}

checkSettings().catch(console.error);

require('dotenv').config({ path: '.env.local' });
const { createClient } = require('@supabase/supabase-js');

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
);

async function checkConfig() {
  // Check database settings
  const { data: settings, error } = await supabase
    .from('settings')
    .select('finale_api_key, finale_api_secret, finale_account_path')
    .single();

  if (error) {
  } else if (settings) {
  }
  if (!settings?.finale_api_key && !process.env.FINALE_API_KEY) {
  } else {
  }
}

checkConfig();
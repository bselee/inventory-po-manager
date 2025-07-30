require('dotenv').config({ path: '.env.local' });
const { createClient } = require('@supabase/supabase-js');

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
);

async function checkConfig() {
  console.log('Checking Finale configuration...\n');

  // Check database settings
  const { data: settings, error } = await supabase
    .from('settings')
    .select('finale_api_key, finale_api_secret, finale_account_path')
    .single();

  if (error) {
    console.log('❌ Error reading settings:', error.message);
  } else if (settings) {
    console.log('📋 Database Settings:');
    console.log('  API Key:', settings.finale_api_key ? '✅ Set' : '❌ Missing');
    console.log('  API Secret:', settings.finale_api_secret ? '✅ Set' : '❌ Missing');
    console.log('  Account Path:', settings.finale_account_path || '❌ Missing');
  }

  console.log('\n📋 Environment Variables:');
  console.log('  FINALE_API_KEY:', process.env.FINALE_API_KEY ? '✅ Set' : '❌ Missing');
  console.log('  FINALE_API_SECRET:', process.env.FINALE_API_SECRET ? '✅ Set' : '❌ Missing');
  console.log('  FINALE_ACCOUNT_PATH:', process.env.FINALE_ACCOUNT_PATH || '❌ Missing');

  if (!settings?.finale_api_key && !process.env.FINALE_API_KEY) {
    console.log('\n❌ No Finale credentials found!');
    console.log('\nPlease either:');
    console.log('1. Go to http://localhost:3000/settings and enter your Finale API credentials');
    console.log('2. Or add them to your .env.local file:');
    console.log('   FINALE_API_KEY=your_api_key');
    console.log('   FINALE_API_SECRET=your_api_secret');
    console.log('   FINALE_ACCOUNT_PATH=buildasoilorganics');
  } else {
    console.log('\n✅ Finale credentials found!');
  }
}

checkConfig();
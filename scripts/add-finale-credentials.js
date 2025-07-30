require('dotenv').config({ path: '.env.local' });
const { createClient } = require('@supabase/supabase-js');
const readline = require('readline');

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
);

const rl = readline.createInterface({
  input: process.stdin,
  output: process.stdout
});

function prompt(question) {
  return new Promise(resolve => {
    rl.question(question, resolve);
  });
}

async function addCredentials() {
  console.log('🔐 Add Finale API Credentials to Supabase\n');
  console.log('You can find these in Finale:');
  console.log('Settings → Integrations → Finale API\n');

  // Get current settings
  const { data: current } = await supabase
    .from('settings')
    .select('*')
    .single();

  console.log('Current account path:', current?.finale_account_path || 'Not set');
  console.log('Current API key:', current?.finale_api_key ? '***' + current.finale_api_key.slice(-4) : 'Not set');
  console.log('\n');

  // Prompt for credentials
  const apiKey = await prompt('Enter your Finale API Key: ');
  const apiSecret = await prompt('Enter your Finale API Secret: ');
  
  let accountPath = current?.finale_account_path || 'buildasoilorganics';
  const changeAccount = await prompt(`Account path is "${accountPath}". Change it? (y/N): `);
  
  if (changeAccount.toLowerCase() === 'y') {
    accountPath = await prompt('Enter new account path (e.g., buildasoilorganics): ');
  }

  console.log('\nSaving credentials to Supabase...');

  try {
    // Prepare the settings data
    const settingsData = {
      finale_api_key: apiKey.trim(),
      finale_api_secret: apiSecret.trim(),
      finale_account_path: accountPath.trim(),
      low_stock_threshold: current?.low_stock_threshold || 10,
      sync_frequency_minutes: current?.sync_frequency_minutes || 60,
      sync_enabled: true
    };

    // Upsert settings (insert or update)
    const { data, error } = await supabase
      .from('settings')
      .upsert({
        id: 1,
        ...settingsData
      })
      .select()
      .single();

    if (error) {
      console.error('❌ Failed to save:', error.message);
    } else {
      console.log('\n✅ Credentials saved successfully!');
      console.log('\nYou can now:');
      console.log('1. Run "node scripts/run-sync-now.js" to sync inventory');
      console.log('2. Or visit http://localhost:3000/settings and use the sync button');
    }

  } catch (error) {
    console.error('❌ Error:', error.message);
  } finally {
    rl.close();
  }
}

addCredentials();
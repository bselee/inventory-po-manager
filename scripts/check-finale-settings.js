#!/usr/bin/env node

const { createClient } = require('@supabase/supabase-js');
require('dotenv').config();

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

async function checkSettings() {
  console.log('🔍 Checking Finale settings in database...\n');

  try {
    const { data: settings, error } = await supabase
      .from('settings')
      .select('finale_api_key, finale_api_secret, finale_account_path')
      .single();

    if (error) {
      console.error('❌ Error fetching settings:', error);
      return;
    }

    if (!settings) {
      console.log('❌ No settings found in database');
      return;
    }

    console.log('📊 Current Finale settings:');
    console.log(`  API Key: ${settings.finale_api_key ? '✅ Set' : '❌ Not set'}`);
    console.log(`  API Secret: ${settings.finale_api_secret ? '✅ Set' : '❌ Not set'}`);
    console.log(`  Account Path: ${settings.finale_account_path || '❌ Not set'}`);
    
    if (settings.finale_account_path) {
      console.log('\n⚠️  Account Path Analysis:');
      const path = settings.finale_account_path;
      
      if (path.includes('http')) {
        console.log('  ❌ ERROR: Account path contains full URL!');
        console.log(`  Current value: "${path}"`);
        console.log('  ✅ Should be just: "buildasoilorganics" or "buildasoilorganics/1"');
        
        // Try to extract the correct path
        const match = path.match(/finaleinventory\.com\/([^\/]+(?:\/\d+)?)/);
        if (match) {
          console.log(`\n  💡 Suggested fix: "${match[1]}"`);
        }
      } else {
        console.log('  ✅ Account path format looks correct');
      }
    }

  } catch (error) {
    console.error('❌ Fatal error:', error);
  }
}

// Run the check
checkSettings();
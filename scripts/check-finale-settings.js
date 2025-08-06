#!/usr/bin/env node

const { createClient } = require('@supabase/supabase-js');
require('dotenv').config();

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

async function checkSettings() {
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
      return;
    }
    if (settings.finale_account_path) {
      const path = settings.finale_account_path;
      
      if (path.includes('http')) {
        // Try to extract the correct path
        const match = path.match(/finaleinventory\.com\/([^\/]+(?:\/\d+)?)/);
        if (match) {
        }
      } else {
      }
    }

  } catch (error) {
    console.error('❌ Fatal error:', error);
  }
}

// Run the check
checkSettings();
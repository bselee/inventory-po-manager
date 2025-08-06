#!/usr/bin/env node

// Script to fix inventory update issues
const { createClient } = require('@supabase/supabase-js');
require('dotenv').config({ path: '.env.local' });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseServiceKey) {
  console.error('Missing required environment variables');
  console.error('NEXT_PUBLIC_SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY are required');
  console.error('\nFor now, you need to run this migration manually in Supabase:');
  console.error('\n1. Go to your Supabase dashboard');
  console.error('2. Navigate to SQL Editor');
  console.error('3. Run the following SQL:');
  console.error('\n-- Add updated_at column if missing');
  console.error('ALTER TABLE inventory_items ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ DEFAULT NOW();');
  console.error('\n-- OR if there\'s a problematic trigger, drop it:');
  console.error('DROP TRIGGER IF EXISTS update_inventory_items_updated_at ON inventory_items;');
  process.exit(1);
}


console.log('\n' + '='.repeat(60));

-- Option 2: If there's a problematic trigger, disable it
DROP TRIGGER IF EXISTS update_inventory_items_updated_at ON inventory_items;
`);
console.log('='.repeat(60));

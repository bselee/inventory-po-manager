#!/usr/bin/env node

/**
 * Supabase Migration Runner
 * This script runs database migrations using the Supabase client
 * 
 * Usage: node scripts/run-supabase-migration.js
 */

require('dotenv').config();
const { createClient } = require('@supabase/supabase-js');
const fs = require('fs');
const path = require('path');

// Check for required environment variables
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || process.env.SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseServiceKey) {
  console.error('❌ Missing required environment variables:');
  if (!supabaseUrl) console.error('   - NEXT_PUBLIC_SUPABASE_URL or SUPABASE_URL');
  if (!supabaseServiceKey) console.error('   - SUPABASE_SERVICE_ROLE_KEY');
  console.error('\nPlease ensure these are set in your .env file or environment');
  process.exit(1);
}

// Create Supabase client with service role key for admin access
const supabase = createClient(supabaseUrl, supabaseServiceKey, {
  auth: {
    autoRefreshToken: false,
    persistSession: false
  }
});

async function runMigration() {
  try {
    // Read the migration SQL file
    const migrationPath = path.join(__dirname, 'complete-migration.sql');
    const migrationSQL = fs.readFileSync(migrationPath, 'utf8');
    // Split the SQL into individual statements (separated by semicolons)
    const statements = migrationSQL
      .split(';')
      .map(s => s.trim())
      .filter(s => s.length > 0 && !s.startsWith('--'));
    let successCount = 0;
    let errorCount = 0;

    // Execute each statement
    for (let i = 0; i < statements.length; i++) {
      const statement = statements[i] + ';';
      const preview = statement.substring(0, 50).replace(/\n/g, ' ');
      
      process.stdout.write(`[${i + 1}/${statements.length}] Executing: ${preview}... `);

      try {
        // Execute the SQL statement
        const { error } = await supabase.rpc('exec_sql', {
          sql_query: statement
        });

        if (error) {
          // Try direct execution if RPC is not available
          const { error: directError } = await supabase.from('_migrations').select('*').limit(0);
          if (directError?.message?.includes('exec_sql')) {
            console.log('⚠️  (RPC not available, statement may need manual execution)');
          } else {
            throw error;
          }
        } else {
          successCount++;
        }
      } catch (error) {
        console.error(`   Error: ${error.message}`);
        errorCount++;
      }
    }
    // Test the migration by checking for new columns
    // Check if settings table has new columns
    const { data: settings, error: settingsError } = await supabase
      .from('settings')
      .select('*')
      .limit(1);

    if (!settingsError && settings) {
      const sampleSettings = settings[0] || {};
      const hasFinaleAuth = 'finale_username' in sampleSettings || 'finale_password' in sampleSettings;
      const hasFinaleApi = 'finale_api_key' in sampleSettings;
    }

    // Check if sync_logs table exists
    const { error: syncLogsError } = await supabase
      .from('sync_logs')
      .select('id')
      .limit(1);
    if (errorCount > 0) {
    } else {
    }

  } catch (error) {
    console.error('\n❌ Migration failed:', error.message);
    console.error('\nPlease run the migration manually:');
    console.error('1. Go to your Supabase dashboard');
    console.error('2. Navigate to SQL Editor');
    console.error('3. Copy and paste the contents of scripts/complete-migration.sql');
    console.error('4. Click "Run" to execute the migration');
  }
}

// Alternative approach using direct database connection info
async function showManualInstructions() {
  console.log('6. Click the "Run" button (or press Ctrl+Enter)');
}

// Run the migration
runMigration().then(() => {
  showManualInstructions();
}).catch(console.error);
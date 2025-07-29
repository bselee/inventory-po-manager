#!/usr/bin/env node

// Script to run a specific migration file
// Usage: node scripts/run-migration.js <migration-file>

const { createClient } = require('@supabase/supabase-js');
const fs = require('fs');
const path = require('path');
require('dotenv').config({ path: '.env.local' });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseServiceKey) {
  console.error('Missing required environment variables');
  console.error('Please ensure NEXT_PUBLIC_SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY are set');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseServiceKey);

async function runMigration(migrationFile) {
  try {
    // Read the migration file
    const migrationPath = path.resolve(migrationFile);
    if (!fs.existsSync(migrationPath)) {
      throw new Error(`Migration file not found: ${migrationPath}`);
    }

    const migrationSQL = fs.readFileSync(migrationPath, 'utf8');
    console.log(`Running migration: ${path.basename(migrationPath)}`);
    console.log('---');

    // Split by semicolons but be careful with functions/triggers
    const statements = [];
    let currentStatement = '';
    let inFunction = false;

    migrationSQL.split('\n').forEach(line => {
      // Check if we're entering or exiting a function definition
      if (line.match(/CREATE (OR REPLACE )?FUNCTION/i)) {
        inFunction = true;
      }
      if (line.match(/\$\$ LANGUAGE/i)) {
        inFunction = false;
      }

      currentStatement += line + '\n';

      // If we're not in a function and we hit a semicolon at the end of the line
      if (!inFunction && line.trim().endsWith(';')) {
        statements.push(currentStatement.trim());
        currentStatement = '';
      }
    });

    // Add any remaining statement
    if (currentStatement.trim()) {
      statements.push(currentStatement.trim());
    }

    // Execute each statement
    for (const statement of statements) {
      if (!statement || statement.startsWith('--')) continue;
      
      console.log('Executing:', statement.substring(0, 50) + '...');
      
      // For Supabase, we need to use raw SQL execution
      // Note: This requires service role key for admin operations
      const { error } = await supabase.rpc('exec_sql', {
        query: statement
      }).single();

      if (error) {
        // If the RPC doesn't exist, we'll need to use a different approach
        if (error.message.includes('exec_sql')) {
          console.log('Note: Direct SQL execution not available via RPC.');
          console.log('You may need to run this migration directly in Supabase SQL editor.');
          console.log('\nMigration SQL:');
          console.log(migrationSQL);
          return;
        }
        throw error;
      }
    }

    console.log('\n✅ Migration completed successfully!');

  } catch (error) {
    console.error('\n❌ Migration failed:', error.message);
    process.exit(1);
  }
}

// Get migration file from command line arguments
const args = process.argv.slice(2);
if (args.length === 0) {
  console.log('Usage: node scripts/run-migration.js <migration-file>');
  console.log('Example: node scripts/run-migration.js scripts/migrations/008_settings_single_row_constraint.sql');
  process.exit(1);
}

runMigration(args[0]);
#!/usr/bin/env node

// Script to prepare and validate a migration for Supabase
// Usage: node scripts/prepare-migration.js

const fs = require('fs');
const path = require('path');

const MIGRATION_FILE = path.join(__dirname, 'migrations', '008_settings_single_row_constraint.sql');

console.log('=== Settings Single Row Constraint Migration ===\n');
console.log('This migration will:');
console.log('1. Clean up any duplicate settings rows');
console.log('2. Add a constraint to ensure only one row exists');
console.log('3. Create a trigger to prevent multiple rows\n');

if (!fs.existsSync(MIGRATION_FILE)) {
  console.error('❌ Migration file not found:', MIGRATION_FILE);
  process.exit(1);
}

const migrationSQL = fs.readFileSync(MIGRATION_FILE, 'utf8');

console.log('To apply this migration:');
console.log('1. Go to your Supabase dashboard');
console.log('2. Navigate to SQL Editor');
console.log('3. Copy and paste the following SQL:');
console.log('\n' + '='.repeat(60) + '\n');
console.log(migrationSQL);
console.log('\n' + '='.repeat(60) + '\n');
console.log('4. Click "Run" to execute the migration\n');

// Also save to a file for easy copying
const outputFile = path.join(__dirname, 'settings-migration-ready.sql');
fs.writeFileSync(outputFile, migrationSQL);
console.log('✅ Migration also saved to:', outputFile);
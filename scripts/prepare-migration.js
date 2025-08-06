#!/usr/bin/env node

// Script to prepare and validate a migration for Supabase
// Usage: node scripts/prepare-migration.js

const fs = require('fs');
const path = require('path');

const MIGRATION_FILE = path.join(__dirname, 'migrations', '008_settings_single_row_constraint.sql');


if (!fs.existsSync(MIGRATION_FILE)) {
  console.error('❌ Migration file not found:', MIGRATION_FILE);
  process.exit(1);
}

const migrationSQL = fs.readFileSync(MIGRATION_FILE, 'utf8');


console.log('\n' + '='.repeat(60) + '\n');

console.log('\n' + '='.repeat(60) + '\n');

// Also save to a file for easy copying
const outputFile = path.join(__dirname, 'settings-migration-ready.sql');
fs.writeFileSync(outputFile, migrationSQL);

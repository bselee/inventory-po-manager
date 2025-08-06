const fs = require('fs');
const path = require('path');

// Migration runner for Supabase
console.log('- Sales data tracking (30/90 days)');
// Read and display the migration content
const migrationPath = path.join(__dirname, 'all-migrations.sql');
const migrationContent = fs.readFileSync(migrationPath, 'utf8');

console.log('📄 Migration SQL Preview (first 20 lines):');
const lines = migrationContent.split('\n').slice(0, 20);
lines.forEach(line => console.log(line));
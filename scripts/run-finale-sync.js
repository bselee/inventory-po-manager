// Run Finale sync directly
const { execSync } = require('child_process');

async function runSync() {
  console.log('🚀 RUNNING FINALE SYNC\n');
  console.log('=' .repeat(60));
  
  try {
    // First, let's check if we have the stuck sync
    console.log('\n1. Checking for stuck syncs...');
    execSync('curl -s http://localhost:3000/api/sync-finale/check-stuck', { stdio: 'inherit' });
    
    // Run the actual sync
    console.log('\n\n2. Starting Finale sync...');
    console.log('This will sync thousands of products and may take several minutes...\n');
    
    const startTime = Date.now();
    
    // Use curl with extended timeout
    const result = execSync(
      'curl -X POST http://localhost:3000/api/sync-finale -H "Content-Type: application/json" -d "{}" --max-time 600',
      { encoding: 'utf8' }
    );
    
    const elapsed = Math.round((Date.now() - startTime) / 1000);
    console.log(`\n\nSync completed in ${elapsed} seconds`);
    
    try {
      const response = JSON.parse(result);
      console.log('\n📊 SYNC RESULT:');
      console.log(`Success: ${response.success}`);
      console.log(`Message: ${response.message}`);
      console.log(`Processed: ${response.processed}`);
      console.log(`Updated: ${response.updated}`);
      console.log(`Errors: ${response.errors?.length || 0}`);
      
      if (response.errors?.length > 0) {
        console.log('\nFirst 3 errors:');
        response.errors.slice(0, 3).forEach((err, i) => {
          console.log(`${i + 1}. ${err}`);
        });
      }
    } catch (e) {
      console.log('\nRaw response:', result.substring(0, 500));
    }
    
    // Check sync status
    console.log('\n\n3. Checking sync status...');
    execSync('curl -s http://localhost:3000/api/sync-finale/status | jq .', { stdio: 'inherit' });
    
    // Check inventory count
    console.log('\n\n4. Checking inventory count...');
    execSync(`node -e "
      const { createClient } = require('@supabase/supabase-js');
      const supabase = createClient(
        'https://htsconqmnzthnkvogbwu.supabase.co',
        'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imh0c2NvbnFtbnp0aG5rdm9nYnd1Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTI2MDU3NzUsImV4cCI6MjA2ODE4MTc3NX0.AVyKmrQey0wZx6DfWkZv3OYjCzrHeLguw5lv7uVg1wY'
      );
      
      supabase.from('inventory_items').select('*', { count: 'exact', head: true })
        .then(({ count }) => console.log('Total inventory items:', count));
    "`, { stdio: 'inherit' });
    
  } catch (error) {
    console.error('\n❌ Error:', error.message);
  }
}

runSync();
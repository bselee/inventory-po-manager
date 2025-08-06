// Run Finale sync directly
const { execSync } = require('child_process');

async function runSync() {
  console.log('=' .repeat(60));
  
  try {
    // First, let's check if we have the stuck sync
    execSync('curl -s http://localhost:3000/api/sync-finale/check-stuck', { stdio: 'inherit' });
    
    // Run the actual sync
    const startTime = Date.now();
    
    // Use curl with extended timeout
    const result = execSync(
      'curl -X POST http://localhost:3000/api/sync-finale -H "Content-Type: application/json" -d "{}" --max-time 600',
      { encoding: 'utf8' }
    );
    
    const elapsed = Math.round((Date.now() - startTime) / 1000);
    try {
      const response = JSON.parse(result);
      if (response.errors?.length > 0) {
        response.errors.slice(0, 3).forEach((err, i) => {
        });
      }
    } catch (e) {
      console.log('\nRaw response:', result.substring(0, 500));
    }
    
    // Check sync status
    execSync('curl -s http://localhost:3000/api/sync-finale/status | jq .', { stdio: 'inherit' });
    
    // Check inventory count
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
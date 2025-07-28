#!/usr/bin/env node

// Script to sync ALL products from Finale
const http = require('http');

async function makeRequest(url, options = {}) {
  return new Promise((resolve, reject) => {
    const urlObj = new URL(url, 'http://localhost:3001');
    const req = http.request(urlObj, {
      ...options,
      headers: {
        'Content-Type': 'application/json',
        ...options.headers,
      }
    }, (res) => {
      let data = '';
      const cookies = res.headers['set-cookie'] || [];
      res.on('data', chunk => data += chunk);
      res.on('end', () => {
        try {
          resolve({ 
            status: res.statusCode, 
            data: JSON.parse(data),
            cookies: cookies
          });
        } catch (e) {
          resolve({ status: res.statusCode, data, cookies });
        }
      });
    });
    
    req.on('error', reject);
    if (options.body) req.write(options.body);
    req.end();
  });
}

async function syncAllProducts() {
  console.log('\n🚀 STARTING FULL INVENTORY SYNC\n');
  console.log('This will sync ALL products from Finale to your database.');
  console.log('Expected: 2000+ items\n');
  
  try {
    // Get CSRF token
    console.log('1. Getting CSRF token...');
    const csrfResponse = await makeRequest('/api/auth/csrf', { method: 'GET' });
    const csrfCookie = csrfResponse.cookies.find(c => c.includes('csrf-token='));
    const csrfToken = csrfCookie ? csrfCookie.match(/csrf-token=([^;]+)/)[1] : null;
    
    // Start full sync
    console.log('2. Starting full sync (this may take 5-10 minutes)...');
    const syncResponse = await makeRequest('/api/sync-finale', {
      method: 'POST',
      headers: {
        'Cookie': csrfCookie || '',
        'X-CSRF-Token': csrfToken || ''
      },
      body: JSON.stringify({ 
        syncType: 'full',
        filterYear: null  // null = get ALL items, not just current year
      })
    });
    
    console.log('\nSync Response:', syncResponse.status);
    
    if (syncResponse.data.success) {
      console.log('✅ Sync started successfully!');
      console.log('Total products found:', syncResponse.data.totalProducts || 'Unknown');
      
      // Check status every 10 seconds
      console.log('\nMonitoring sync progress...');
      let isRunning = true;
      let checkCount = 0;
      
      while (isRunning && checkCount < 60) { // Max 10 minutes
        await new Promise(resolve => setTimeout(resolve, 10000)); // Wait 10 seconds
        
        const statusResponse = await makeRequest('/api/sync-status-monitor');
        const runningSyncs = statusResponse.data?.runningSyncs || [];
        
        if (runningSyncs.length > 0) {
          const sync = runningSyncs[0];
          console.log(`Progress: ${sync.items_updated || 0} items synced...`);
        } else {
          isRunning = false;
          console.log('\n🎉 Sync completed!');
          
          // Check final count
          const { createClient } = require('@supabase/supabase-js');
          require('dotenv').config({ path: '.env.local' });
          const supabase = createClient(
            process.env.NEXT_PUBLIC_SUPABASE_URL,
            process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
          );
          
          const { count } = await supabase
            .from('inventory_items')
            .select('*', { count: 'exact', head: true });
          
          console.log('\nFinal inventory count:', count, 'items');
          console.log('\nGo to http://localhost:3001/inventory to see all items!');
        }
        
        checkCount++;
      }
    } else {
      console.error('❌ Sync failed:', syncResponse.data.error || syncResponse.data.message);
      
      if (syncResponse.data.error?.includes('not configured')) {
        console.log('\nPlease configure Finale API credentials first:');
        console.log('1. Go to http://localhost:3001/settings');
        console.log('2. Enter your Finale API key, secret, and account path');
        console.log('3. Test the connection');
        console.log('4. Then run this script again');
      }
    }
  } catch (error) {
    console.error('\nError:', error.message);
    if (error.code === 'ECONNREFUSED') {
      console.log('\nDev server is not running!');
      console.log('Start it with: npm run dev');
    }
  }
}

// Check if server is running first
http.get('http://localhost:3001/api/health', (res) => {
  if (res.statusCode === 200) {
    syncAllProducts();
  }
}).on('error', () => {
  console.error('❌ Dev server is not running!');
  console.log('Please start it with: npm run dev');
  console.log('Then run this script again.');
});
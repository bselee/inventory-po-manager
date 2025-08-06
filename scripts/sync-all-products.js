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


  try {
    // Get CSRF token

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

    if (syncResponse.data.success) {


      // Check status every 10 seconds

      let isRunning = true;
      let checkCount = 0;
      
      while (isRunning && checkCount < 60) { // Max 10 minutes
        await new Promise(resolve => setTimeout(resolve, 10000)); // Wait 10 seconds
        
        const statusResponse = await makeRequest('/api/sync-status-monitor');
        const runningSyncs = statusResponse.data?.runningSyncs || [];
        
        if (runningSyncs.length > 0) {
          const sync = runningSyncs[0];

        } else {
          isRunning = false;

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


        }
        
        checkCount++;
      }
    } else {
      console.error('❌ Sync failed:', syncResponse.data.error || syncResponse.data.message);
      
      if (syncResponse.data.error?.includes('not configured')) {


      }
    }
  } catch (error) {
    console.error('\nError:', error.message);
    if (error.code === 'ECONNREFUSED') {


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


});
const https = require('https');

async function triggerSync() {
  console.log('🚀 Triggering Finale Sync...\n');

  const options = {
    hostname: 'localhost',
    port: 3001,
    path: '/api/sync-finale-background',
    method: 'POST',
    headers: {
      'Content-Type': 'application/json'
    },
    rejectUnauthorized: false // For localhost
  };

  const data = JSON.stringify({
    dryRun: false,
    filterYear: new Date().getFullYear() - 1 // Last 2 years
  });

  return new Promise((resolve, reject) => {
    const req = https.request(options, (res) => {
      let responseData = '';
      
      res.on('data', (chunk) => {
        responseData += chunk;
      });
      
      res.on('end', () => {
        try {
          const result = JSON.parse(responseData);
          
          if (res.statusCode === 200 && result.success) {
            console.log('✅ Sync started successfully!');
            console.log(`📊 Status: ${result.status}`);
            if (result.message) console.log(`📝 ${result.message}`);
            
            // Start monitoring the sync
            monitorSync();
          } else {
            console.error(`❌ Sync failed: ${result.error || result.message || 'Unknown error'}`);
            console.error(`   Status Code: ${res.statusCode}`);
          }
          
          resolve(result);
        } catch (error) {
          console.error('❌ Invalid response:', responseData);
          reject(error);
        }
      });
    });
    
    req.on('error', (error) => {
      console.error('❌ Request failed:', error.message);
      reject(error);
    });
    
    req.write(data);
    req.end();
  });
}

async function monitorSync() {
  console.log('\n📊 Monitoring sync progress...\n');
  
  let pollCount = 0;
  const maxPolls = 60; // 5 minutes
  
  const interval = setInterval(async () => {
    try {
      const response = await fetch('http://localhost:3001/api/sync-finale-background');
      const status = await response.json();
      
      if (!status.hasRunningSync || pollCount >= maxPolls) {
        clearInterval(interval);
        
        if (status.lastSync?.status === 'success') {
          const itemsProcessed = status.lastSync.items_processed || 0;
          const itemsUpdated = status.lastSync.items_updated || 0;
          
          console.log('\n✅ Sync completed successfully!');
          console.log(`📦 Items processed: ${itemsProcessed}`);
          console.log(`🔄 Items updated: ${itemsUpdated}`);
          
          if (itemsUpdated > 0) {
            console.log('\n🎉 Inventory data has been imported! Check the inventory page.');
          } else {
            console.log('\n⚠️  No new items found for the selected time period.');
          }
        } else if (status.lastSync?.status === 'error') {
          console.error(`\n❌ Sync failed: ${status.lastSync.errors?.[0] || 'Unknown error'}`);
        } else if (pollCount >= maxPolls) {
          console.error('\n⏱️  Sync is taking longer than expected. Check back later.');
        }
      } else {
        const minutes = Math.floor(pollCount * 5 / 60);
        const seconds = (pollCount * 5) % 60;
        process.stdout.write(`\r⏳ Sync running... ${minutes}:${seconds.toString().padStart(2, '0')}`);
      }
      
      pollCount++;
    } catch (error) {
      clearInterval(interval);
      console.error('\n❌ Error monitoring sync:', error.message);
    }
  }, 5000); // Check every 5 seconds
}

// Alternative using HTTP if HTTPS fails
async function triggerSyncHTTP() {
  console.log('Trying HTTP...');
  const http = require('http');
  
  const options = {
    hostname: 'localhost',
    port: 3001,
    path: '/api/sync-finale-background',
    method: 'POST',
    headers: {
      'Content-Type': 'application/json'
    }
  };

  const data = JSON.stringify({
    dryRun: false,
    filterYear: new Date().getFullYear() - 1
  });

  return new Promise((resolve, reject) => {
    const req = http.request(options, (res) => {
      let responseData = '';
      
      res.on('data', (chunk) => {
        responseData += chunk;
      });
      
      res.on('end', () => {
        try {
          const result = JSON.parse(responseData);
          console.log('Response:', result);
          resolve(result);
        } catch (error) {
          console.error('Parse error:', responseData);
          reject(error);
        }
      });
    });
    
    req.on('error', reject);
    req.write(data);
    req.end();
  });
}

// Main execution
async function main() {
  try {
    await triggerSync();
  } catch (error) {
    console.log('\nTrying alternative method...');
    try {
      await triggerSyncHTTP();
    } catch (error2) {
      console.error('\n❌ Both HTTPS and HTTP failed. Make sure the dev server is running on port 3001.');
      console.error('Error:', error2.message);
    }
  }
}

main();
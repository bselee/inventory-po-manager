const http = require('http');
const triggerSync = () => {
  const data = JSON.stringify({
    dryRun: false,
    filterYear: new Date().getFullYear() - 1 // Last 2 years
  });

  const options = {
    hostname: 'localhost',
    port: 3001,
    path: '/api/sync-finale-background',
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Content-Length': data.length
    }
  };

  const req = http.request(options, (res) => {
    let responseData = '';

    res.on('data', (chunk) => {
      responseData += chunk;
    });

    res.on('end', () => {
      try {
        const result = JSON.parse(responseData);
        
        if (res.statusCode === 200 && result.success) {
          // Start monitoring
          monitorProgress();
        } else {
          console.error('❌ SYNC FAILED TO START\n');
          console.error('Status:', res.statusCode);
          console.error('Error:', result.error || result.message || 'Unknown error');
          
          if (result.error?.includes('credentials')) {
            console.error('\n💡 TIP: Make sure your Finale credentials are configured in the settings page.');
          }
        }
      } catch (e) {
        console.error('❌ Failed to parse response:', e.message);
        console.error('Response:', responseData);
      }
    });
  });

  req.on('error', (e) => {
    console.error('❌ CONNECTION ERROR:', e.message);
    console.error('\nMake sure the development server is running on port 3001');
    console.error('Run: npm run dev');
  });

  req.write(data);
  req.end();
};

const monitorProgress = () => {
  let dots = 0;
  const progressInterval = setInterval(() => {
    process.stdout.write('\rSyncing' + '.'.repeat((dots % 3) + 1) + '   ');
    dots++;
  }, 1000);

  // Check status every 10 seconds
  let checkCount = 0;
  const statusInterval = setInterval(() => {
    http.get('http://localhost:3001/api/sync-finale-background', (res) => {
      let data = '';
      res.on('data', chunk => data += chunk);
      res.on('end', () => {
        try {
          const status = JSON.parse(data);
          
          if (!status.hasRunningSync) {
            clearInterval(progressInterval);
            clearInterval(statusInterval);
            
            if (status.lastSync?.status === 'success') {
              const items = status.lastSync.items_updated || 0;
              if (items > 0) {
              } else {
              }
            } else if (status.lastSync?.status === 'error') {
            }
          }
          
          checkCount++;
          if (checkCount > 30) { // 5 minutes timeout
            clearInterval(progressInterval);
            clearInterval(statusInterval);
          }
        } catch (e) {
          // Ignore parse errors during monitoring
        }
      });
    }).on('error', () => {
      // Ignore connection errors during monitoring
    });
  }, 10000);
};

// Execute
triggerSync();
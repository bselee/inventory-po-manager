const http = require('http');

async function testSyncVisibility() {
  try {
    // First, check if server is running
    const response = await new Promise((resolve, reject) => {
      http.get('http://localhost:3000/settings', (res) => {
        let data = '';
        res.on('data', (chunk) => data += chunk);
        res.on('end', () => resolve({ status: res.statusCode, data }));
      }).on('error', reject);
    });

    if (response.status !== 200) {
      console.error(`❌ Settings page returned status ${response.status}`);
      return;
    }

    const html = response.data;
    
    // Check for key sync-related elements
    const checks = [
      { pattern: /Sync Control Center/i, name: 'Sync Control Center title' },
      { pattern: /Sync Now/i, name: 'Sync Now button' },
      { pattern: /Dry Run/i, name: 'Dry Run button' },
      { pattern: /FinaleSyncManager/i, name: 'FinaleSyncManager component' },
      { pattern: /Import Inventory from Finale/i, name: 'Import Inventory text' },
      { pattern: /Last 2 years/i, name: 'Date filter options' }
    ];
    checks.forEach(({ pattern, name }) => {
      if (pattern.test(html)) {
      } else {
      }
    });

    // Extract and display any error messages
    const errorMatch = html.match(/error["\s:]+([^"]+)/i);
    if (errorMatch) {
    }

    // Check if it's a client-side rendered page
    if (html.includes('__next')) {
    }

  } catch (error) {
    console.error('❌ Failed to load settings page:', error.message);
  }
}

// Also test the inventory page sync button
async function testInventorySyncButton() {
  try {
    const response = await new Promise((resolve, reject) => {
      http.get('http://localhost:3000/inventory', (res) => {
        let data = '';
        res.on('data', (chunk) => data += chunk);
        res.on('end', () => resolve({ status: res.statusCode, data }));
      }).on('error', reject);
    });

    if (response.status !== 200) {
      console.error(`❌ Inventory page returned status ${response.status}`);
      return;
    }

    const html = response.data;
    
    // Check for sync-related elements on inventory page
    if (html.includes('onSync')) {
    }

    if (html.includes('window.location.href')) {
    }

  } catch (error) {
    console.error('❌ Failed to load inventory page:', error.message);
  }
}

async function main() {
  await testSyncVisibility();
  await testInventorySyncButton();
}

main();
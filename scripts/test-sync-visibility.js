const http = require('http');

async function testSyncVisibility() {
  console.log('Testing Sync Visibility on Settings Page...\n');

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

    console.log('Checking for sync-related elements:\n');
    
    checks.forEach(({ pattern, name }) => {
      if (pattern.test(html)) {
        console.log(`✅ Found: ${name}`);
      } else {
        console.log(`❌ Missing: ${name}`);
      }
    });

    // Extract and display any error messages
    const errorMatch = html.match(/error["\s:]+([^"]+)/i);
    if (errorMatch) {
      console.log(`\n⚠️  Error found on page: ${errorMatch[1]}`);
    }

    // Check if it's a client-side rendered page
    if (html.includes('__next')) {
      console.log('\n📌 Note: This is a client-side rendered page. Some content may load dynamically.');
    }

  } catch (error) {
    console.error('❌ Failed to load settings page:', error.message);
    console.log('\n💡 Make sure the dev server is running on port 3000');
  }
}

// Also test the inventory page sync button
async function testInventorySyncButton() {
  console.log('\n\nTesting Inventory Page Sync Button...\n');

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
      console.log('✅ Found onSync handler in inventory page');
    }

    if (html.includes('window.location.href')) {
      console.log('✅ Found navigation code for sync button');
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
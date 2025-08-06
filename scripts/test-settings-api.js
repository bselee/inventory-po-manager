#!/usr/bin/env node

// Test Settings API functionality
const http = require('http');

const baseUrl = 'http://localhost:3000';

// Helper function to make requests
function makeRequest(path, method = 'GET', data = null) {
  return new Promise((resolve, reject) => {
    const url = new URL(path, baseUrl);
    const options = {
      hostname: url.hostname,
      port: url.port || 80,
      path: url.pathname + url.search,
      method: method,
      headers: {
        'Content-Type': 'application/json',
      }
    };

    const req = http.request(options, (res) => {
      let body = '';
      res.on('data', (chunk) => body += chunk);
      res.on('end', () => {
        try {
          const json = JSON.parse(body);
          resolve({ status: res.statusCode, data: json });
        } catch (e) {
          resolve({ status: res.statusCode, data: body });
        }
      });
    });

    req.on('error', reject);
    
    if (data) {
      req.write(JSON.stringify(data));
    }
    
    req.end();
  });
}

async function runTests() {
  try {
    // Test 1: Check if settings page loads
    const pageResult = await makeRequest('/settings');
    if (pageResult.status === 200 && typeof pageResult.data === 'string') {
      const html = pageResult.data;
      
      // Check for key elements in HTML
      const hasSettingInput = html.includes('data-testid="setting-input"');
      const hasSaveButton = html.includes('data-testid="save-settings"');
      const hasTestConnection = html.includes('Test Connection');
      const hasManualSync = html.includes('Start Manual Sync');
      // Check if it's a Next.js error page
      if (html.includes('__next_error__') || html.includes('Error:')) {
      }
    } else {
    }

    // Test 2: GET /api/settings
    const getResult = await makeRequest('/api/settings');
    if (getResult.status === 200) {
      if (getResult.data && getResult.data.low_stock_threshold !== undefined) {
      }
    } else {
      console.log('Response:', JSON.stringify(getResult.data, null, 2));
    }

    // Test 3: Check sync status endpoint
    const syncResult = await makeRequest('/api/sync-status-monitor');
    if (syncResult.status === 200) {
    } else {
    }

    // Test 4: Check test connection endpoint
    const testResult = await makeRequest('/api/test-finale-simple', 'POST', {});
    if (testResult.status === 200) {
    } else {
      if (testResult.data) {
        console.log('Response:', JSON.stringify(testResult.data, null, 2).substring(0, 200) + '...');
      }
    }

    // Test 5: Health check
    const healthResult = await makeRequest('/api/health');
    if (healthResult.status === 200) {
    } else {
    }

  } catch (error) {
    console.error('Test error:', error);
  }
}

// Check if server is running
http.get(baseUrl, (res) => {
  if (res.statusCode === 200 || res.statusCode === 308) {
    runTests();
  }
}).on('error', (err) => {
  console.error('Server is not running. Please start the dev server with: npm run dev');
  process.exit(1);
});
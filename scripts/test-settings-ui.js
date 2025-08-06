#!/usr/bin/env node

// Test Settings UI functionality by simulating user interactions
const http = require('http');
const https = require('https');

const baseUrl = 'http://localhost:3001';

// Helper to make HTTP requests
function request(url, options = {}) {
  return new Promise((resolve, reject) => {
    const urlObj = new URL(url, baseUrl);
    const protocol = urlObj.protocol === 'https:' ? https : http;
    
    const req = protocol.request(urlObj, {
      ...options,
      headers: {
        ...options.headers,
        'Accept': 'text/html,application/json',
      }
    }, (res) => {
      let data = '';
      res.on('data', chunk => data += chunk);
      res.on('end', () => {
        resolve({
          status: res.statusCode,
          headers: res.headers,
          body: data
        });
      });
    });
    
    req.on('error', reject);
    if (options.body) req.write(options.body);
    req.end();
  });
}

async function runUITests() {
  try {
    // Test 1: Load settings page
    const pageResult = await request('/settings');
    if (pageResult.status === 200) {
      // Check for key UI elements
      const hasApiKeyInput = pageResult.body.includes('data-testid="finale-api-key"') || 
                            pageResult.body.includes('API Key');
      const hasSaveButton = pageResult.body.includes('data-testid="save-settings"') || 
                           pageResult.body.includes('Save Settings');
      const hasTestButton = pageResult.body.includes('data-testid="test-connection"') || 
                           pageResult.body.includes('Test Connection');
      if (hasApiKeyInput && hasSaveButton && hasTestButton) {
      } else {
      }
    } else {
    }

    // Test 2: Check if API endpoints are accessible
    // Test GET settings
    const getSettings = await request('/api/settings', {
      method: 'GET',
      headers: { 'Content-Type': 'application/json' }
    });
    // Test Finale debug endpoint
    const debugFinale = await request('/api/finale-debug', {
      method: 'GET',
      headers: { 'Content-Type': 'application/json' }
    });
    // Test sync status endpoint
    const syncStatus = await request('/api/sync-status', {
      method: 'GET',
      headers: { 'Content-Type': 'application/json' }
    });
    if (getSettings.status === 200 && syncStatus.status === 200) {
    } else {
    }

    // Test 3: Check settings data structure
    if (getSettings.status === 200) {
      const data = JSON.parse(getSettings.body);
      const hasCorrectStructure = data.data && 
                                 data.data.settings &&
                                 data.data.settings.finaleApi &&
                                 data.data.settings.email &&
                                 data.data.settings.sync;
      console.log('Settings data keys:', Object.keys(data.data.settings));
      
      if (hasCorrectStructure) {
      } else {
      }
    }

    // Summary
  } catch (error) {
    console.error('Test error:', error);
  }
}

// Check if server is running
http.get(baseUrl, (res) => {
  if (res.statusCode === 200 || res.statusCode === 308) {
    runUITests();
  }
}).on('error', (err) => {
  console.error('Server is not running. Please start the dev server with: npm run dev');
  process.exit(1);
});
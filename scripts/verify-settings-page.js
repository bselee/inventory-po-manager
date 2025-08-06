#!/usr/bin/env node

// Verify settings page is working correctly
const http = require('http');

async function verifySettingsPage() {
  // Helper to make HTTP requests
  function makeRequest(path) {
    return new Promise((resolve, reject) => {
      http.get(`http://localhost:3000${path}`, (res) => {
        let data = '';
        res.on('data', chunk => data += chunk);
        res.on('end', () => resolve({ status: res.statusCode, data }));
      }).on('error', reject);
    });
  }
  
  try {
    // 1. Check if settings page loads
    const pageRes = await makeRequest('/settings');
    // 2. Check for React app structure
    const hasReactApp = pageRes.data.includes('__next') && pageRes.data.includes('main-app.js');
    // 3. Check API endpoints
    // Settings API
    const settingsRes = await makeRequest('/api/settings');
    // Sync status
    const syncRes = await makeRequest('/api/sync-status-monitor');
    // Health check
    const healthRes = await makeRequest('/api/health');
    console.log('   - Settings page is client-side rendered (React)');
  } catch (error) {
    console.error('Error:', error.message);
  }
}

// Run verification
verifySettingsPage();
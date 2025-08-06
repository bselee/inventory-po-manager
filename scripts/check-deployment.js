#!/usr/bin/env node

const https = require('https');

const DEPLOYMENT_URL = 'https://inventory-po-manager.vercel.app';
const EXPECTED_COMMIT = '0d330a4'; // Latest commit hash

// Color codes for terminal output
const colors = {
  reset: '\x1b[0m',
  green: '\x1b[32m',
  red: '\x1b[31m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m'
};

function checkEndpoint(path, description, expectedContent) {
  return new Promise((resolve) => {
    const url = `${DEPLOYMENT_URL}${path}`;
    https.get(url, (res) => {
      let data = '';
      
      res.on('data', (chunk) => {
        data += chunk;
      });
      
      res.on('end', () => {
        const success = res.statusCode === 200;
        const contentMatch = !expectedContent || data.includes(expectedContent);
        
        if (success && contentMatch) {
          if (expectedContent && contentMatch) {
          }
        } else {
          if (expectedContent && !contentMatch) {
          }
        }
        
        // Show response preview for API endpoints
        if (path.startsWith('/api/')) {
          try {
            const json = JSON.parse(data);
            console.log('Response:', JSON.stringify(json, null, 2).substring(0, 200) + '...');
          } catch {
            console.log('Response:', data.substring(0, 200) + '...');
          }
        }
        
        resolve({ success: success && contentMatch, path, description });
      });
    }).on('error', (err) => {
      resolve({ success: false, path, description });
    });
  });
}

async function main() {
  const checks = [
    // Check deployment info
    checkEndpoint('/api/deployment-info', 'Deployment Info API', EXPECTED_COMMIT),
    
    // Check main pages
    checkEndpoint('/', 'Homepage', null),
    checkEndpoint('/inventory', 'Inventory Page', 'Inventory'),
    checkEndpoint('/vendors', 'Vendors Page', 'Vendors'),
    checkEndpoint('/settings', 'Settings Page', 'Settings'),
    
    // Check new API endpoints
    checkEndpoint('/api/load-env-settings', 'Load Env Settings API', null),
    checkEndpoint('/api/test-sync-all', 'Test Sync All API', null),
    
    // Check static assets
    checkEndpoint('/_next/static/chunks/main.js', 'Main JS Bundle', null),
  ];
  
  const results = await Promise.all(checks);
  const successful = results.filter(r => r.success).length;
  const failed = results.filter(r => !r.success).length;
  if (failed === 0) {
  } else if (successful > 0) {
  } else {
  }
}

main();
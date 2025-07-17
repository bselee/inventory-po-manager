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
    console.log(`\n${colors.blue}Checking ${description}...${colors.reset}`);
    console.log(`URL: ${url}`);
    
    https.get(url, (res) => {
      let data = '';
      
      res.on('data', (chunk) => {
        data += chunk;
      });
      
      res.on('end', () => {
        const success = res.statusCode === 200;
        const contentMatch = !expectedContent || data.includes(expectedContent);
        
        if (success && contentMatch) {
          console.log(`${colors.green}✓ ${description} - Status: ${res.statusCode}${colors.reset}`);
          if (expectedContent && contentMatch) {
            console.log(`${colors.green}✓ Contains expected content${colors.reset}`);
          }
        } else {
          console.log(`${colors.red}✗ ${description} - Status: ${res.statusCode}${colors.reset}`);
          if (expectedContent && !contentMatch) {
            console.log(`${colors.red}✗ Missing expected content: ${expectedContent}${colors.reset}`);
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
      console.log(`${colors.red}✗ ${description} - Error: ${err.message}${colors.reset}`);
      resolve({ success: false, path, description });
    });
  });
}

async function main() {
  console.log(`${colors.blue}==================================${colors.reset}`);
  console.log(`${colors.blue}Vercel Deployment Verification${colors.reset}`);
  console.log(`${colors.blue}==================================${colors.reset}`);
  console.log(`\nDeployment URL: ${DEPLOYMENT_URL}`);
  console.log(`Expected Commit: ${EXPECTED_COMMIT}`);
  console.log(`Timestamp: ${new Date().toISOString()}`);
  
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
  
  console.log(`\n${colors.blue}==================================${colors.reset}`);
  console.log(`${colors.blue}Summary${colors.reset}`);
  console.log(`${colors.blue}==================================${colors.reset}`);
  
  const successful = results.filter(r => r.success).length;
  const failed = results.filter(r => !r.success).length;
  
  console.log(`${colors.green}Successful: ${successful}${colors.reset}`);
  console.log(`${colors.red}Failed: ${failed}${colors.reset}`);
  
  if (failed === 0) {
    console.log(`\n${colors.green}🎉 All checks passed! Deployment is ready.${colors.reset}`);
  } else if (successful > 0) {
    console.log(`\n${colors.yellow}⚠️  Partial deployment detected. Some endpoints are not ready yet.${colors.reset}`);
    console.log(`${colors.yellow}This is normal for Vercel free tier. Try again in a few minutes.${colors.reset}`);
  } else {
    console.log(`\n${colors.red}❌ Deployment not ready. All checks failed.${colors.reset}`);
    console.log(`${colors.red}This might be due to:${colors.reset}`);
    console.log(`${colors.red}- Deployment still in progress${colors.reset}`);
    console.log(`${colors.red}- Build failure${colors.reset}`);
    console.log(`${colors.red}- Network issues${colors.reset}`);
  }
  
  console.log(`\n${colors.blue}Next Steps:${colors.reset}`);
  console.log('1. Check Vercel dashboard: https://vercel.com/dashboard');
  console.log('2. Look for build logs and deployment status');
  console.log('3. Wait 2-5 minutes and run this script again');
  console.log(`4. Direct link to deployment: ${DEPLOYMENT_URL}`);
}

main();
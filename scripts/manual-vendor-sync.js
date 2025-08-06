#!/usr/bin/env node

/**
 * Manual vendor sync script
 * Run this to immediately sync vendors from Finale without waiting for the cron job
 * 
 * Usage: node scripts/manual-vendor-sync.js
 */

const https = require('https');

// Get the deployment URL from environment or use localhost
const baseUrl = process.env.VERCEL_URL 
  ? `https://${process.env.VERCEL_URL}`
  : process.env.DEPLOYMENT_URL 
  ? process.env.DEPLOYMENT_URL
  : 'https://inventory-po-manager.vercel.app';
const data = JSON.stringify({
  manual: true
});

const url = new URL(`${baseUrl}/api/sync-vendors`);

const options = {
  hostname: url.hostname,
  port: url.port || 443,
  path: url.pathname,
  method: 'POST',
  headers: {
    'Content-Type': 'application/json',
    'Content-Length': data.length
  },
  timeout: 300000 // 5 minute timeout
};

const req = https.request(options, (res) => {
  let responseData = '';

  res.on('data', (chunk) => {
    responseData += chunk;
  });

  res.on('end', () => {
    try {
      const result = JSON.parse(responseData);
      
      if (res.statusCode === 200 && result.success) {
        if (result.message) {
        }
      } else {
        console.error('❌ Vendor sync failed!');
        console.error(`Status: ${res.statusCode}`);
        if (result.error) {
          console.error(`Error: ${result.error}`);
        }
        if (result.errors) {
          console.error('Errors:', JSON.stringify(result.errors, null, 2));
        }
      }
    } catch (e) {
      console.error('❌ Failed to parse response:', e.message);
      console.error('Raw response:', responseData);
    }
  });
});

req.on('error', (error) => {
  console.error('❌ Request failed:', error.message);
});

req.on('timeout', () => {
  console.error('❌ Request timed out after 5 minutes');
  req.destroy();
});

console.log('⏳ Sending sync request (this may take a few minutes)...');
req.write(data);
req.end();
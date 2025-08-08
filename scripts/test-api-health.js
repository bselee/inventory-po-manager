#!/usr/bin/env node
/**
 * Test script to diagnose API health issues
 */

const https = require('https');
const http = require('http');

// Test configuration
const BASE_URL = process.env.API_BASE_URL || 'http://localhost:3000';
const isLocal = BASE_URL.includes('localhost');

const endpoints = [
  { path: '/api/inventory?limit=1', name: 'Inventory API' },
  { path: '/api/purchase-orders?limit=1', name: 'Purchase Orders API' },
  { path: '/api/vendors?limit=1', name: 'Vendors API' },
  { path: '/api/settings', name: 'Settings API' },
];

// Color codes for output
const colors = {
  green: '\x1b[32m',
  red: '\x1b[31m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  reset: '\x1b[0m'
};

function testEndpoint(endpoint) {
  return new Promise((resolve) => {
    const url = new URL(BASE_URL + endpoint.path);
    const protocol = url.protocol === 'https:' ? https : http;
    
    const startTime = Date.now();
    
    const req = protocol.get(url.href, { timeout: 5000 }, (res) => {
      let data = '';
      
      res.on('data', (chunk) => {
        data += chunk;
      });
      
      res.on('end', () => {
        const responseTime = Date.now() - startTime;
        
        try {
          const json = JSON.parse(data);
          const hasData = json.inventory || json.purchaseOrders || json.data || json.vendors;
          const hasError = json.error;
          
          resolve({
            endpoint: endpoint.name,
            status: res.statusCode,
            responseTime,
            hasData: !!hasData,
            hasError: !!hasError,
            errorMessage: hasError ? json.error : null,
            dataCount: hasData ? (
              json.inventory?.length || 
              json.purchaseOrders?.length || 
              json.vendors?.length ||
              json.data?.length || 
              0
            ) : 0
          });
        } catch (e) {
          resolve({
            endpoint: endpoint.name,
            status: res.statusCode,
            responseTime,
            hasData: false,
            hasError: true,
            errorMessage: 'Invalid JSON response',
            dataCount: 0
          });
        }
      });
    });
    
    req.on('error', (err) => {
      resolve({
        endpoint: endpoint.name,
        status: 0,
        responseTime: Date.now() - startTime,
        hasData: false,
        hasError: true,
        errorMessage: err.message,
        dataCount: 0
      });
    });
    
    req.on('timeout', () => {
      req.destroy();
      resolve({
        endpoint: endpoint.name,
        status: 0,
        responseTime: 5000,
        hasData: false,
        hasError: true,
        errorMessage: 'Request timeout',
        dataCount: 0
      });
    });
  });
}

async function runTests() {
  console.log(`\n${colors.blue}═══════════════════════════════════════════════════${colors.reset}`);
  console.log(`${colors.blue}     API Health Check - ${new Date().toLocaleString()}${colors.reset}`);
  console.log(`${colors.blue}     Testing: ${BASE_URL}${colors.reset}`);
  console.log(`${colors.blue}═══════════════════════════════════════════════════${colors.reset}\n`);
  
  const results = [];
  
  for (const endpoint of endpoints) {
    process.stdout.write(`Testing ${endpoint.name}... `);
    const result = await testEndpoint(endpoint);
    results.push(result);
    
    if (result.status === 200 && result.hasData) {
      console.log(`${colors.green}✓ OK${colors.reset} (${result.responseTime}ms, ${result.dataCount} items)`);
    } else if (result.status === 200 && !result.hasData) {
      console.log(`${colors.yellow}⚠ Empty${colors.reset} (${result.responseTime}ms)`);
    } else if (result.status > 0) {
      console.log(`${colors.red}✗ Failed${colors.reset} (Status: ${result.status}, ${result.errorMessage})`);
    } else {
      console.log(`${colors.red}✗ Error${colors.reset} (${result.errorMessage})`);
    }
  }
  
  console.log(`\n${colors.blue}═══════════════════════════════════════════════════${colors.reset}`);
  console.log(`${colors.blue}                    SUMMARY${colors.reset}`);
  console.log(`${colors.blue}═══════════════════════════════════════════════════${colors.reset}\n`);
  
  const working = results.filter(r => r.status === 200 && r.hasData).length;
  const empty = results.filter(r => r.status === 200 && !r.hasData).length;
  const failed = results.filter(r => r.status !== 200 || r.hasError).length;
  
  console.log(`${colors.green}✓ Working APIs:${colors.reset} ${working}/${endpoints.length}`);
  console.log(`${colors.yellow}⚠ Empty responses:${colors.reset} ${empty}/${endpoints.length}`);
  console.log(`${colors.red}✗ Failed APIs:${colors.reset} ${failed}/${endpoints.length}`);
  
  // Diagnosis
  console.log(`\n${colors.blue}═══════════════════════════════════════════════════${colors.reset}`);
  console.log(`${colors.blue}                   DIAGNOSIS${colors.reset}`);
  console.log(`${colors.blue}═══════════════════════════════════════════════════${colors.reset}\n`);
  
  if (failed === endpoints.length) {
    console.log(`${colors.red}❌ Critical Issue:${colors.reset} All APIs are failing`);
    console.log(`   - Check if the server is running: npm run dev`);
    console.log(`   - Check environment variables in .env.local`);
    console.log(`   - Check for build errors: npm run build`);
  } else if (working === 0 && empty > 0) {
    console.log(`${colors.yellow}⚠️  Data Flow Issue:${colors.reset} APIs respond but return no data`);
    console.log(`   - Check Finale API credentials`);
    console.log(`   - Check Redis connection (if configured)`);
    console.log(`   - Check Supabase connection`);
    console.log(`   - Run: npm run cache:clear && npm run cache:warm`);
  } else if (working < endpoints.length) {
    console.log(`${colors.yellow}⚠️  Partial Issue:${colors.reset} Some APIs are not working properly`);
    
    results.filter(r => r.hasError).forEach(r => {
      console.log(`\n   ${r.endpoint}:`);
      console.log(`   - Error: ${r.errorMessage}`);
    });
  } else {
    console.log(`${colors.green}✅ All APIs are working correctly!${colors.reset}`);
  }
  
  console.log(`\n${colors.blue}═══════════════════════════════════════════════════${colors.reset}\n`);
  
  // Exit with appropriate code
  process.exit(failed === endpoints.length ? 1 : 0);
}

// Check if server is running first
if (isLocal) {
  const url = new URL(BASE_URL);
  const protocol = url.protocol === 'https:' ? https : http;
  
  protocol.get(BASE_URL, { timeout: 2000 }, (res) => {
    runTests();
  }).on('error', (err) => {
    console.log(`\n${colors.red}❌ Server is not running at ${BASE_URL}${colors.reset}`);
    console.log(`\nPlease start the server first:`);
    console.log(`  ${colors.green}npm run dev${colors.reset}\n`);
    process.exit(1);
  });
} else {
  runTests();
}
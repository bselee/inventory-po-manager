#!/usr/bin/env node

/**
 * Finale Authentication Debugger
 * This script helps debug all possible Finale authentication methods
 * Usage: node scripts/finale-auth-debug.js
 */

const readline = require('readline');
const https = require('https');

const rl = readline.createInterface({
  input: process.stdin,
  output: process.stdout
});

const question = (query) => new Promise((resolve) => rl.question(query, resolve));

// Colors for output
const colors = {
  reset: '\x1b[0m',
  bright: '\x1b[1m',
  green: '\x1b[32m',
  red: '\x1b[31m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  cyan: '\x1b[36m'
};

function log(message, color = colors.reset) {
  console.log(color + message + colors.reset);
}

async function makeRequest(options, postData = null) {
  return new Promise((resolve, reject) => {
    const req = https.request(options, (res) => {
      let data = '';
      res.on('data', (chunk) => data += chunk);
      res.on('end', () => {
        resolve({
          status: res.statusCode,
          statusMessage: res.statusMessage,
          headers: res.headers,
          data: data,
          cookies: res.headers['set-cookie']
        });
      });
    });
    
    req.on('error', reject);
    
    if (postData) {
      req.write(postData);
    }
    
    req.end();
  });
}

async function testFinaleAuth() {
  log('\n🔍 Finale Authentication Debugger', colors.bright);
  log('==================================\n', colors.bright);

  // Get account info
  log('First, let\'s identify your Finale account:', colors.cyan);
  log('Your Finale URL looks like: https://app.finaleinventory.com/[ACCOUNT]/sc2/', colors.yellow);
  log('Example: If your URL is https://app.finaleinventory.com/buildasoilorganics/sc2/', colors.yellow);
  log('Then your account path is: buildasoilorganics\n', colors.yellow);
  
  const accountPath = await question('Enter your account path (e.g., buildasoilorganics): ');
  
  // Clean the account path
  const cleanPath = accountPath
    .replace(/^https?:\/\//, '')
    .replace(/\.finaleinventory\.com.*$/, '')
    .replace(/^app\./, '')
    .replace(/\/$/, '')
    .trim();
  
  log(`\nUsing account path: ${cleanPath}`, colors.green);

  // Choose auth method
  log('\nWhich authentication method to test?', colors.cyan);
  log('1. API Key authentication');
  log('2. Username/Password authentication');
  log('3. Both methods');
  
  const choice = await question('\nEnter choice (1-3): ');

  const results = [];

  // Test API Key Auth
  if (choice === '1' || choice === '3') {
    log('\n📋 Testing API Key Authentication...', colors.bright);
    
    const apiKey = await question('Enter API Key: ');
    const apiSecret = await question('Enter API Secret: ');
    
    const authString = Buffer.from(`${apiKey}:${apiSecret}`).toString('base64');
    
    // Test different API endpoints
    const apiEndpoints = [
      `/api/${cleanPath}/product?limit=1`,
      `/${cleanPath}/api/product?limit=1`,
    ];
    
    for (const endpoint of apiEndpoints) {
      log(`\nTesting endpoint: https://app.finaleinventory.com${endpoint}`, colors.yellow);
      
      try {
        const result = await makeRequest({
          hostname: 'app.finaleinventory.com',
          path: endpoint,
          method: 'GET',
          headers: {
            'Authorization': `Basic ${authString}`,
            'Accept': 'application/json',
            'Content-Type': 'application/json'
          }
        });
        
        log(`Status: ${result.status} ${result.statusMessage}`, result.status === 200 ? colors.green : colors.red);
        
        if (result.status === 200) {
          log('✅ API Key authentication successful!', colors.green);
          try {
            const data = JSON.parse(result.data);
            log(`Received ${Array.isArray(data) ? data.length : 'unknown'} products`, colors.green);
          } catch (e) {
            log('Response preview: ' + result.data.substring(0, 100), colors.yellow);
          }
          results.push({ method: 'API Key', endpoint, success: true });
          break;
        } else {
          log('Response: ' + result.data.substring(0, 200), colors.red);
          results.push({ method: 'API Key', endpoint, success: false, error: result.data });
        }
      } catch (error) {
        log(`Error: ${error.message}`, colors.red);
        results.push({ method: 'API Key', endpoint, success: false, error: error.message });
      }
    }
  }

  // Test Username/Password Auth
  if (choice === '2' || choice === '3') {
    log('\n📋 Testing Username/Password Authentication...', colors.bright);
    
    const username = await question('Enter Username: ');
    const password = await question('Enter Password: ');
    
    // Test different auth endpoints
    const authEndpoints = [
      { path: `/${cleanPath}/j_spring_security_check`, desc: 'Spring Security endpoint' },
      { path: `/${cleanPath}/auth`, desc: 'Standard auth endpoint' },
      { path: `/auth`, desc: 'Root auth endpoint' }
    ];
    
    for (const { path, desc } of authEndpoints) {
      log(`\nTesting ${desc}: https://app.finaleinventory.com${path}`, colors.yellow);
      
      try {
        const postData = `j_username=${encodeURIComponent(username)}&j_password=${encodeURIComponent(password)}`;
        
        const result = await makeRequest({
          hostname: 'app.finaleinventory.com',
          path: path,
          method: 'POST',
          headers: {
            'Content-Type': 'application/x-www-form-urlencoded',
            'Content-Length': Buffer.byteLength(postData),
            'Accept': '*/*'
          }
        }, postData);
        
        log(`Status: ${result.status} ${result.statusMessage}`, colors.yellow);
        
        if (result.cookies) {
          log('✅ Received cookies:', colors.green);
          result.cookies.forEach(cookie => {
            if (cookie.includes('JSESSIONID')) {
              log(`  - Session ID: ${cookie.split(';')[0]}`, colors.green);
            }
          });
          results.push({ method: 'Session', endpoint: path, success: true });
        }
        
        if (result.headers.location) {
          log(`Redirect to: ${result.headers.location}`, colors.blue);
        }
        
        if (result.status === 200 || result.status === 302 || result.cookies) {
          log('✅ Authentication might be successful!', colors.green);
          
          // Try to access API with session
          if (result.cookies) {
            const sessionCookie = result.cookies.find(c => c.includes('JSESSIONID'));
            if (sessionCookie) {
              log('\nTesting API access with session...', colors.yellow);
              
              const apiResult = await makeRequest({
                hostname: 'app.finaleinventory.com',
                path: `/${cleanPath}/api/product?limit=1`,
                method: 'GET',
                headers: {
                  'Cookie': sessionCookie.split(';')[0],
                  'Accept': 'application/json'
                }
              });
              
              if (apiResult.status === 200) {
                log('✅ API access with session successful!', colors.green);
              } else {
                log(`❌ API access failed: ${apiResult.status}`, colors.red);
              }
            }
          }
          break;
        }
      } catch (error) {
        log(`Error: ${error.message}`, colors.red);
        results.push({ method: 'Session', endpoint: path, success: false, error: error.message });
      }
    }
  }

  // Summary
  log('\n📊 Summary:', colors.bright);
  log('===========', colors.bright);
  
  const successful = results.filter(r => r.success);
  
  if (successful.length > 0) {
    log('\n✅ Working authentication methods:', colors.green);
    successful.forEach(r => {
      log(`  - ${r.method} at ${r.endpoint}`, colors.green);
    });
  } else {
    log('\n❌ No authentication methods succeeded', colors.red);
  }
  
  log('\n💡 Recommendations:', colors.cyan);
  
  if (successful.some(r => r.method === 'API Key')) {
    log('  - API Key authentication is working. Use this for the application.', colors.green);
    log(`  - Your base URL should be: https://app.finaleinventory.com/api/${cleanPath}`, colors.green);
  } else {
    log('  - Check your API credentials in Finale: Settings > Integrations > API', colors.yellow);
    log('  - Ensure API access is enabled for your account', colors.yellow);
    log(`  - Verify your account path is correct: ${cleanPath}`, colors.yellow);
  }
  
  if (successful.some(r => r.method === 'Session')) {
    log('  - Session authentication is working for reports access', colors.green);
  }
  
  log('\n📝 Configuration for your app:', colors.cyan);
  log(`  Account Path: ${cleanPath}`, colors.yellow);
  log('  Do NOT include "app" or the full URL, just the account identifier', colors.yellow);
  
  rl.close();
}

// Run the debugger
testFinaleAuth().catch(console.error);
#!/usr/bin/env node

/**
 * Finale API Test Script
 * This script helps debug Finale API connection issues
 * Usage: node scripts/test-finale-api.js
 */

const readline = require('readline');

const rl = readline.createInterface({
  input: process.stdin,
  output: process.stdout
});

const question = (query) => new Promise((resolve) => rl.question(query, resolve));

async function testFinaleAPI() {
  console.log('🔍 Finale API Connection Tester');
  console.log('================================\n');

  // Get credentials
  const apiKey = await question('Enter Finale API Key: ');
  const apiSecret = await question('Enter Finale API Secret: ');
  const accountPath = await question('Enter Finale Account Path (e.g., "yourcompany"): ');

  console.log('\n📋 Testing with credentials:');
  console.log(`   Account Path: ${accountPath}`);
  console.log(`   API Key: ${apiKey.substring(0, 8)}...`);
  console.log(`   API Secret: ${apiSecret ? '***' : '(empty)'}\n`);

  // Build auth header
  const authString = Buffer.from(`${apiKey}:${apiSecret}`).toString('base64');
  const headers = {
    'Authorization': `Basic ${authString}`,
    'Content-Type': 'application/json',
    'Accept': 'application/json'
  };

  // Test different URL formats
  const urlVariations = [
    {
      name: 'Standard format',
      url: `https://app.finaleinventory.com/api/${accountPath}/product?limit=1`
    },
    {
      name: 'Without limit',
      url: `https://app.finaleinventory.com/api/${accountPath}/product`
    },
    {
      name: 'With trailing slash',
      url: `https://app.finaleinventory.com/api/${accountPath}/product/`
    },
    {
      name: 'Vendor endpoint',
      url: `https://app.finaleinventory.com/api/${accountPath}/vendors?limit=1`
    }
  ];

  console.log('🧪 Testing different API endpoints...\n');

  for (const variant of urlVariations) {
    console.log(`Testing: ${variant.name}`);
    console.log(`URL: ${variant.url}`);
    
    try {
      const response = await fetch(variant.url, {
        method: 'GET',
        headers: headers
      });

      console.log(`Status: ${response.status} ${response.statusText}`);
      
      if (response.ok) {
        const contentType = response.headers.get('content-type');
        console.log(`Content-Type: ${contentType}`);
        
        if (contentType && contentType.includes('application/json')) {
          const data = await response.json();
          console.log(`✅ Success! Received ${Array.isArray(data) ? data.length : 'unknown'} items`);
          
          if (Array.isArray(data) && data.length > 0) {
            console.log('Sample data structure:', JSON.stringify(data[0], null, 2).substring(0, 200) + '...');
          }
        } else {
          const text = await response.text();
          console.log(`Response (first 200 chars): ${text.substring(0, 200)}`);
        }
      } else {
        const errorText = await response.text();
        console.log(`❌ Error response: ${errorText || '(empty)'}`);
        
        // Check response headers for clues
        console.log('Response headers:');
        response.headers.forEach((value, key) => {
          if (key.toLowerCase().includes('error') || key.toLowerCase().includes('message')) {
            console.log(`  ${key}: ${value}`);
          }
        });
      }
    } catch (error) {
      console.log(`❌ Request failed: ${error.message}`);
    }
    
    console.log('---\n');
  }

  // Test with curl command for comparison
  console.log('📝 Equivalent curl command:');
  console.log(`curl -X GET "https://app.finaleinventory.com/api/${accountPath}/product?limit=1" \\`);
  console.log(`  -H "Authorization: Basic ${authString}" \\`);
  console.log(`  -H "Content-Type: application/json" \\`);
  console.log(`  -H "Accept: application/json"\n`);

  // Common issues and solutions
  console.log('🔧 Common Issues and Solutions:');
  console.log('1. 401 Unauthorized - Check API key and secret are correct');
  console.log('2. 404 Not Found - Verify account path is correct (no "https://" or ".finaleinventory.com")');
  console.log('3. 403 Forbidden - Check API permissions in Finale settings');
  console.log('4. Empty response - API might be rate limited or experiencing issues');
  console.log('5. SSL/TLS errors - Check if your network allows HTTPS connections');

  rl.close();
}

// Run the test
testFinaleAPI().catch(console.error);
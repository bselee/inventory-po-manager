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
  // Get credentials
  const apiKey = await question('Enter Finale API Key: ');
  const apiSecret = await question('Enter Finale API Secret: ');
  const accountPath = await question('Enter Finale Account Path (e.g., "yourcompany"): ');
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
  for (const variant of urlVariations) {
    try {
      const response = await fetch(variant.url, {
        method: 'GET',
        headers: headers
      });
      if (response.ok) {
        const contentType = response.headers.get('content-type');
        if (contentType && contentType.includes('application/json')) {
          const data = await response.json();
          if (Array.isArray(data) && data.length > 0) {
            console.log('Sample data structure:', JSON.stringify(data[0], null, 2).substring(0, 200) + '...');
          }
        } else {
          const text = await response.text();
        }
      } else {
        const errorText = await response.text();
        // Check response headers for clues
        response.headers.forEach((value, key) => {
          if (key.toLowerCase().includes('error') || key.toLowerCase().includes('message')) {
          }
        });
      }
    } catch (error) {
    }
  }

  // Test with curl command for comparison
  // Common issues and solutions
  console.log('2. 404 Not Found - Verify account path is correct (no "https://" or ".finaleinventory.com")');
  rl.close();
}

// Run the test
testFinaleAPI().catch(console.error);
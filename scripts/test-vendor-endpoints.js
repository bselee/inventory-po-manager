#!/usr/bin/env node

const fetch = require('node-fetch');
require('dotenv').config();

async function testVendorEndpoints() {
  console.log('🔍 Testing Finale vendor endpoints...\n');

  const apiKey = process.env.FINALE_API_KEY;
  const apiSecret = process.env.FINALE_API_SECRET;
  const accountPath = process.env.FINALE_ACCOUNT_PATH;

  if (!apiKey || !apiSecret || !accountPath) {
    console.error('❌ Missing Finale credentials in .env file');
    return;
  }

  const authHeader = `Basic ${Buffer.from(`${apiKey}:${apiSecret}`).toString('base64')}`;
  const baseUrl = `https://app.finaleinventory.com/${accountPath}/api`;

  // Different vendor endpoint patterns to try
  const endpoints = [
    '/party',          // This is what Finale actually uses for vendors
    '/parties',        // Plural version
    '/vendor',         // Singular
    '/vendors',        // Plural
    '/supplier',       // Alternative name
    '/suppliers',      // Alternative plural
    '/partner',        // Another alternative
    '/partners'        // Another alternative plural
  ];

  console.log(`📍 Base URL: ${baseUrl}`);
  console.log(`🔑 Account: ${accountPath}\n`);

  for (const endpoint of endpoints) {
    const url = `${baseUrl}${endpoint}`;
    console.log(`Testing: ${endpoint}`);
    
    try {
      const response = await fetch(url, {
        headers: {
          'Authorization': authHeader,
          'Accept': 'application/json'
        }
      });

      if (response.ok) {
        const data = await response.json();
        console.log(`  ✅ SUCCESS! Status: ${response.status}`);
        
        // Check data structure
        if (Array.isArray(data)) {
          console.log(`  📊 Returns array with ${data.length} items`);
        } else if (data.partyId && Array.isArray(data.partyId)) {
          console.log(`  📊 Parallel array format with ${data.partyId.length} vendors`);
          console.log(`  🔑 Available fields:`, Object.keys(data).slice(0, 10).join(', '));
        } else {
          console.log(`  📊 Data structure:`, Object.keys(data).slice(0, 10).join(', '));
        }
        console.log('');
        
        // Found working endpoint!
        return { endpoint, data };
      } else {
        console.log(`  ❌ Failed: ${response.status} ${response.statusText}`);
        
        // Try to get error details
        try {
          const errorText = await response.text();
          if (errorText && errorText.length < 200) {
            console.log(`  💬 Response: ${errorText}`);
          }
        } catch (e) {
          // Ignore parse errors
        }
        console.log('');
      }
    } catch (error) {
      console.log(`  ❌ Network error: ${error.message}`);
      console.log('');
    }
  }

  console.log('\n😞 No working vendor endpoint found');
  console.log('💡 Try checking the Finale API documentation or contact support');
}

// Run the test
testVendorEndpoints();
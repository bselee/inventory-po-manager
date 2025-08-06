#!/usr/bin/env node

const fetch = require('node-fetch');
require('dotenv').config();

async function testVendorEndpoints() {
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
  for (const endpoint of endpoints) {
    const url = `${baseUrl}${endpoint}`;
    try {
      const response = await fetch(url, {
        headers: {
          'Authorization': authHeader,
          'Accept': 'application/json'
        }
      });

      if (response.ok) {
        const data = await response.json();
        // Check data structure
        if (Array.isArray(data)) {
        } else if (data.partyId && Array.isArray(data.partyId)) {
          console.log(`  🔑 Available fields:`, Object.keys(data).slice(0, 10).join(', '));
        } else {
          console.log(`  📊 Data structure:`, Object.keys(data).slice(0, 10).join(', '));
        }
        // Found working endpoint!
        return { endpoint, data };
      } else {
        // Try to get error details
        try {
          const errorText = await response.text();
          if (errorText && errorText.length < 200) {
          }
        } catch (e) {
          // Ignore parse errors
        }
      }
    } catch (error) {
    }
  }
}

// Run the test
testVendorEndpoints();
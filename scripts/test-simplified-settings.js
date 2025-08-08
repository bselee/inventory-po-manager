#!/usr/bin/env node

const fs = require('fs');
const path = require('path');

console.log('=== Testing Simplified Settings System ===\n');

// Load environment variables
require('dotenv').config();

// Test 1: Check environment variables
console.log('1. Environment Variables:');
console.log('   FINALE_API_KEY:', process.env.FINALE_API_KEY ? '✓ Set' : '✗ Not set');
console.log('   FINALE_API_SECRET:', process.env.FINALE_API_SECRET ? '✓ Set' : '✗ Not set');
console.log('   FINALE_ACCOUNT_PATH:', process.env.FINALE_ACCOUNT_PATH || 'Not set');

// Clean the account path
if (process.env.FINALE_ACCOUNT_PATH) {
  const cleanPath = process.env.FINALE_ACCOUNT_PATH
    .replace('https://', '')
    .replace('http://', '')
    .replace('app.finaleinventory.com/', '')
    .replace(/\/.*$/, '')
    .trim();
  console.log('   Cleaned path:', cleanPath);
}

console.log('\n2. Settings Files:');

// Check for settings file
const SETTINGS_FILE = path.join(process.cwd(), '.settings.json');
if (fs.existsSync(SETTINGS_FILE)) {
  console.log('   .settings.json: ✓ Exists');
  const settings = JSON.parse(fs.readFileSync(SETTINGS_FILE, 'utf-8'));
  console.log('   Contents:', JSON.stringify(settings, null, 2));
} else {
  console.log('   .settings.json: ✗ Not found (will use defaults from env)');
}

// Check for sync status file
const SYNC_STATUS_FILE = path.join(process.cwd(), '.sync-status.json');
if (fs.existsSync(SYNC_STATUS_FILE)) {
  console.log('   .sync-status.json: ✓ Exists');
  const status = JSON.parse(fs.readFileSync(SYNC_STATUS_FILE, 'utf-8'));
  console.log('   Last sync:', status.lastSync || 'Never');
} else {
  console.log('   .sync-status.json: ✗ Not found (will be created on first sync)');
}

// Check for inventory cache
const INVENTORY_CACHE_FILE = path.join(process.cwd(), '.inventory-cache.json');
if (fs.existsSync(INVENTORY_CACHE_FILE)) {
  console.log('   .inventory-cache.json: ✓ Exists');
  const cache = JSON.parse(fs.readFileSync(INVENTORY_CACHE_FILE, 'utf-8'));
  console.log('   Cached items:', cache.items ? cache.items.length : 0);
  console.log('   Last updated:', cache.lastSync || 'Unknown');
} else {
  console.log('   .inventory-cache.json: ✗ Not found (will be created after first sync)');
}

console.log('\n3. API Test (if credentials available):');
if (process.env.FINALE_API_KEY && process.env.FINALE_API_SECRET && process.env.FINALE_ACCOUNT_PATH) {
  const cleanPath = process.env.FINALE_ACCOUNT_PATH
    .replace('https://', '')
    .replace('http://', '')
    .replace('app.finaleinventory.com/', '')
    .replace(/\/.*$/, '')
    .trim();
  
  const testUrl = `https://app.finaleinventory.com/${cleanPath}/api/products?limit=1`;
  const authHeader = 'Basic ' + Buffer.from(`${process.env.FINALE_API_KEY}:${process.env.FINALE_API_SECRET}`).toString('base64');
  
  console.log('   Testing connection to:', testUrl);
  
  fetch(testUrl, {
    headers: {
      'Authorization': authHeader,
      'Accept': 'application/json'
    }
  })
  .then(response => {
    if (response.ok) {
      console.log('   ✓ Connection successful! API is working.');
    } else {
      console.log('   ✗ Connection failed:', response.status, response.statusText);
    }
  })
  .catch(error => {
    console.log('   ✗ Connection error:', error.message);
  });
} else {
  console.log('   Skipping - credentials not configured');
}

console.log('\n=== Test Complete ===');
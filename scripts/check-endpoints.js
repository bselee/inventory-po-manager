#!/usr/bin/env node

const BASE_URL = 'https://inventory-po-manager.vercel.app';

const endpoints = [
  '/api/debug-sync-status',
  '/api/debug-settings', 
  '/api/test-inventory-data',
  '/api/sync-finale',
  '/api/check-settings'
];

async function checkEndpoint(path) {
  try {
    const response = await fetch(BASE_URL + path);
    const data = await response.json();
    console.log('📦 Response:', JSON.stringify(data, null, 2));
  } catch (error) {
  }
}

async function main() {
  for (const endpoint of endpoints) {
    await checkEndpoint(endpoint);
    console.log('\n' + '='.repeat(50));
  }
}

main().catch(console.error);
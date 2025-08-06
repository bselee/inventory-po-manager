#!/usr/bin/env node

/**
 * Settings Page Verification Script
 * Tests all the improvements made to the settings page
 */

const BASE_URL = 'http://localhost:3003';

async function testAPI(endpoint, method = 'GET', body = null) {
  try {
    const options = {
      method,
      headers: { 'Content-Type': 'application/json' }
    };
    
    if (body) {
      options.body = JSON.stringify(body);
    }

    const response = await fetch(`${BASE_URL}${endpoint}`, options);
    const data = await response.json();
    
    return {
      success: response.ok,
      status: response.status,
      data
    };
  } catch (error) {
    return {
      success: false,
      error: error.message
    };
  }
}

async function runTests() {
  // Test 1: Sync Status Monitor
  const syncStatus = await testAPI('/api/sync-status-monitor');
  if (syncStatus.success) {
  } else {
  }

  // Test 2: Settings page accessibility 
  try {
    const response = await fetch(`${BASE_URL}/settings`);
    if (response.ok) {
    } else {
    }
  } catch (error) {
  }

  // Test 3: Finale API endpoints
  const finaleTest = await testAPI('/api/finale/vendors');
  if (finaleTest.success) {
  } else {
    console.log('⚠️  Finale vendors API (expected - needs credentials)');
  }

  // Test 4: Manual sync cleanup (if stuck syncs exist)
  if (syncStatus.success && syncStatus.data.hasStuckSyncs) {
    const cleanup = await testAPI('/api/sync-status-monitor', 'POST', { cleanup: true });
    if (cleanup.success) {
    } else {
    }
  } else {
    console.log('ℹ️  No stuck syncs to clean up (good!)');
  }
}

// Handle both direct execution and module import
if (require.main === module) {
  runTests().catch(console.error);
}

module.exports = { runTests };

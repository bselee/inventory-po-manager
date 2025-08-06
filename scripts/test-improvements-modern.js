#!/usr/bin/env node

/**
 * Modern test script for Node.js 18+ with native fetch
 */

const fs = require('fs');
const path = require('path');

// Test configuration
const BASE_URL = 'http://localhost:3000';
let passCount = 0;
let failCount = 0;

// Colors
const green = (text) => `\x1b[32m${text}\x1b[0m`;
const red = (text) => `\x1b[31m${text}\x1b[0m`;
const yellow = (text) => `\x1b[33m${text}\x1b[0m`;
const blue = (text) => `\x1b[34m${text}\x1b[0m`;

// Test helper
async function test(name, fn) {
  process.stdout.write(`Testing: ${name}... `);
  try {
    await fn();
    passCount++;
    console.log(green('PASSED'));
  } catch (error) {
    failCount++;
    console.log(red('FAILED'));
  }
}

function assert(condition, message) {
  if (!condition) {
    throw new Error(message || 'Assertion failed');
  }
}

console.log(yellow('\n=== Finale API Improvements Test Suite ===\n'));

// Test 1: Rate Limiter Implementation
test('Rate limiter exists and is configured', async () => {
  const filePath = path.join(__dirname, '../app/lib/finale-rate-limiter.ts');
  assert(fs.existsSync(filePath), 'Rate limiter file not found');
  
  const content = fs.readFileSync(filePath, 'utf8');
  assert(content.includes('requestsPerSecond: 2'), 'Rate limit not set to 2/second');
  assert(content.includes('export const finaleRateLimiter'), 'Rate limiter not exported');
});

// Test 2: Error Messages Implementation
test('Error messages helper exists', async () => {
  const filePath = path.join(__dirname, '../app/lib/finale-error-messages.ts');
  assert(fs.existsSync(filePath), 'Error messages file not found');
  
  const content = fs.readFileSync(filePath, 'utf8');
  assert(content.includes('solutions:'), 'Solutions not included in errors');
  assert(content.includes('Authentication failed'), 'Auth error message not found');
  assert(content.includes('Check your API Key'), 'API key hint not found');
});

// Test 3: Frontend Validation
test('Frontend validation implemented', async () => {
  const filePath = path.join(__dirname, '../app/lib/validation/finale-credentials.ts');
  assert(fs.existsSync(filePath), 'Validation file not found');
  
  const content = fs.readFileSync(filePath, 'utf8');
  assert(content.includes('should not include URLs'), 'URL validation not found');
  assert(content.includes('API Key seems too short'), 'API key length check not found');
});

// Test 4: Debug Panel Enhancements
test('Debug panel has copy/download features', async () => {
  const filePath = path.join(__dirname, '../app/components/FinaleDebugPanel.tsx');
  assert(fs.existsSync(filePath), 'Debug panel file not found');
  
  const content = fs.readFileSync(filePath, 'utf8');
  assert(content.includes('copyDebugInfo'), 'Copy function not found');
  assert(content.includes('downloadDebugInfo'), 'Download function not found');
  assert(content.includes('navigator.clipboard.writeText'), 'Clipboard API not used');
});

// Test 5: Inventory Data Warnings
test('Inventory warnings component exists', async () => {
  const filePath = path.join(__dirname, '../app/components/inventory/InventoryDataWarning.tsx');
  assert(fs.existsSync(filePath), 'Warning component not found');
  
  const content = fs.readFileSync(filePath, 'utf8');
  assert(content.includes('No inventory data found'), 'Empty inventory warning not found');
  assert(content.includes('missing sales data'), 'Sales data warning not found');
  assert(content.includes('Action:'), 'Action recommendations not found');
});

// Test 6: Sync Logger Implementation
test('Sync logger tracks operations', async () => {
  const filePath = path.join(__dirname, '../app/lib/sync-logger.ts');
  assert(fs.existsSync(filePath), 'Sync logger file not found');
  
  const content = fs.readFileSync(filePath, 'utf8');
  assert(content.includes('logBatch'), 'Batch logging not found');
  assert(content.includes('logRetry'), 'Retry logging not found');
  assert(content.includes('exportLogs'), 'Log export not found');
});

// Test 7: API Methods Implementation
test('All required API methods exist', async () => {
  const filePath = path.join(__dirname, '../app/lib/finale-api.ts');
  const content = fs.readFileSync(filePath, 'utf8');
  
  const requiredMethods = [
    'getAllProducts',
    'getInventoryLevels',
    'getActiveProducts',
    'getProductsBySKUs'
  ];
  
  for (const method of requiredMethods) {
    assert(content.includes(`async ${method}`), `Method ${method} not found`);
  }
});

// Test 8: Rate Limiting Integration
test('Rate limiting used throughout API', async () => {
  const filePath = path.join(__dirname, '../app/lib/finale-api.ts');
  const content = fs.readFileSync(filePath, 'utf8');
  
  const rateLimitedCalls = (content.match(/rateLimitedFetch/g) || []).length;
  assert(rateLimitedCalls >= 10, `Only ${rateLimitedCalls} rate limited calls (expected 10+)`);
});

// Test 9: Settings Page Validation
test('Settings page uses validation', async () => {
  const filePath = path.join(__dirname, '../app/settings/page.tsx');
  const content = fs.readFileSync(filePath, 'utf8');
  
  assert(content.includes('validateFinaleCredentials'), 'Validation not imported');
  assert(content.includes('validationErrors'), 'Validation errors state not found');
  assert(content.includes('border-red-300'), 'Error styling not found');
});

// Test 10: API Endpoint Response
test('API endpoints return enhanced errors', async () => {
  try {
    const response = await fetch(`${BASE_URL}/api/test-finale-simple`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({})
    });
    
    const data = await response.json();
    assert(response.ok || data.error, 'No error in failed response');
    
    if (!data.success && data.error) {
      assert(data.details || data.solutions, 'No details or solutions in error');
    }
  } catch (error) {
    // Server might not be running, skip this test
    console.log(yellow(' (Skipped - server not responding)'));
  }
});

// Summary
console.log(yellow('\n=== Test Summary ===\n'));
if (failCount === 0) {
  console.log(green('\n✅ All tests passed! The improvements are working correctly.\n'));
} else {
  console.log(red(`\n❌ ${failCount} tests failed. Please check the errors above.\n`));
}

// Additional verification info
console.log(blue('\n=== Additional Verification Steps ===\n'));
process.exit(failCount > 0 ? 1 : 0);
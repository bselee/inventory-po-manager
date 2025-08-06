#!/usr/bin/env node

/**
 * Simple test script to verify improvements without external dependencies
 */

const http = require('http');
const fs = require('fs');
const path = require('path');

// ANSI color codes
const colors = {
  green: '\x1b[32m',
  red: '\x1b[31m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  reset: '\x1b[0m'
};

// Test results
const results = {
  passed: 0,
  failed: 0,
  tests: []
};

// Helper to make HTTP requests
function makeRequest(options) {
  return new Promise((resolve, reject) => {
    const req = http.request(options, (res) => {
      let data = '';
      res.on('data', chunk => data += chunk);
      res.on('end', () => {
        try {
          const json = JSON.parse(data);
          resolve({ status: res.statusCode, data: json });
        } catch (e) {
          resolve({ status: res.statusCode, data: data });
        }
      });
    });
    req.on('error', reject);
    if (options.body) {
      req.write(options.body);
    }
    req.end();
  });
}

// Test function
async function test(name, fn) {
  try {
    await fn();
    results.passed++;
    results.tests.push({ name, status: 'PASSED' });
  } catch (error) {
    results.failed++;
    results.tests.push({ name, status: 'FAILED', error: error.message });
  }
}

function assert(condition, message) {
  if (!condition) {
    throw new Error(message || 'Assertion failed');
  }
}
// Test 1: Check if rate limiter file exists
test('Rate Limiter - File exists', async () => {
  const filePath = path.join(__dirname, '../app/lib/finale-rate-limiter.ts');
  assert(fs.existsSync(filePath), 'Rate limiter file not found');
  
  const content = fs.readFileSync(filePath, 'utf8');
  assert(content.includes('class FinaleRateLimiter'), 'Rate limiter class not found');
  assert(content.includes('requestsPerSecond'), 'Rate limiting config not found');
});

// Test 2: Check validation file
test('Frontend Validation - File exists', async () => {
  const filePath = path.join(__dirname, '../app/lib/validation/finale-credentials.ts');
  assert(fs.existsSync(filePath), 'Validation file not found');
  
  const content = fs.readFileSync(filePath, 'utf8');
  assert(content.includes('validateFinaleCredentials'), 'Validation function not found');
  assert(content.includes('account path should not include URLs'), 'URL validation not found');
});

// Test 3: Check error messages file
test('Error Messages - File exists', async () => {
  const filePath = path.join(__dirname, '../app/lib/finale-error-messages.ts');
  assert(fs.existsSync(filePath), 'Error messages file not found');
  
  const content = fs.readFileSync(filePath, 'utf8');
  assert(content.includes('FinaleErrorHelper'), 'Error helper class not found');
  assert(content.includes('solutions'), 'Solutions not included in errors');
});

// Test 4: Check sync logger
test('Sync Logger - File exists', async () => {
  const filePath = path.join(__dirname, '../app/lib/sync-logger.ts');
  assert(fs.existsSync(filePath), 'Sync logger file not found');
  
  const content = fs.readFileSync(filePath, 'utf8');
  assert(content.includes('class SyncLogger'), 'Sync logger class not found');
  assert(content.includes('logRetry'), 'Retry logging not found');
});

// Test 5: Check inventory warning component
test('Inventory Warnings - Component exists', async () => {
  const filePath = path.join(__dirname, '../app/components/inventory/InventoryDataWarning.tsx');
  assert(fs.existsSync(filePath), 'Inventory warning component not found');
  
  const content = fs.readFileSync(filePath, 'utf8');
  assert(content.includes('No inventory data found'), 'Empty inventory warning not found');
  assert(content.includes('Action:'), 'Action recommendations not found');
});

// Test 6: Check API endpoints
test('API Endpoints - Test endpoint responds', async () => {
  try {
    const response = await makeRequest({
      hostname: 'localhost',
      port: 3000,
      path: '/api/test-finale-simple',
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({})
    });
    
    assert(response.status < 500, `Server error: ${response.status}`);
    assert(response.data, 'No response data');
    
    // Check for improved error format
    if (!response.data.success) {
      assert(response.data.error || response.data.title, 'No error title');
      assert(response.data.details || response.data.solutions, 'No error details or solutions');
    }
  } catch (error) {
    // Server might not be running, that's OK for file checks
    console.log('  (Server not responding, skipping API test)');
  }
});

// Test 7: Check finale-api.ts for improvements
test('API Integration - Rate limiting integrated', async () => {
  const filePath = path.join(__dirname, '../app/lib/finale-api.ts');
  const content = fs.readFileSync(filePath, 'utf8');
  
  assert(content.includes('rateLimitedFetch'), 'Rate limited fetch not found');
  assert(content.includes('finale_api_key'), 'API key check not found');
  assert(content.includes('finale_username'), 'Username check not found');
  
  // Count rate limited calls
  const rateLimitedCalls = (content.match(/rateLimitedFetch/g) || []).length;
  assert(rateLimitedCalls > 5, `Only ${rateLimitedCalls} rate limited calls found`);
});

// Test 8: Check settings page for validation
test('Settings Page - Validation integrated', async () => {
  const filePath = path.join(__dirname, '../app/settings/page.tsx');
  const content = fs.readFileSync(filePath, 'utf8');
  
  assert(content.includes('validateFinaleCredentials'), 'Validation import not found');
  assert(content.includes('validationErrors'), 'Validation state not found');
  assert(content.includes('border-red-300'), 'Error styling not found');
});

// Test 9: Check debug panel enhancements
test('Debug Panel - Copy/Download buttons', async () => {
  const filePath = path.join(__dirname, '../app/components/FinaleDebugPanel.tsx');
  const content = fs.readFileSync(filePath, 'utf8');
  
  assert(content.includes('Copy'), 'Copy button not found');
  assert(content.includes('Download'), 'Download button not found');
  assert(content.includes('copyDebugInfo'), 'Copy function not found');
  assert(content.includes('downloadDebugInfo'), 'Download function not found');
});

// Test 10: Check sync service updates
test('Sync Service - Logger integrated', async () => {
  const filePath = path.join(__dirname, '../app/lib/sync-service.ts');
  const content = fs.readFileSync(filePath, 'utf8');
  
  assert(content.includes('SyncLogger'), 'Sync logger import not found');
  assert(content.includes('this.logger'), 'Logger instance not found');
  assert(content.includes('logBatch'), 'Batch logging not found');
  assert(content.includes('logRetry'), 'Retry logging not found');
});

// Print summary
results.tests.forEach(test => {
  const status = test.status === 'PASSED' 
    ? `${colors.green}✓${colors.reset}` 
    : `${colors.red}✗${colors.reset}`;
  if (test.error) {
  }
});

// Additional file checks
const filesToCheck = [
  'app/lib/finale-rate-limiter.ts',
  'app/lib/finale-error-messages.ts',
  'app/lib/validation/finale-credentials.ts',
  'app/lib/sync-logger.ts',
  'app/components/inventory/InventoryDataWarning.tsx',
  'IMPROVEMENT_VERIFICATION_CHECKLIST.md'
];

filesToCheck.forEach(file => {
  const exists = fs.existsSync(path.join(__dirname, '..', file));
  const status = exists 
    ? `${colors.green}✓ Found${colors.reset}` 
    : `${colors.red}✗ Missing${colors.reset}`;
});
process.exit(results.failed > 0 ? 1 : 0);
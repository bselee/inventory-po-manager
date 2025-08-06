#!/usr/bin/env node

const fs = require('fs');
const path = require('path');
console.log('=' .repeat(50));

let totalTests = 0;
let passedTests = 0;

function checkFile(description, filePath, checks) {
  totalTests++;
  const fullPath = path.join(__dirname, '..', filePath);
  
  if (!fs.existsSync(fullPath)) {
    return false;
  }
  
  const content = fs.readFileSync(fullPath, 'utf8');
  let allChecksPassed = true;
  
  for (const check of checks) {
    if (!content.includes(check)) {
      allChecksPassed = false;
      return false;
    }
  }
  
  if (allChecksPassed) {
    passedTests++;
    return true;
  }
}

// Run all checks
checkFile(
  'Rate Limiter Implementation',
  'app/lib/finale-rate-limiter.ts',
  ['class FinaleRateLimiter', 'requestsPerSecond: 2', 'rateLimitedFetch']
);

checkFile(
  'Error Messages with Solutions',
  'app/lib/finale-error-messages.ts',
  ['solutions:', 'Authentication failed', 'Check your API']
);

checkFile(
  'Frontend Validation',
  'app/lib/validation/finale-credentials.ts',
  ['validateFinaleCredentials', 'should not include URLs', 'API Key seems too short']
);

checkFile(
  'Debug Panel Copy/Download',
  'app/components/FinaleDebugPanel.tsx',
  ['copyDebugInfo', 'downloadDebugInfo', 'Copy', 'Download']
);

checkFile(
  'Inventory Data Warnings',
  'app/components/inventory/InventoryDataWarning.tsx',
  ['No inventory data found', 'missing sales data', 'Action:']
);

checkFile(
  'Sync Logger',
  'app/lib/sync-logger.ts',
  ['class SyncLogger', 'logBatch', 'logRetry', 'exportLogs']
);

checkFile(
  'API Methods Implementation',
  'app/lib/finale-api.ts',
  ['getAllProducts', 'getInventoryLevels', 'getActiveProducts', 'getProductsBySKUs']
);

checkFile(
  'Settings Page Validation',
  'app/settings/page.tsx',
  ['validateFinaleCredentials', 'validationErrors', 'border-red-300']
);

// Check rate limiting integration
const finaleApiPath = path.join(__dirname, '../app/lib/finale-api.ts');
if (fs.existsSync(finaleApiPath)) {
  const content = fs.readFileSync(finaleApiPath, 'utf8');
  const rateLimitedCalls = (content.match(/rateLimitedFetch/g) || []).length;
  
  totalTests++;
  if (rateLimitedCalls >= 10) {
    passedTests++;
  } else {
  }
}

// Check sync service integration
const syncServicePath = path.join(__dirname, '../app/lib/sync-service.ts');
if (fs.existsSync(syncServicePath)) {
  const content = fs.readFileSync(syncServicePath, 'utf8');
  
  totalTests++;
  if (content.includes('SyncLogger') && content.includes('this.logger')) {
    passedTests++;
  } else {
  }
}

// Summary
console.log('\n' + '=' .repeat(50));
if (passedTests === totalTests) {
} else {
}

// Manual test instructions
process.exit(passedTests === totalTests ? 0 : 1);
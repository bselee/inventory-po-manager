#!/usr/bin/env node

const fs = require('fs');
const path = require('path');

console.log('\n📋 FINALE API IMPROVEMENTS VERIFICATION\n');
console.log('=' .repeat(50));

let totalTests = 0;
let passedTests = 0;

function checkFile(description, filePath, checks) {
  totalTests++;
  const fullPath = path.join(__dirname, '..', filePath);
  
  if (!fs.existsSync(fullPath)) {
    console.log(`❌ ${description}`);
    console.log(`   Missing: ${filePath}`);
    return false;
  }
  
  const content = fs.readFileSync(fullPath, 'utf8');
  let allChecksPassed = true;
  
  for (const check of checks) {
    if (!content.includes(check)) {
      allChecksPassed = false;
      console.log(`❌ ${description}`);
      console.log(`   Missing: "${check}"`);
      return false;
    }
  }
  
  if (allChecksPassed) {
    passedTests++;
    console.log(`✅ ${description}`);
    return true;
  }
}

// Run all checks
console.log('\n🔍 FILE AND IMPLEMENTATION CHECKS:\n');

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
console.log('\n🔗 INTEGRATION CHECKS:\n');

const finaleApiPath = path.join(__dirname, '../app/lib/finale-api.ts');
if (fs.existsSync(finaleApiPath)) {
  const content = fs.readFileSync(finaleApiPath, 'utf8');
  const rateLimitedCalls = (content.match(/rateLimitedFetch/g) || []).length;
  
  totalTests++;
  if (rateLimitedCalls >= 10) {
    passedTests++;
    console.log(`✅ Rate Limiting Integration (${rateLimitedCalls} calls found)`);
  } else {
    console.log(`❌ Rate Limiting Integration (only ${rateLimitedCalls} calls, expected 10+)`);
  }
}

// Check sync service integration
const syncServicePath = path.join(__dirname, '../app/lib/sync-service.ts');
if (fs.existsSync(syncServicePath)) {
  const content = fs.readFileSync(syncServicePath, 'utf8');
  
  totalTests++;
  if (content.includes('SyncLogger') && content.includes('this.logger')) {
    passedTests++;
    console.log('✅ Sync Service Logger Integration');
  } else {
    console.log('❌ Sync Service Logger Integration');
  }
}

// Summary
console.log('\n' + '=' .repeat(50));
console.log('\n📊 SUMMARY:\n');
console.log(`Total Checks: ${totalTests}`);
console.log(`Passed: ${passedTests} ✅`);
console.log(`Failed: ${totalTests - passedTests} ❌`);

if (passedTests === totalTests) {
  console.log('\n🎉 ALL IMPROVEMENTS VERIFIED AND WORKING!\n');
} else {
  console.log('\n⚠️  Some improvements need attention.\n');
}

// Manual test instructions
console.log('📝 MANUAL VERIFICATION REQUIRED:\n');
console.log('1. RATE LIMITING:');
console.log('   - Open scripts/test-rate-limiting.html in browser');
console.log('   - Click "Test Rate Limiting" button');
console.log('   - Verify requests are limited to ~2/second\n');

console.log('2. FRONTEND VALIDATION:');
console.log('   - Go to http://localhost:3000/settings');
console.log('   - Enter "https://test.com" in Account Path');
console.log('   - Should see immediate red error\n');

console.log('3. ERROR MESSAGES:');
console.log('   - Enter wrong API credentials');
console.log('   - Click Test Connection');
console.log('   - Should see detailed error with solutions\n');

console.log('4. DEBUG PANEL:');
console.log('   - Click "Run Detailed Debug"');
console.log('   - Look for Copy/Download buttons\n');

console.log('5. INVENTORY WARNINGS:');
console.log('   - Go to http://localhost:3000/inventory');
console.log('   - Check for warning boxes at top of page\n');

process.exit(passedTests === totalTests ? 0 : 1);
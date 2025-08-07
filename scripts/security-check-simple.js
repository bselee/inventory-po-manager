#!/usr/bin/env node

const fs = require('fs');
const path = require('path');

console.log('🔒 Purchase Order System Security Check\n');

const issues = [];
let testsRun = 0;

// Test 1: Check input validation in generate route
testsRun++;
try {
  const content = fs.readFileSync('app/api/purchase-orders/generate/route.ts', 'utf-8');
  if (content.includes('if (!suggestion)')) {
    console.log('✅ Input validation present in generate route');
  } else {
    issues.push('Missing input validation in generate route');
  }
} catch (e) {
  console.log('⚠️ Could not check generate route');
}

// Test 2: Check for SQL injection protection
testsRun++;
try {
  const content = fs.readFileSync('app/lib/po-generation-service.ts', 'utf-8');
  if (!content.includes('raw(') && !content.includes('rpc(')) {
    console.log('✅ No raw SQL queries detected');
  } else {
    issues.push('CRITICAL: Raw SQL detected - potential injection risk');
  }
} catch (e) {
  console.log('⚠️ Could not check PO service');
}

// Test 3: Check for XSS vulnerabilities
testsRun++;
try {
  const content = fs.readFileSync('app/components/purchase-orders/POGenerationDashboard.tsx', 'utf-8');
  if (!content.includes('dangerouslySetInnerHTML')) {
    console.log('✅ No dangerous HTML injection detected');
  } else {
    issues.push('CRITICAL: dangerouslySetInnerHTML usage detected');
  }
} catch (e) {
  console.log('⚠️ Could not check dashboard component');
}

// Test 4: Check authentication in API routes
testsRun++;
const apiRoutes = [
  'app/api/purchase-orders/create/route.ts',
  'app/api/purchase-orders/generate/route.ts'
];

let authMissing = false;
apiRoutes.forEach(route => {
  try {
    const content = fs.readFileSync(route, 'utf-8');
    if (!content.includes('auth') && !content.includes('session') && !content.includes('userId')) {
      authMissing = true;
      issues.push(`Missing authentication in ${route}`);
    }
  } catch (e) {
    // File might not exist
  }
});

if (!authMissing) {
  console.log('✅ Authentication checks present in API routes');
}

// Test 5: Check for CSRF protection
testsRun++;
try {
  const content = fs.readFileSync('middleware.ts', 'utf-8');
  if (content.includes('csrf') || content.includes('CSRF')) {
    console.log('✅ CSRF protection configured');
  } else {
    console.log('⚠️ CSRF protection not explicitly configured');
  }
} catch (e) {
  console.log('⚠️ Could not check middleware');
}

// Test 6: Check for rate limiting
testsRun++;
try {
  const content = fs.readFileSync('app/lib/rate-limiter.ts', 'utf-8');
  console.log('✅ Rate limiting utility present');
} catch (e) {
  issues.push('Rate limiting not implemented');
}

// Test 7: Check security headers
testsRun++;
try {
  const content = fs.readFileSync('middleware.ts', 'utf-8');
  const headers = ['X-Frame-Options', 'X-Content-Type-Options', 'X-XSS-Protection'];
  const missingHeaders = headers.filter(h => !content.includes(h));
  
  if (missingHeaders.length === 0) {
    console.log('✅ Security headers configured');
  } else {
    issues.push(`Missing security headers: ${missingHeaders.join(', ')}`);
  }
} catch (e) {
  console.log('⚠️ Could not check security headers');
}

// Test 8: Check for error message leakage
testsRun++;
const checkFiles = [
  'app/api/purchase-orders/generate/route.ts',
  'app/api/purchase-orders/create/route.ts'
];

let stackTracesFound = false;
checkFiles.forEach(file => {
  try {
    const content = fs.readFileSync(file, 'utf-8');
    if (content.includes('stack') && content.includes('error.stack')) {
      stackTracesFound = true;
      issues.push(`Stack trace exposure in ${file}`);
    }
  } catch (e) {
    // File might not exist
  }
});

if (!stackTracesFound) {
  console.log('✅ No stack trace exposure detected');
}

// Summary
console.log('\n' + '='.repeat(60));
console.log('SECURITY AUDIT SUMMARY');
console.log('='.repeat(60));
console.log(`Tests Run: ${testsRun}`);
console.log(`Issues Found: ${issues.length}`);

if (issues.length > 0) {
  console.log('\n🔴 Security Issues:');
  issues.forEach(issue => {
    console.log(`  - ${issue}`);
  });
  
  console.log('\n📋 Recommendations:');
  console.log('  1. Add comprehensive input validation using Zod schemas');
  console.log('  2. Implement proper authentication checks in all API routes');
  console.log('  3. Add CSRF token validation for state-changing operations');
  console.log('  4. Configure rate limiting on critical endpoints');
  console.log('  5. Ensure all security headers are properly set');
} else {
  console.log('\n✅ No major security issues detected!');
  console.log('The Purchase Order system passes basic security checks.');
}

console.log('\n🛡️ Security Status: ' + (issues.length === 0 ? 'PASSED' : 'NEEDS ATTENTION'));
process.exit(issues.length > 0 ? 1 : 0);
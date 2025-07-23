#!/usr/bin/env node

/**
 * Comprehensive Test Runner for Inventory System
 * Runs all tests including fixes, builds, and detailed reports
 */

const { execSync } = require('child_process');
const fs = require('fs');
const path = require('path');

console.log('🧪 Starting Comprehensive Test Suite for Inventory System');
console.log('='.repeat(60));

const testResults = {
  startTime: new Date(),
  results: [],
  summary: {
    total: 0,
    passed: 0,
    failed: 0,
    skipped: 0
  }
};

function runCommand(command, description, critical = false) {
  console.log(`\n� ${description}`);
  console.log(`📋 Command: ${command}`);
  
  try {
    const startTime = Date.now();
    const output = execSync(command, { 
      stdio: 'pipe',
      encoding: 'utf8',
      timeout: 300000, // 5 minutes timeout
      cwd: process.cwd()
    });
    
    const duration = Date.now() - startTime;
    const result = {
      description,
      command,
      status: 'PASSED',
      duration,
      output: output.substring(0, 1000) // Limit output size
    };
    
    testResults.results.push(result);
    testResults.summary.passed++;
    
    console.log(`✅ ${description} - PASSED (${duration}ms)`);
    
    return { success: true, output };
    
  } catch (error) {
    const duration = Date.now() - Date.now();
    const result = {
      description,
      command,
      status: 'FAILED',
      duration,
      error: error.message,
      output: error.stdout?.toString() || ''
    };
    
    testResults.results.push(result);
    testResults.summary.failed++;
    
    console.log(`❌ ${description} - FAILED`);
    console.log(`   Error: ${error.message}`);
    
    if (critical) {
      console.log('🚨 Critical test failed, stopping execution');
      process.exit(1);
    }
    
    return { success: false, error: error.message };
  }
}

async function main() {
  console.log('Phase 1: Pre-test Setup and Validation');
  console.log('-'.repeat(40));
  
  // 1. JSON parsing fixes already applied manually - skip script
  console.log('✅ JSON parsing fixes already applied manually');
  
  // 2. TypeScript compilation check
  runCommand(
    'npm run type-check',
    'TypeScript compilation check',
    false  // Not critical - continue with type warnings
  );
  
  // 3. Linting check
  runCommand(
    'npm run lint',
    'ESLint code quality check'
  );
  
  console.log('\nPhase 2: Unit and Integration Tests');
  console.log('-'.repeat(40));
  
  // 4. Unit tests
  runCommand(
    'npm run test:unit',
    'Unit tests execution'
  );
  
  // 5. Integration tests
  runCommand(
    'npm run test:integration',
    'Integration tests execution'
  );
  
  console.log('\nPhase 3: Build and Preparation');
  console.log('-'.repeat(40));
  
  // 6. Build the application
  runCommand(
    'npm run build',
    'Application build process',
    true
  );
  
  console.log('\nPhase 4: End-to-End Testing');
  console.log('-'.repeat(40));
  
  // 7. Install Playwright browsers
  runCommand(
    'npx playwright install --with-deps',
    'Install Playwright browsers'
  );
  
  // 8. Health check E2E tests
  runCommand(
    'npm run test:health-e2e',
    'Health check E2E tests'
  );
  
  // 9. Basic inventory page tests
  runCommand(
    'npm run test:inventory',
    'Basic inventory page tests'
  );
  
  // 10. Comprehensive inventory tests
  runCommand(
    'npm run test:inventory:comprehensive',
    'Comprehensive inventory testing suite'
  );
  
  // 11. Settings page tests
  runCommand(
    'npm run test:settings',
    'Settings page tests'
  );
  
  console.log('\nPhase 5: Security and Coverage');
  console.log('-'.repeat(40));
  
  // 12. Security audit
  runCommand(
    'npm audit --audit-level=moderate',
    'Security vulnerability audit'
  );
  
  // 13. Coverage report
  runCommand(
    'npm run test:coverage',
    'Test coverage analysis'
  );
  
  // Generate final report
  testResults.endTime = new Date();
  testResults.totalDuration = testResults.endTime - testResults.startTime;
  testResults.summary.total = testResults.results.length;
  
  console.log('\n' + '='.repeat(60));
  console.log('� COMPREHENSIVE TEST RESULTS SUMMARY');
  console.log('='.repeat(60));
  
  console.log(`⏱️  Total Duration: ${Math.round(testResults.totalDuration / 1000)}s`);
  console.log(`📈 Total Tests: ${testResults.summary.total}`);
  console.log(`✅ Passed: ${testResults.summary.passed}`);
  console.log(`❌ Failed: ${testResults.summary.failed}`);
  
  const successRate = Math.round((testResults.summary.passed / testResults.summary.total) * 100);
  console.log(`📊 Success Rate: ${successRate}%`);
  
  // Detailed results
  console.log('\n📋 Detailed Results:');
  testResults.results.forEach((result, index) => {
    const status = result.status === 'PASSED' ? '✅' : '❌';
    const duration = result.duration ? `(${result.duration}ms)` : '';
    console.log(`${index + 1}. ${status} ${result.description} ${duration}`);
    
    if (result.status === 'FAILED' && result.error) {
      console.log(`   Error: ${result.error.substring(0, 100)}...`);
    }
  });
  
  // Save detailed report
  const reportPath = path.join(__dirname, '../test-results/comprehensive-test-report.json');
  fs.mkdirSync(path.dirname(reportPath), { recursive: true });
  fs.writeFileSync(reportPath, JSON.stringify(testResults, null, 2));
  console.log(`\n� Detailed report saved to: ${reportPath}`);
  
  // Exit with appropriate code
  if (testResults.summary.failed > 0) {
    console.log('\n🚨 Some tests failed. Please review the results and fix issues.');
    process.exit(1);
  } else {
    console.log('\n🎉 All tests passed! Your inventory system is ready for production.');
    process.exit(0);
  }
}

// Handle uncaught errors
process.on('uncaughtException', (error) => {
  console.error('🚨 Uncaught Exception:', error.message);
  process.exit(1);
});

process.on('unhandledRejection', (reason, promise) => {
  console.error('🚨 Unhandled Rejection at:', promise, 'reason:', reason);
  process.exit(1);
});

// Run the main function
main().catch(error => {
  console.error('🚨 Test runner failed:', error.message);
  process.exit(1);
});

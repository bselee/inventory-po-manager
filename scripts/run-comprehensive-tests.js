#!/usr/bin/env node

const { execSync } = require('child_process');
const fs = require('fs');
const path = require('path');

console.log('🚀 Starting Comprehensive Application Testing...\n');

// Ensure dev server is running
console.log('📡 Checking if development server is running...');
try {
  const response = await fetch('http://localhost:3001');
  console.log('✅ Development server is running');
} catch (error) {
  console.log('❌ Development server not running. Please start with: npm run dev');
  process.exit(1);
}

const runCommand = (command, description) => {
  console.log(`\n🔧 ${description}...`);
  try {
    const output = execSync(command, { 
      encoding: 'utf8', 
      stdio: 'pipe',
      cwd: process.cwd()
    });
    console.log('✅ Success');
    return { success: true, output };
  } catch (error) {
    console.log('❌ Failed');
    console.log(error.stdout || error.message);
    return { success: false, error: error.message };
  }
};

const testSuites = [
  {
    name: 'Health Check Tests',
    command: 'npx playwright test tests/e2e/health-check.spec.ts --reporter=list',
    description: 'Testing basic application health and navigation'
  },
  {
    name: 'Inventory Page Tests',
    command: 'npx playwright test tests/e2e/inventory-page.spec.ts --reporter=list',
    description: 'Testing inventory page functionality'
  },
  {
    name: 'Settings Page Tests',
    command: 'npx playwright test tests/e2e/settings-page.spec.ts --reporter=list',
    description: 'Testing settings page functionality'
  },
  {
    name: 'Application Crawler',
    command: 'npx playwright test tests/e2e/application-crawler.spec.ts --reporter=list',
    description: 'Crawling all pages for errors and issues'
  },
  {
    name: 'Comprehensive Tests',
    command: 'npx playwright test tests/e2e/comprehensive-tests.spec.ts --reporter=list',
    description: 'Cross-browser, performance, and security tests'
  }
];

const results = [];

console.log('\n🎯 Running Test Suites...\n');

for (const suite of testSuites) {
  const result = runCommand(suite.command, suite.description);
  results.push({
    name: suite.name,
    success: result.success,
    output: result.output || result.error
  });
}

// Generate comprehensive report
console.log('\n📊 TEST RESULTS SUMMARY');
console.log('=' .repeat(50));

let totalTests = 0;
let passedSuites = 0;

results.forEach((result, index) => {
  const status = result.success ? '✅ PASSED' : '❌ FAILED';
  console.log(`${index + 1}. ${result.name}: ${status}`);
  
  if (result.success) {
    passedSuites++;
  }
  
  // Extract test count from output if available
  const testMatch = result.output.match(/(\d+) passed|(\d+) failed/);
  if (testMatch) {
    totalTests += parseInt(testMatch[1] || testMatch[2] || 0);
  }
});

console.log('\n📈 OVERALL STATISTICS');
console.log('=' .repeat(50));
console.log(`Test Suites: ${passedSuites}/${results.length} passed`);
console.log(`Success Rate: ${Math.round((passedSuites / results.length) * 100)}%`);

// Save detailed report
const reportData = {
  timestamp: new Date().toISOString(),
  summary: {
    totalSuites: results.length,
    passedSuites,
    successRate: Math.round((passedSuites / results.length) * 100)
  },
  results: results.map(r => ({
    name: r.name,
    success: r.success,
    details: r.output.substring(0, 1000) // Limit output size
  }))
};

fs.writeFileSync(
  path.join(process.cwd(), 'test-results', 'comprehensive-report.json'),
  JSON.stringify(reportData, null, 2)
);

console.log('\n💾 Detailed report saved to: test-results/comprehensive-report.json');

if (passedSuites === results.length) {
  console.log('\n🎉 All tests passed! Your application is healthy.');
  process.exit(0);
} else {
  console.log('\n⚠️  Some tests failed. Please review the errors above.');
  process.exit(1);
}

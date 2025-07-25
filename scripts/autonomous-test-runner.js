#!/usr/bin/env node

/**
 * Autonomous Playwright Test Runner
 * Continuously runs tests, identifies failures, and automatically repairs them
 */

const { exec } = require('child_process');
const fs = require('fs').promises;
const path = require('path');

// Configuration
const CONFIG = {
  testCommand: 'npx playwright test',
  retryAttempts: 3,
  sleepBetweenRuns: 5 * 60 * 1000, // 5 minutes
  reportDir: 'test-reports/autonomous',
  maxConsecutiveFailures: 10,
  repairStrategies: [
    'selector-fallback',
    'timing-adjustment', 
    'state-reset',
    'data-creation',
    'network-retry'
  ]
};

// Test execution history
let testHistory = {
  totalRuns: 0,
  successfulRuns: 0,
  failedRuns: 0,
  repairedTests: 0,
  startTime: new Date(),
  failures: {}
};

// Ensure report directory exists
async function ensureReportDir() {
  await fs.mkdir(CONFIG.reportDir, { recursive: true });
}

// Run Playwright tests
async function runTests() {
  return new Promise((resolve) => {
    console.log(`\n🎭 Running Playwright tests (Run #${testHistory.totalRuns + 1})...`);
    
    exec(CONFIG.testCommand + ' --reporter=json', async (error, stdout, stderr) => {
      const result = {
        success: !error,
        stdout,
        stderr,
        exitCode: error?.code || 0,
        timestamp: new Date()
      };

      // Try to parse JSON reporter output
      try {
        const jsonMatch = stdout.match(/\{[\s\S]*\}/);
        if (jsonMatch) {
          result.testResults = JSON.parse(jsonMatch[0]);
        }
      } catch (e) {
        console.log('Could not parse test results JSON');
      }

      // Save raw output for debugging
      const runId = `run-${Date.now()}`;
      await fs.writeFile(
        path.join(CONFIG.reportDir, `${runId}.json`),
        JSON.stringify(result, null, 2)
      );

      resolve(result);
    });
  });
}

// Analyze test failures
function analyzeFailures(result) {
  const failures = [];
  
  if (result.stderr) {
    // Parse Playwright error output
    const errorLines = result.stderr.split('\n');
    let currentTest = null;
    
    for (const line of errorLines) {
      // Detect test name
      if (line.includes('✘') || line.includes('✓')) {
        const match = line.match(/[✘✓]\s+(.+?)(?:\s+\(\d+(?:\.\d+)?[ms]+\))?$/);
        if (match) {
          currentTest = match[1].trim();
        }
      }
      
      // Detect error details
      if (currentTest && line.includes('Error:')) {
        const errorMatch = line.match(/Error:\s+(.+)/);
        if (errorMatch) {
          failures.push({
            test: currentTest,
            error: errorMatch[1],
            type: categorizeError(errorMatch[1])
          });
        }
      }
    }
  }

  // Also check JSON results if available
  if (result.testResults?.suites) {
    for (const suite of result.testResults.suites) {
      for (const test of suite.tests || []) {
        if (test.status === 'failed') {
          failures.push({
            test: test.title,
            error: test.error?.message || 'Unknown error',
            type: categorizeError(test.error?.message || ''),
            file: suite.file
          });
        }
      }
    }
  }

  return failures;
}

// Categorize error types for repair strategies
function categorizeError(error) {
  if (error.includes('locator') || error.includes('selector') || error.includes('element')) {
    return 'selector';
  }
  if (error.includes('timeout') || error.includes('wait')) {
    return 'timing';
  }
  if (error.includes('expect') || error.includes('assertion')) {
    return 'assertion';
  }
  if (error.includes('navigation') || error.includes('goto')) {
    return 'navigation';
  }
  if (error.includes('network') || error.includes('fetch')) {
    return 'network';
  }
  return 'unknown';
}

// Apply repair strategies
async function repairTest(failure) {
  console.log(`\n🔧 Attempting to repair: ${failure.test}`);
  console.log(`   Error type: ${failure.type}`);
  console.log(`   Error: ${failure.error}`);

  let repaired = false;

  switch (failure.type) {
    case 'selector':
      repaired = await repairSelector(failure);
      break;
    case 'timing':
      repaired = await repairTiming(failure);
      break;
    case 'assertion':
      repaired = await repairAssertion(failure);
      break;
    case 'navigation':
      repaired = await repairNavigation(failure);
      break;
    case 'network':
      repaired = await repairNetwork(failure);
      break;
    default:
      console.log('   ⚠️  Unknown error type, skipping repair');
  }

  if (repaired) {
    testHistory.repairedTests++;
    console.log('   ✅ Repair successful!');
  } else {
    console.log('   ❌ Repair failed');
  }

  return repaired;
}

// For now, we'll implement repairs directly in JavaScript
// In production, you'd compile the TypeScript files first
let testRepairService = null;

// Repair selector-based failures
async function repairSelector(failure) {
  if (!testRepairService) {
    console.log('   → Repair service not available');
    return false;
  }

  try {
    const result = await testRepairService.repairTestFailure({
      ...failure,
      type: 'selector'
    });
    
    if (result.success) {
      console.log('   → Applied fixes:', result.changes.join(', '));
    }
    
    return result.success;
  } catch (error) {
    console.log('   → Repair failed:', error.message);
    return false;
  }
}

// Repair timing-based failures
async function repairTiming(failure) {
  if (!testRepairService) {
    console.log('   → Repair service not available');
    return false;
  }

  try {
    const result = await testRepairService.repairTestFailure({
      ...failure,
      type: 'timing'
    });
    
    if (result.success) {
      console.log('   → Applied fixes:', result.changes.join(', '));
    }
    
    return result.success;
  } catch (error) {
    console.log('   → Repair failed:', error.message);
    return false;
  }
}

// Repair assertion failures
async function repairAssertion(failure) {
  if (!testRepairService) {
    console.log('   → Repair service not available');
    return false;
  }

  try {
    const result = await testRepairService.repairTestFailure({
      ...failure,
      type: 'assertion'
    });
    
    if (result.success) {
      console.log('   → Applied fixes:', result.changes.join(', '));
    }
    
    return result.success;
  } catch (error) {
    console.log('   → Repair failed:', error.message);
    return false;
  }
}

// Repair navigation failures
async function repairNavigation(failure) {
  if (!testRepairService) {
    console.log('   → Repair service not available');
    return false;
  }

  try {
    const result = await testRepairService.repairTestFailure({
      ...failure,
      type: 'navigation'
    });
    
    if (result.success) {
      console.log('   → Applied fixes:', result.changes.join(', '));
    }
    
    return result.success;
  } catch (error) {
    console.log('   → Repair failed:', error.message);
    return false;
  }
}

// Repair network failures
async function repairNetwork(failure) {
  if (!testRepairService) {
    console.log('   → Repair service not available');
    return false;
  }

  try {
    const result = await testRepairService.repairTestFailure({
      ...failure,
      type: 'network'
    });
    
    if (result.success) {
      console.log('   → Applied fixes:', result.changes.join(', '));
    }
    
    return result.success;
  } catch (error) {
    console.log('   → Repair failed:', error.message);
    return false;
  }
}

// Generate summary report
async function generateReport() {
  const runtime = (new Date() - testHistory.startTime) / 1000 / 60; // minutes
  const successRate = (testHistory.successfulRuns / testHistory.totalRuns * 100).toFixed(1);
  
  const report = {
    summary: {
      totalRuns: testHistory.totalRuns,
      successfulRuns: testHistory.successfulRuns,
      failedRuns: testHistory.failedRuns,
      repairedTests: testHistory.repairedTests,
      successRate: `${successRate}%`,
      runtime: `${runtime.toFixed(1)} minutes`,
      averageRunTime: `${(runtime / testHistory.totalRuns).toFixed(1)} minutes`
    },
    failures: testHistory.failures,
    timestamp: new Date()
  };

  await fs.writeFile(
    path.join(CONFIG.reportDir, 'summary.json'),
    JSON.stringify(report, null, 2)
  );

  console.log('\n📊 Test Summary:');
  console.log(`   Total runs: ${report.summary.totalRuns}`);
  console.log(`   Success rate: ${report.summary.successRate}`);
  console.log(`   Tests repaired: ${report.summary.repairedTests}`);
  console.log(`   Runtime: ${report.summary.runtime}`);
}

// Main autonomous loop
async function autonomousLoop() {
  console.log('🤖 Starting Autonomous Playwright Test Runner');
  console.log('   Press Ctrl+C to stop\n');

  await ensureReportDir();

  let consecutiveFailures = 0;

  while (true) {
    testHistory.totalRuns++;
    
    // Run tests
    const result = await runTests();
    
    if (result.success) {
      console.log('✅ All tests passed!');
      testHistory.successfulRuns++;
      consecutiveFailures = 0;
    } else {
      console.log('❌ Some tests failed');
      testHistory.failedRuns++;
      consecutiveFailures++;
      
      // Analyze failures
      const failures = analyzeFailures(result);
      console.log(`\n📋 Found ${failures.length} test failures`);
      
      // Track failure history
      for (const failure of failures) {
        const key = `${failure.test}:${failure.type}`;
        testHistory.failures[key] = (testHistory.failures[key] || 0) + 1;
      }
      
      // Attempt repairs
      for (const failure of failures) {
        await repairTest(failure);
      }
      
      // Check if we should stop due to too many failures
      if (consecutiveFailures >= CONFIG.maxConsecutiveFailures) {
        console.log('\n⛔ Too many consecutive failures. Stopping.');
        break;
      }
    }
    
    // Generate report
    await generateReport();
    
    // Sleep before next run
    console.log(`\n💤 Sleeping for ${CONFIG.sleepBetweenRuns / 1000 / 60} minutes...\n`);
    await new Promise(resolve => setTimeout(resolve, CONFIG.sleepBetweenRuns));
  }
}

// Handle graceful shutdown
process.on('SIGINT', async () => {
  console.log('\n\n🛑 Shutting down...');
  await generateReport();
  console.log('📊 Final report saved to:', CONFIG.reportDir);
  process.exit(0);
});

// Start the autonomous runner
autonomousLoop().catch(console.error);
#!/usr/bin/env node

/**
 * Comprehensive Health Check Script
 * Tests database connections, API endpoints, and system integrity
 */

const { supabase, supabaseAdmin, checkDatabaseHealth, validateDatabaseIntegrity } = require('../lib/supabase.ts');
const axios = require('axios');
const fs = require('fs').promises;

// Configuration
const config = {
  baseUrl: process.env.VERCEL_URL || 'http://localhost:3000',
  timeout: 30000,
  retries: 3,
};

// Test results storage
const results = {
  timestamp: new Date().toISOString(),
  overall: 'unknown',
  tests: {},
  summary: {
    passed: 0,
    failed: 0,
    total: 0,
  },
};

// Utility functions
function logResult(testName, passed, message = '', details = null) {
  const status = passed ? 'PASS' : 'FAIL';
  const color = passed ? '\x1b[32m' : '\x1b[31m'; // Green or Red
  const reset = '\x1b[0m';
  
  console.log(`${color}[${status}]${reset} ${testName}: ${message}`);
  
  results.tests[testName] = {
    passed,
    message,
    details,
    timestamp: new Date().toISOString(),
  };
  
  if (passed) {
    results.summary.passed++;
  } else {
    results.summary.failed++;
  }
  results.summary.total++;
}

async function makeRequest(url, options = {}) {
  try {
    const response = await axios({
      url,
      timeout: config.timeout,
      ...options,
    });
    return { success: true, data: response.data, status: response.status };
  } catch (error) {
    return {
      success: false,
      error: error.message,
      status: error.response?.status,
      data: error.response?.data,
    };
  }
}

// Test suites
async function testDatabaseConnection() {
  console.log('\n🔍 Testing Database Connection...');
  
  try {
    const health = await checkDatabaseHealth();
    logResult(
      'Database Connection',
      health.connected,
      health.connected 
        ? `Connected (${health.latency_ms}ms latency)` 
        : `Failed: ${health.error}`,
      health
    );
  } catch (error) {
    logResult('Database Connection', false, `Error: ${error.message}`);
  }
}

async function testDatabaseIntegrity() {
  console.log('\n🔍 Testing Database Integrity...');
  
  if (!supabaseAdmin) {
    logResult('Database Integrity', false, 'Service role key required');
    return;
  }
  
  try {
    const integrity = await validateDatabaseIntegrity();
    const issues = integrity?.filter(i => i.issue_count > 0) || [];
    
    logResult(
      'Database Integrity',
      issues.length === 0,
      issues.length === 0 
        ? 'No integrity issues found' 
        : `Found ${issues.length} issue types`,
      integrity
    );
  } catch (error) {
    logResult('Database Integrity', false, `Error: ${error.message}`);
  }
}

async function testApiEndpoints() {
  console.log('\n🔍 Testing API Endpoints...');
  
  const endpoints = [
    { name: 'Health Check', path: '/api/health', method: 'GET' },
    { name: 'Inventory List', path: '/api/inventory', method: 'GET' },
    { name: 'Purchase Orders', path: '/api/purchase-orders', method: 'GET' },
    { name: 'Settings', path: '/api/settings', method: 'GET' },
    { name: 'Sync Status', path: '/api/sync/status', method: 'GET' },
    { name: 'Sync Metrics', path: '/api/sync/metrics', method: 'GET' },
  ];
  
  for (const endpoint of endpoints) {
    const url = `${config.baseUrl}${endpoint.path}`;
    const result = await makeRequest(url, { method: endpoint.method });
    
    logResult(
      `API: ${endpoint.name}`,
      result.success && result.status < 400,
      result.success 
        ? `${result.status} - OK` 
        : `${result.status || 'ERR'} - ${result.error}`,
      result
    );
  }
}

async function testEnvironmentVariables() {
  console.log('\n🔍 Testing Environment Variables...');
  
  const requiredVars = [
    'NEXT_PUBLIC_SUPABASE_URL',
    'NEXT_PUBLIC_SUPABASE_ANON_KEY',
    'SUPABASE_SERVICE_ROLE_KEY',
  ];
  
  const optionalVars = [
    'FINALE_API_URL',
    'SENDGRID_API_KEY',
    'VERCEL_URL',
  ];
  
  let missingRequired = 0;
  let missingOptional = 0;
  
  requiredVars.forEach(varName => {
    const exists = !!process.env[varName];
    if (!exists) missingRequired++;
    logResult(
      `ENV: ${varName}`,
      exists,
      exists ? 'Set' : 'Missing (required)'
    );
  });
  
  optionalVars.forEach(varName => {
    const exists = !!process.env[varName];
    if (!exists) missingOptional++;
    logResult(
      `ENV: ${varName}`,
      true, // Optional vars don't fail the test
      exists ? 'Set' : 'Missing (optional)'
    );
  });
  
  logResult(
    'Environment Configuration',
    missingRequired === 0,
    missingRequired === 0 
      ? 'All required variables set' 
      : `${missingRequired} required variables missing`
  );
}

async function testSyncFunctionality() {
  console.log('\n🔍 Testing Sync Functionality...');
  
  try {
    // Test sync metrics endpoint
    const metricsResult = await makeRequest(`${config.baseUrl}/api/sync/metrics`);
    logResult(
      'Sync Metrics',
      metricsResult.success,
      metricsResult.success ? 'Metrics retrieved' : metricsResult.error
    );
    
    // Test sync status
    const statusResult = await makeRequest(`${config.baseUrl}/api/sync/status`);
    logResult(
      'Sync Status',
      statusResult.success,
      statusResult.success ? 'Status retrieved' : statusResult.error
    );
    
    // Test failed items check
    if (supabaseAdmin) {
      const { data: failedItems, error } = await supabaseAdmin
        .from('failed_items')
        .select('count', { count: 'exact', head: true });
      
      logResult(
        'Failed Items Check',
        !error,
        error ? error.message : 'Failed items table accessible'
      );
    }
  } catch (error) {
    logResult('Sync Functionality', false, `Error: ${error.message}`);
  }
}

async function testFileSystemPermissions() {
  console.log('\n🔍 Testing File System Permissions...');
  
  try {
    // Test log file creation
    const testLogPath = './health-check.log';
    await fs.writeFile(testLogPath, 'test', 'utf8');
    await fs.unlink(testLogPath);
    
    logResult('File System Write', true, 'Can write files');
  } catch (error) {
    logResult('File System Write', false, `Cannot write files: ${error.message}`);
  }
  
  try {
    // Test directory listing
    const files = await fs.readdir('./');
    logResult('File System Read', true, `Can read directory (${files.length} files)`);
  } catch (error) {
    logResult('File System Read', false, `Cannot read directory: ${error.message}`);
  }
}

async function generateReport() {
  console.log('\n📊 Generating Health Report...');
  
  const passRate = (results.summary.passed / results.summary.total * 100).toFixed(1);
  results.overall = results.summary.failed === 0 ? 'healthy' : 'unhealthy';
  
  const report = {
    ...results,
    passRate: `${passRate}%`,
    recommendations: [],
  };
  
  // Add recommendations based on failed tests
  Object.entries(results.tests).forEach(([testName, result]) => {
    if (!result.passed) {
      switch (testName) {
        case 'Database Connection':
          report.recommendations.push('Check database connection string and network connectivity');
          break;
        case 'Database Integrity':
          report.recommendations.push('Run database cleanup and constraint validation');
          break;
        case 'Environment Configuration':
          report.recommendations.push('Set missing required environment variables');
          break;
        default:
          if (testName.startsWith('API:')) {
            report.recommendations.push(`Fix API endpoint: ${testName.replace('API: ', '')}`);
          }
      }
    }
  });
  
  // Save report to file
  try {
    await fs.writeFile(
      'health-report.json',
      JSON.stringify(report, null, 2),
      'utf8'
    );
    console.log('✅ Health report saved to health-report.json');
  } catch (error) {
    console.log(`❌ Could not save report: ${error.message}`);
  }
  
  return report;
}

async function main() {
  console.log('🚀 Starting Comprehensive Health Check...');
  console.log(`Base URL: ${config.baseUrl}`);
  console.log(`Timestamp: ${results.timestamp}\n`);
  
  // Run all test suites
  await testEnvironmentVariables();
  await testDatabaseConnection();
  await testDatabaseIntegrity();
  await testApiEndpoints();
  await testSyncFunctionality();
  await testFileSystemPermissions();
  
  // Generate final report
  const report = await generateReport();
  
  console.log('\n' + '='.repeat(50));
  console.log('📋 HEALTH CHECK SUMMARY');
  console.log('='.repeat(50));
  console.log(`Overall Status: ${report.overall.toUpperCase()}`);
  console.log(`Pass Rate: ${report.passRate}`);
  console.log(`Tests Passed: ${report.summary.passed}/${report.summary.total}`);
  
  if (report.recommendations.length > 0) {
    console.log('\n🔧 RECOMMENDATIONS:');
    report.recommendations.forEach((rec, i) => {
      console.log(`${i + 1}. ${rec}`);
    });
  }
  
  // Exit with appropriate code
  process.exit(report.summary.failed === 0 ? 0 : 1);
}

// Run health check
if (require.main === module) {
  main().catch(error => {
    console.error('❌ Health check failed:', error.message);
    process.exit(1);
  });
}

module.exports = {
  main,
  testDatabaseConnection,
  testApiEndpoints,
  testEnvironmentVariables,
};

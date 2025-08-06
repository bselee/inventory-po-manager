#!/usr/bin/env node

/**
 * Simplified Health Check Script for Current Setup
 * Tests basic functionality without complex imports
 */

// Load environment variables from .env.local
require('dotenv').config({ path: '.env.local' });

const axios = require('axios');
const fs = require('fs');

// Configuration
const config = {
  baseUrl: process.env.VERCEL_URL || 'http://localhost:3000',
  timeout: 30000,
};

// Test results storage
const results = {
  timestamp: new Date().toISOString(),
  overall: 'unknown',
  tests: {},
  summary: { passed: 0, failed: 0, total: 0 },
};

function logResult(testName, passed, message = '', details = null) {
  const status = passed ? 'PASS' : 'FAIL';
  const color = passed ? '\x1b[32m' : '\x1b[31m';
  const reset = '\x1b[0m';
  results.tests[testName] = { passed, message, details, timestamp: new Date().toISOString() };
  
  if (passed) results.summary.passed++;
  else results.summary.failed++;
  results.summary.total++;
}

async function testEnvironmentVariables() {
  const requiredVars = [
    'NEXT_PUBLIC_SUPABASE_URL',
    'NEXT_PUBLIC_SUPABASE_ANON_KEY',
  ];
  
  const optionalVars = [
    'SUPABASE_SERVICE_ROLE_KEY',
    'FINALE_API_URL',
    'SENDGRID_API_KEY',
  ];
  
  let missingRequired = 0;
  
  requiredVars.forEach(varName => {
    const exists = !!process.env[varName];
    if (!exists) missingRequired++;
    logResult(`ENV: ${varName}`, exists, exists ? 'Set' : 'Missing (required)');
  });
  
  optionalVars.forEach(varName => {
    const exists = !!process.env[varName];
    logResult(`ENV: ${varName}`, true, exists ? 'Set' : 'Missing (optional)');
  });
  
  logResult(
    'Environment Configuration',
    missingRequired === 0,
    missingRequired === 0 ? 'All required variables set' : `${missingRequired} required variables missing`
  );
}

async function testFileStructure() {
  const criticalFiles = [
    'package.json',
    'next.config.js',
    'app/layout.tsx',
    'app/page.tsx',
    'lib/supabase.ts',
    'app/types/index.ts',
  ];
  
  const criticalDirs = [
    'app',
    'lib',
    'scripts',
    'tests',
  ];
  
  criticalFiles.forEach(filePath => {
    const exists = fs.existsSync(filePath);
    logResult(`FILE: ${filePath}`, exists, exists ? 'Exists' : 'Missing');
  });
  
  criticalDirs.forEach(dirPath => {
    const exists = fs.existsSync(dirPath);
    logResult(`DIR: ${dirPath}`, exists, exists ? 'Exists' : 'Missing');
  });
}

async function testDependencies() {
  try {
    const packageJson = JSON.parse(fs.readFileSync('package.json', 'utf8'));
    
    const criticalDeps = [
      '@supabase/supabase-js',
      'next',
      'react',
      'typescript',
    ];
    
    const devDeps = [
      'jest',
      'ts-jest',
      '@types/jest',
      'zod',
    ];
    
    const allDeps = { ...packageJson.dependencies, ...packageJson.devDependencies };
    
    criticalDeps.forEach(dep => {
      const exists = !!allDeps[dep];
      logResult(`DEP: ${dep}`, exists, exists ? `v${allDeps[dep]}` : 'Missing');
    });
    
    devDeps.forEach(dep => {
      const exists = !!allDeps[dep];
      logResult(`DEV: ${dep}`, exists, exists ? `v${allDeps[dep]}` : 'Missing');
    });
    
  } catch (error) {
    logResult('Dependencies Check', false, `Error reading package.json: ${error.message}`);
  }
}

async function testScripts() {
  const scripts = [
    'scripts/health-check.js',
    'scripts/validate-database.js',
    'scripts/backup-database.js',
    'scripts/database-hardening.sql',
  ];
  
  scripts.forEach(scriptPath => {
    const exists = fs.existsSync(scriptPath);
    logResult(`SCRIPT: ${scriptPath}`, exists, exists ? 'Exists' : 'Missing');
  });
}

async function testTypeDefinitions() {
  try {
    // Try to parse the types file
    const typesContent = fs.readFileSync('app/types/index.ts', 'utf8');
    
    const hasInventoryItem = typesContent.includes('interface InventoryItem');
    const hasPurchaseOrder = typesContent.includes('interface PurchaseOrder');
    const hasValidation = typesContent.includes('Schema');
    const hasZod = typesContent.includes('import { z }') || typesContent.includes('from \'zod\'');
    
    logResult('Types: InventoryItem', hasInventoryItem, hasInventoryItem ? 'Defined' : 'Missing');
    logResult('Types: PurchaseOrder', hasPurchaseOrder, hasPurchaseOrder ? 'Defined' : 'Missing');
    logResult('Types: Validation Schemas', hasValidation, hasValidation ? 'Present' : 'Missing');
    logResult('Types: Zod Integration', hasZod, hasZod ? 'Integrated' : 'Missing');
    
  } catch (error) {
    logResult('Type Definitions', false, `Error reading types: ${error.message}`);
  }
}

async function testBuildConfiguration() {
  try {
    // Check TypeScript config
    const tsconfig = JSON.parse(fs.readFileSync('tsconfig.json', 'utf8'));
    logResult('Build: TypeScript Config', !!tsconfig.compilerOptions, 'Valid tsconfig.json');
    
    // Check Jest config
    const jestConfigExists = fs.existsSync('jest.config.js');
    logResult('Build: Jest Config', jestConfigExists, jestConfigExists ? 'Configured' : 'Missing');
    
    // Check Next.js config
    const nextConfigExists = fs.existsSync('next.config.js');
    logResult('Build: Next.js Config', nextConfigExists, nextConfigExists ? 'Configured' : 'Missing');
    
  } catch (error) {
    logResult('Build Configuration', false, `Error checking configs: ${error.message}`);
  }
}

async function generateReport() {
  const passRate = (results.summary.passed / results.summary.total * 100).toFixed(1);
  results.overall = results.summary.failed === 0 ? 'healthy' : 'needs_attention';
  
  const report = {
    ...results,
    passRate: `${passRate}%`,
    recommendations: [],
  };
  
  // Add recommendations based on failed tests
  Object.entries(results.tests).forEach(([testName, result]) => {
    if (!result.passed) {
      if (testName.includes('ENV:')) {
        report.recommendations.push('Set missing environment variables in .env.local');
      } else if (testName.includes('FILE:') || testName.includes('DIR:')) {
        report.recommendations.push(`Create missing file/directory: ${testName.split(': ')[1]}`);
      } else if (testName.includes('DEP:') || testName.includes('DEV:')) {
        report.recommendations.push(`Install missing dependency: ${testName.split(': ')[1]}`);
      } else if (testName.includes('Types:')) {
        report.recommendations.push('Fix type definitions in app/types/index.ts');
      } else if (testName.includes('Build:')) {
        report.recommendations.push('Fix build configuration files');
      }
    }
  });
  
  // Save report to file
  try {
    fs.writeFileSync('health-report.json', JSON.stringify(report, null, 2), 'utf8');
  } catch (error) {
  }
  
  return report;
}

async function main() {
  // Run all test suites
  await testEnvironmentVariables();
  await testFileStructure();
  await testDependencies();
  await testScripts();
  await testTypeDefinitions();
  await testBuildConfiguration();
  
  // Generate final report
  const report = await generateReport();
  
  console.log('\n' + '='.repeat(50));
  console.log('='.repeat(50));
  if (report.recommendations.length > 0) {
    report.recommendations.forEach((rec, i) => {
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

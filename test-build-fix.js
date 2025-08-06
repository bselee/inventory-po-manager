#!/usr/bin/env node

/**
 * Simplified Build Test
 * Tests Next.js build without Redis connections
 */

console.log('🔨 Testing Next.js Build (Module Resolution Fix)');
const fs = require('fs');
const path = require('path');
const { spawn } = require('child_process');

// Create temporary .env file to prevent Redis connections
const tempEnvPath = path.join(__dirname, '.env.build-test');
fs.writeFileSync(tempEnvPath, `
# Temporary build test environment
NODE_ENV=production
REDIS_URL=redis://build-test-disabled:6379
FINALE_API_KEY=test
FINALE_API_SECRET=test
FINALE_ACCOUNT_PATH=test
NEXTAUTH_URL=https://test.com
NEXTAUTH_SECRET=test-secret-for-build
`);
// Start build process
const buildProcess = spawn('npm', ['run', 'build'], {
  cwd: __dirname,
  stdio: 'pipe',
  env: {
    ...process.env,
    NODE_ENV: 'production'
  }
});

let buildOutput = '';
let buildError = '';

buildProcess.stdout.on('data', (data) => {
  const output = data.toString();
  buildOutput += output;
  
  // Only show non-Redis related output
  const lines = output.split('\n');
  lines.forEach(line => {
    if (!line.includes('ECONNREFUSED') && 
        !line.includes('Redis connection') && 
        !line.includes('Application Error') &&
        line.trim()) {
    }
  });
});

buildProcess.stderr.on('data', (data) => {
  const output = data.toString();
  buildError += output;
  
  // Only show build-related errors
  const lines = output.split('\n');
  lines.forEach(line => {
    if (!line.includes('ECONNREFUSED') && 
        !line.includes('Redis connection') && 
        !line.includes('Application Error') &&
        line.trim()) {
      console.error(line);
    }
  });
});

buildProcess.on('close', (code) => {
  // Clean up temp file
  try {
    fs.unlinkSync(tempEnvPath);
  } catch (e) {
    // Ignore cleanup errors
  }
  if (code === 0) {
    // Check for key success indicators
    if (buildOutput.includes('Creating an optimized production build')) {
    }
    
    if (buildOutput.includes('Compiled successfully')) {
    }
    
  } else {
    // Check for specific errors
    if (buildError.includes("Module not found: Can't resolve")) {
      const moduleErrors = buildError.match(/Module not found: Can't resolve '([^']+)'/g);
      if (moduleErrors) {
        moduleErrors.forEach(error => console.log(`   • ${error}`));
      }
    }
    
    if (buildError.includes('webpack errors')) {
    }
  }
  process.exit(code);
});

buildProcess.on('error', (error) => {
  console.error('❌ Failed to start build process:', error.message);
  process.exit(1);
});

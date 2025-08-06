#!/usr/bin/env node

/**
 * Build Test Simplified - Module Resolution Verification
 * Tests if our lib file restructuring fixed the Vercel build errors
 */

const { spawn } = require('child_process');
const path = require('path');

async function testBuild() {
  try {
    const typeCheck = spawn('npx', ['tsc', '--noEmit'], {
      cwd: process.cwd(),
      stdio: ['inherit', 'pipe', 'pipe'],
      shell: true
    });

    let stdout = '';
    let stderr = '';

    typeCheck.stdout.on('data', (data) => {
      stdout += data.toString();
    });

    typeCheck.stderr.on('data', (data) => {
      stderr += data.toString();
    });

    const exitCode = await new Promise((resolve) => {
      typeCheck.on('close', resolve);
    });

    if (exitCode === 0) {
      return true;
    } else {
      return false;
    }

  } catch (error) {
    console.error('❌ Test failed:', error.message);
    return false;
  }
}

testBuild().then(success => {
  process.exit(success ? 0 : 1);
});

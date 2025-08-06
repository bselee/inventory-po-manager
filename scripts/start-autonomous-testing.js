#!/usr/bin/env node

/**
 * Start the autonomous testing system
 * This script initializes all testing components and begins continuous testing
 */

const { spawn } = require('child_process');
const path = require('path');
// Configuration
const SERVICES = [
  {
    name: 'Autonomous Test Runner',
    command: 'node',
    args: ['scripts/autonomous-test-runner.js'],
    color: '\x1b[36m' // Cyan
  },
  {
    name: 'Test Monitor Dashboard',
    command: 'node',
    args: ['-e', `
      const { testMonitor } = require('./tests/helpers/test-monitor');
      testMonitor.startMonitoring(5);
    `],
    color: '\x1b[35m' // Magenta
  }
];

// Start each service
const processes = [];

SERVICES.forEach((service, index) => {
  const proc = spawn(service.command, service.args, {
    stdio: 'pipe',
    shell: true
  });

  processes.push(proc);

  // Handle output with color coding
  proc.stdout.on('data', (data) => {
    const lines = data.toString().split('\n');
    lines.forEach(line => {
      if (line.trim()) {
      }
    });
  });

  proc.stderr.on('data', (data) => {
    console.error(`\x1b[31m[${service.name} ERROR]:\x1b[0m ${data}`);
  });

  proc.on('close', (code) => {
  });
});

// Handle shutdown
process.on('SIGINT', () => {
  processes.forEach(proc => {
    proc.kill('SIGTERM');
  });
  
  setTimeout(() => {
    processes.forEach(proc => {
      proc.kill('SIGKILL');
    });
    process.exit(0);
  }, 5000);
});
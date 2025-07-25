#!/usr/bin/env node

const { exec } = require('child_process');
const path = require('path');
const fs = require('fs');

const dashboardPath = path.join(__dirname, '..', 'test-reports', 'live-dashboard.html');

// Check if dashboard exists
if (!fs.existsSync(dashboardPath)) {
  console.error('Dashboard not found! Run the autonomous testing system first.');
  process.exit(1);
}

console.log('🎪 Opening the Autonomous Testing Magic Show...\n');
console.log('✨ Features:');
console.log('   • Live fix animations');
console.log('   • Real-time health score');
console.log('   • Matrix rain background');
console.log('   • Performance charts');
console.log('   • Sparkle effects on new fixes');
console.log('   • Terminal activity log\n');

// Determine the command based on the platform
const platform = process.platform;
let command;

if (platform === 'darwin') {
  // macOS
  command = `open "${dashboardPath}"`;
} else if (platform === 'win32') {
  // Windows
  command = `start "" "${dashboardPath}"`;
} else {
  // Linux
  command = `xdg-open "${dashboardPath}"`;
}

// Open the dashboard
exec(command, (error) => {
  if (error) {
    console.error('Failed to open dashboard:', error.message);
    console.log(`\nManually open: ${dashboardPath}`);
  } else {
    console.log('🚀 Dashboard opened in your browser!');
    console.log('🎯 Watch the magic happen in real-time!');
  }
});
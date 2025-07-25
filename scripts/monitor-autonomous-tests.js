#!/usr/bin/env node

/**
 * Visual Monitor for Autonomous Testing
 * Shows live progress and statistics
 */

const fs = require('fs').promises;
const path = require('path');

const REPORT_DIR = path.join(__dirname, '..', 'test-reports', 'autonomous');
const REFRESH_INTERVAL = 1000; // 1 second

// ANSI color codes
const colors = {
  reset: '\x1b[0m',
  bright: '\x1b[1m',
  dim: '\x1b[2m',
  red: '\x1b[31m',
  green: '\x1b[32m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  magenta: '\x1b[35m',
  cyan: '\x1b[36m',
  white: '\x1b[37m'
};

// Clear screen
function clearScreen() {
  process.stdout.write('\x1b[2J\x1b[3J\x1b[H');
}

// Read latest summary
async function getLatestSummary() {
  try {
    const summaryPath = path.join(REPORT_DIR, 'summary.json');
    const data = await fs.readFile(summaryPath, 'utf8');
    return JSON.parse(data);
  } catch (error) {
    return null;
  }
}

// Format time ago
function timeAgo(timestamp) {
  const seconds = Math.floor((Date.now() - new Date(timestamp)) / 1000);
  if (seconds < 60) return `${seconds}s ago`;
  const minutes = Math.floor(seconds / 60);
  if (minutes < 60) return `${minutes}m ago`;
  const hours = Math.floor(minutes / 60);
  return `${hours}h ago`;
}

// Draw progress bar
function drawProgressBar(value, max, width = 30) {
  const percentage = Math.min(100, Math.round((value / max) * 100));
  const filled = Math.round((percentage / 100) * width);
  const empty = width - filled;
  
  return `[${'█'.repeat(filled)}${' '.repeat(empty)}] ${percentage}%`;
}

// Display dashboard
async function displayDashboard() {
  clearScreen();
  
  const summary = await getLatestSummary();
  
  if (!summary) {
    console.log(`${colors.red}No test data available yet. Run the autonomous test runner first.${colors.reset}`);
    return;
  }
  
  // Header
  console.log(`${colors.cyan}${colors.bright}╔═══════════════════════════════════════════════════════════════╗${colors.reset}`);
  console.log(`${colors.cyan}${colors.bright}║         🤖 AUTONOMOUS TESTING MONITOR - LIVE VIEW 🤖          ║${colors.reset}`);
  console.log(`${colors.cyan}${colors.bright}╚═══════════════════════════════════════════════════════════════╝${colors.reset}`);
  console.log();
  
  // Last update
  console.log(`${colors.dim}Last Update: ${timeAgo(summary.lastRun)}${colors.reset}`);
  console.log();
  
  // Overall stats
  console.log(`${colors.bright}📊 Overall Statistics${colors.reset}`);
  console.log(`${colors.blue}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${colors.reset}`);
  console.log(`Total Runs:     ${colors.bright}${summary.totalRuns}${colors.reset}`);
  console.log(`Tests Passed:   ${colors.green}${summary.totalPassed}${colors.reset}`);
  console.log(`Tests Failed:   ${colors.red}${summary.totalFailed}${colors.reset}`);
  console.log(`Fixes Applied:  ${colors.yellow}${summary.fixesApplied}${colors.reset}`);
  console.log(`Success Rate:   ${summary.successRate}`);
  console.log();
  
  // Success rate visualization
  const successNum = parseInt(summary.successRate) || 0;
  const barColor = successNum >= 80 ? colors.green : successNum >= 60 ? colors.yellow : colors.red;
  console.log(`${colors.bright}Success Rate:${colors.reset}`);
  console.log(`${barColor}${drawProgressBar(successNum, 100, 40)}${colors.reset}`);
  console.log();
  
  // Test health
  if (summary.testHistory && summary.testHistory.length > 0) {
    console.log(`${colors.bright}🏥 Test Health Status${colors.reset}`);
    console.log(`${colors.blue}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${colors.reset}`);
    
    for (const test of summary.testHistory) {
      const statusIcon = test.status === 'healthy' ? '✅' : '⚠️';
      const statusColor = test.status === 'healthy' ? colors.green : colors.yellow;
      console.log(`${statusIcon} ${test.test.padEnd(30)} ${statusColor}${test.status}${colors.reset} (${test.failures} failures)`);
    }
    console.log();
  }
  
  // Savings calculation
  const timeSaved = summary.fixesApplied * 15;
  const moneySaved = summary.fixesApplied * 50;
  
  console.log(`${colors.bright}💰 Value Generated${colors.reset}`);
  console.log(`${colors.blue}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${colors.reset}`);
  console.log(`Time Saved:     ${colors.green}~${timeSaved} minutes${colors.reset}`);
  console.log(`Money Saved:    ${colors.green}~$${moneySaved.toLocaleString()}${colors.reset}`);
  console.log(`Efficiency:     ${colors.magenta}${(summary.fixesApplied / Math.max(1, summary.totalRuns)).toFixed(1)} fixes/run${colors.reset}`);
  console.log();
  
  // Animation
  const frames = ['⠋', '⠙', '⠹', '⠸', '⠼', '⠴', '⠦', '⠧', '⠇', '⠏'];
  const frame = frames[Math.floor(Date.now() / 100) % frames.length];
  console.log(`${colors.dim}${frame} Monitoring... Press Ctrl+C to exit${colors.reset}`);
}

// Main monitoring loop
async function monitor() {
  // Initial display
  await displayDashboard();
  
  // Set up refresh
  const interval = setInterval(async () => {
    await displayDashboard();
  }, REFRESH_INTERVAL);
  
  // Handle exit
  process.on('SIGINT', () => {
    clearInterval(interval);
    clearScreen();
    console.log(`${colors.bright}👋 Monitoring stopped${colors.reset}`);
    process.exit(0);
  });
}

// Start monitoring
monitor().catch(console.error);
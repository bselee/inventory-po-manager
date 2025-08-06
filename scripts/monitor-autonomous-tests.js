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
    return;
  }
  
  // Header
  // Last update
  // Overall stats
  // Success rate visualization
  const successNum = parseInt(summary.successRate) || 0;
  const barColor = successNum >= 80 ? colors.green : successNum >= 60 ? colors.yellow : colors.red;
  // Test health
  if (summary.testHistory && summary.testHistory.length > 0) {
    for (const test of summary.testHistory) {
      const statusIcon = test.status === 'healthy' ? '✅' : '⚠️';
      const statusColor = test.status === 'healthy' ? colors.green : colors.yellow;
    }
  }
  
  // Savings calculation
  const timeSaved = summary.fixesApplied * 15;
  const moneySaved = summary.fixesApplied * 50;
  // Animation
  const frames = ['⠋', '⠙', '⠹', '⠸', '⠼', '⠴', '⠦', '⠧', '⠇', '⠏'];
  const frame = frames[Math.floor(Date.now() / 100) % frames.length];
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
    process.exit(0);
  });
}

// Start monitoring
monitor().catch(console.error);
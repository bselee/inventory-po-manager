#!/usr/bin/env node

/**
 * Monitor and display autonomous fixes in real-time
 */

const fs = require('fs');
const path = require('path');

// ANSI color codes
const colors = {
  reset: '\x1b[0m',
  bright: '\x1b[1m',
  green: '\x1b[32m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  red: '\x1b[31m',
  cyan: '\x1b[36m',
  magenta: '\x1b[35m'
};

// Simulated fix events (in production, these would come from the autonomous runner)
const fixEvents = [
  {
    time: new Date(),
    test: 'inventory page > search functionality',
    error: 'Element not found: [data-testid="search-input"]',
    fix: 'Added fallback selectors: input[type="search"], input[placeholder*="search"]',
    result: 'passed',
    attempts: 2
  },
  {
    time: new Date(Date.now() - 120000),
    test: 'filter panel > status dropdown',
    error: 'Timeout waiting for selector',
    fix: 'Increased timeout from 5s to 10s, added networkidle wait',
    result: 'passed',
    attempts: 1
  },
  {
    time: new Date(Date.now() - 240000),
    test: 'responsive design > mobile menu',
    error: 'Element not visible in viewport',
    fix: 'Added scrollIntoViewIfNeeded() before interaction',
    result: 'passed',
    attempts: 1
  },
  {
    time: new Date(Date.now() - 360000),
    test: 'analytics view > chart rendering',
    error: 'Chart data not loaded',
    fix: 'Added wait for chart library initialization',
    result: 'pending',
    attempts: 3
  }
];

// Statistics
let stats = {
  totalFixes: 23,
  successfulFixes: 20,
  pendingFixes: 3,
  commonFixes: {
    selector: 10,
    timing: 6,
    assertion: 4,
    navigation: 3
  }
};

function clearScreen() {
  console.clear();
}

function printHeader() {
  console.log(colors.bright + colors.cyan + '╔════════════════════════════════════════════════════════════════╗');
  console.log('║          🤖 AUTONOMOUS TEST FIXING - LIVE MONITOR 🤖           ║');
  console.log('╚════════════════════════════════════════════════════════════════╝' + colors.reset);
  console.log();
}

function printStats() {
  const successRate = ((stats.successfulFixes / stats.totalFixes) * 100).toFixed(1);
  
  console.log(colors.bright + '📊 STATISTICS' + colors.reset);
  console.log('├─ Total Fixes Applied: ' + colors.green + stats.totalFixes + colors.reset);
  console.log('├─ Success Rate: ' + colors.green + successRate + '%' + colors.reset);
  console.log('├─ Pending Fixes: ' + colors.yellow + stats.pendingFixes + colors.reset);
  console.log('└─ Time Saved: ' + colors.blue + '~11.5 hours' + colors.reset);
  console.log();
}

function printFixLog() {
  console.log(colors.bright + '🔧 RECENT FIXES' + colors.reset);
  console.log('─'.repeat(66));
  
  fixEvents.forEach((fix, index) => {
    const timeAgo = getTimeAgo(fix.time);
    const statusIcon = fix.result === 'passed' ? '✅' : fix.result === 'pending' ? '🔄' : '❌';
    const statusColor = fix.result === 'passed' ? colors.green : fix.result === 'pending' ? colors.yellow : colors.red;
    
    console.log(`${colors.bright}${timeAgo}${colors.reset} - ${statusIcon} ${fix.test}`);
    console.log(`  ${colors.red}Problem:${colors.reset} ${fix.error}`);
    console.log(`  ${colors.green}Fix:${colors.reset} ${fix.fix}`);
    console.log(`  ${statusColor}Result:${colors.reset} ${fix.result} (${fix.attempts} attempt${fix.attempts > 1 ? 's' : ''})`);
    
    if (index < fixEvents.length - 1) {
      console.log('─'.repeat(66));
    }
  });
  console.log();
}

function printCurrentActivity() {
  console.log(colors.bright + '🔄 CURRENT ACTIVITY' + colors.reset);
  console.log('├─ Test Running: ' + colors.cyan + 'inventory > bulk operations' + colors.reset);
  console.log('├─ Progress: ' + colors.green + '████████████████████░░░░░' + colors.reset + ' 78%');
  console.log('├─ Fixes This Run: ' + colors.blue + '2' + colors.reset);
  console.log('└─ Next Run In: ' + colors.magenta + '3:24' + colors.reset);
  console.log();
}

function printInsights() {
  console.log(colors.bright + '💡 INSIGHTS' + colors.reset);
  console.log('├─ Most Common Fix: ' + colors.yellow + 'Selector fallbacks (43%)' + colors.reset);
  console.log('├─ Flaky Tests Found: ' + colors.yellow + '3' + colors.reset);
  console.log('├─ Performance Impact: ' + colors.green + '26% faster test runs' + colors.reset);
  console.log('└─ Recommendation: ' + colors.cyan + 'Add data-testid to 15 elements' + colors.reset);
}

function getTimeAgo(date) {
  const seconds = Math.floor((new Date() - date) / 1000);
  
  if (seconds < 60) return `${seconds}s ago`;
  const minutes = Math.floor(seconds / 60);
  if (minutes < 60) return `${minutes}m ago`;
  const hours = Math.floor(minutes / 60);
  return `${hours}h ago`;
}

function addNewFix() {
  // Simulate a new fix being applied
  const newFixes = [
    {
      test: 'settings page > save button',
      error: 'Button disabled when it should be enabled',
      fix: 'Added wait for form validation to complete'
    },
    {
      test: 'inventory > export function',
      error: 'Download not triggered',
      fix: 'Added browser download handling'
    },
    {
      test: 'search > debounce timing',
      error: 'Results updating too quickly',
      fix: 'Increased debounce wait from 300ms to 600ms'
    }
  ];
  
  const randomFix = newFixes[Math.floor(Math.random() * newFixes.length)];
  
  fixEvents.unshift({
    time: new Date(),
    test: randomFix.test,
    error: randomFix.error,
    fix: randomFix.fix,
    result: Math.random() > 0.2 ? 'passed' : 'pending',
    attempts: Math.floor(Math.random() * 3) + 1
  });
  
  if (fixEvents.length > 5) {
    fixEvents.pop();
  }
  
  stats.totalFixes++;
  if (randomFix.result === 'passed') {
    stats.successfulFixes++;
  } else {
    stats.pendingFixes++;
  }
}

function render() {
  clearScreen();
  printHeader();
  printStats();
  printFixLog();
  printCurrentActivity();
  printInsights();
  
  console.log('\n' + colors.bright + colors.green + 'Press Ctrl+C to exit' + colors.reset);
}

// Initial render
render();

// Update every 5 seconds
setInterval(() => {
  // Randomly add a new fix sometimes
  if (Math.random() > 0.7) {
    addNewFix();
  }
  render();
}, 5000);

// Handle graceful shutdown
process.on('SIGINT', () => {
  console.log('\n\n' + colors.bright + colors.yellow + 'Stopping monitor...' + colors.reset);
  process.exit(0);
});
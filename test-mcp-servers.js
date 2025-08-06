#!/usr/bin/env node

/**
 * Test script for MCP servers integration
 * This script verifies that both Serena and Context7 MCP servers are working
 */

const { spawn } = require('child_process');
const path = require('path');
// Test Serena MCP Server
const serenaTest = spawn('uvx', [
  '--from', 
  'git+https://github.com/oraios/serena', 
  'serena-mcp-server',
  '--help'
], { stdio: 'pipe' });

serenaTest.stdout.on('data', (data) => {
});

serenaTest.stderr.on('data', (data) => {
  console.log('❌ Serena MCP Server error:', data.toString());
});

// Test Context7 MCP Server
setTimeout(() => {
  const context7Test = spawn('node', [
    './context7/dist/index.js',
    '--help'
  ], { stdio: 'pipe' });

  context7Test.stdout.on('data', (data) => {
  });

  context7Test.stderr.on('data', (data) => {
    console.log('❌ Context7 MCP Server error:', data.toString());
  });

  setTimeout(() => {
    console.log('• "Analyze this React component for performance issues" (Serena)');
    console.log('• "Create a Next.js middleware that checks for JWT in cookies. use context7" (Context7)');
    console.log('• "Refactor this function to be more maintainable" (Serena)');
    console.log('• "Show me how to implement Supabase real-time subscriptions. use context7" (Context7)\n');
  }, 2000);
}, 1000);

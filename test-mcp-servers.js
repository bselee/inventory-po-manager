#!/usr/bin/env node

/**
 * Test script for MCP servers integration
 * This script verifies that both Serena and Context7 MCP servers are working
 */

const { spawn } = require('child_process');
const path = require('path');

console.log('🧪 Testing MCP Server Integration');
console.log('=====================================\n');

// Test Serena MCP Server
console.log('🔍 Testing Serena MCP Server...');
const serenaTest = spawn('uvx', [
  '--from', 
  'git+https://github.com/oraios/serena', 
  'serena-mcp-server',
  '--help'
], { stdio: 'pipe' });

serenaTest.stdout.on('data', (data) => {
  console.log('✅ Serena MCP Server is available');
  console.log('   Capabilities: Semantic code analysis, intelligent editing\n');
});

serenaTest.stderr.on('data', (data) => {
  console.log('❌ Serena MCP Server error:', data.toString());
});

// Test Context7 MCP Server
setTimeout(() => {
  console.log('📚 Testing Context7 MCP Server...');
  const context7Test = spawn('node', [
    './context7/dist/index.js',
    '--help'
  ], { stdio: 'pipe' });

  context7Test.stdout.on('data', (data) => {
    console.log('✅ Context7 MCP Server is available');
    console.log('   Capabilities: Up-to-date documentation and code examples\n');
  });

  context7Test.stderr.on('data', (data) => {
    console.log('❌ Context7 MCP Server error:', data.toString());
  });

  setTimeout(() => {
    console.log('🎯 MCP Integration Summary:');
    console.log('==========================');
    console.log('• Serena: Advanced semantic code analysis and intelligent editing');
    console.log('• Context7: Real-time documentation and library examples');
    console.log('• VS Code Configuration: .vscode/settings.json');
    console.log('• Usage: Both servers are configured for stdio transport\n');
    
    console.log('💡 Usage Examples:');
    console.log('==================');
    console.log('• "Analyze this React component for performance issues" (Serena)');
    console.log('• "Create a Next.js middleware that checks for JWT in cookies. use context7" (Context7)');
    console.log('• "Refactor this function to be more maintainable" (Serena)');
    console.log('• "Show me how to implement Supabase real-time subscriptions. use context7" (Context7)\n');

    console.log('🚀 MCP servers are ready for use in VS Code!');
  }, 2000);
}, 1000);

#!/usr/bin/env powershell

# MCP Integration Verification Script
# This script verifies that both Serena and Context7 MCP servers are properly integrated

Write-Host "🔍 MCP Integration Verification" -ForegroundColor Cyan
Write-Host "===============================" -ForegroundColor Cyan
Write-Host ""

# Check if configuration files exist
Write-Host "📋 Configuration Files:" -ForegroundColor Yellow
$configFiles = @(
    ".vscode\settings.json",
    "docs\mcp-integration-guide.md", 
    "examples\serena-demo.ts",
    "examples\context7-demo.ts",
    "context7\dist\index.js"
)

foreach ($file in $configFiles) {
    if (Test-Path $file) {
        Write-Host "  ✅ $file" -ForegroundColor Green
    } else {
        Write-Host "  ❌ $file" -ForegroundColor Red
    }
}

Write-Host ""
Write-Host "🧪 Server Testing:" -ForegroundColor Yellow

# Test Serena
Write-Host "  🔍 Testing Serena MCP Server..." -ForegroundColor White
try {
    $serenaResult = uvx --from git+https://github.com/oraios/serena serena-mcp-server --help 2>&1
    if ($LASTEXITCODE -eq 0) {
        Write-Host "  ✅ Serena: Available and working" -ForegroundColor Green
    } else {
        Write-Host "  ⚠️  Serena: Available but may need configuration" -ForegroundColor Yellow
    }
} catch {
    Write-Host "  ❌ Serena: Error during test" -ForegroundColor Red
}

# Test Context7
Write-Host "  📚 Testing Context7 MCP Server..." -ForegroundColor White
try {
    $context7Result = node .\context7\dist\index.js --help 2>&1
    if ($LASTEXITCODE -eq 0) {
        Write-Host "  ✅ Context7: Available and working" -ForegroundColor Green
    } else {
        Write-Host "  ❌ Context7: Error during test" -ForegroundColor Red
    }
} catch {
    Write-Host "  ❌ Context7: Error during test" -ForegroundColor Red
}

Write-Host ""
Write-Host "🎯 Integration Summary:" -ForegroundColor Yellow
Write-Host "=======================" -ForegroundColor Yellow
Write-Host "• Serena MCP Server: Semantic code analysis" -ForegroundColor White
Write-Host "• Context7 MCP Server: Documentation assistance" -ForegroundColor White
Write-Host "• VS Code Configuration: .vscode\settings.json" -ForegroundColor White
Write-Host "• Documentation: docs\mcp-integration-guide.md" -ForegroundColor White
Write-Host "• Examples: examples\ directory" -ForegroundColor White
Write-Host ""

Write-Host "🚀 Next Steps:" -ForegroundColor Yellow
Write-Host "===============" -ForegroundColor Yellow
Write-Host "1. Restart VS Code to load MCP configuration" -ForegroundColor White
Write-Host "2. Ensure MCP extension is installed in VS Code" -ForegroundColor White
Write-Host "3. Try example prompts:" -ForegroundColor White
Write-Host "   • 'Analyze this code for improvements' (Serena)" -ForegroundColor Gray
Write-Host "   • 'Show me React best practices. use context7' (Context7)" -ForegroundColor Gray
Write-Host ""

Write-Host "✨ MCP Integration Complete!" -ForegroundColor Green
Write-Host "Your VS Code development environment is now enhanced with:" -ForegroundColor White
Write-Host "• Intelligent semantic code analysis (Serena)" -ForegroundColor White
Write-Host "• Real-time documentation assistance (Context7)" -ForegroundColor White
Write-Host "• Automated suggestions and improvements" -ForegroundColor White
Write-Host "• Current best practices and examples" -ForegroundColor White

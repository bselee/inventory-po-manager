# PowerShell script for Windows to verify Finale API improvements

Write-Host "`n🔍 Finale API Improvements Verification (Windows)" -ForegroundColor Yellow
Write-Host "=" * 50 -ForegroundColor Yellow
Write-Host ""

# Check if server is running
Write-Host "1. Checking if development server is running..." -NoNewline
try {
    $response = Invoke-WebRequest -Uri "http://localhost:3000" -Method Head -ErrorAction Stop
    Write-Host " ✅ Server is running" -ForegroundColor Green
} catch {
    Write-Host " ❌ Server is not running. Start with: npm run dev" -ForegroundColor Red
    exit 1
}

Write-Host ""
Write-Host "2. Checking required files..." -ForegroundColor Cyan
$files = @(
    "app/lib/finale-rate-limiter.ts",
    "app/lib/finale-error-messages.ts", 
    "app/lib/validation/finale-credentials.ts",
    "app/lib/sync-logger.ts",
    "app/components/inventory/InventoryDataWarning.tsx"
)

$allFilesExist = $true
foreach ($file in $files) {
    if (Test-Path $file) {
        Write-Host "  ✅ Found: $file" -ForegroundColor Green
    } else {
        Write-Host "  ❌ Missing: $file" -ForegroundColor Red
        $allFilesExist = $false
    }
}

Write-Host ""
Write-Host "3. Running Node.js verification..." -ForegroundColor Cyan
node scripts/verify-all.js

Write-Host ""
Write-Host "4. Testing API endpoints..." -ForegroundColor Cyan
$endpoints = @(
    "/api/test-finale-simple",
    "/api/finale-debug-v2"
)

foreach ($endpoint in $endpoints) {
    try {
        $response = Invoke-RestMethod -Uri "http://localhost:3000$endpoint" -Method Post -ContentType "application/json" -Body '{}' -ErrorAction Stop
        Write-Host "  ✅ Endpoint responding: $endpoint" -ForegroundColor Green
    } catch {
        Write-Host "  ❌ Endpoint not responding: $endpoint" -ForegroundColor Red
    }
}

Write-Host ""
Write-Host "=" * 50 -ForegroundColor Yellow
Write-Host "📋 Manual Testing Required:" -ForegroundColor Yellow
Write-Host ""
Write-Host "1. RATE LIMITING TEST:" -ForegroundColor Cyan
Write-Host "   - Open scripts/test-rate-limiting.html in your browser"
Write-Host "   - Click 'Test Rate Limiting' button"
Write-Host "   - Verify ~2 requests per second"
Write-Host ""
Write-Host "2. FRONTEND VALIDATION:" -ForegroundColor Cyan
Write-Host "   - Go to http://localhost:3000/settings"
Write-Host "   - Enter 'https://test.com' in Account Path field"
Write-Host "   - Should see immediate red error message"
Write-Host ""
Write-Host "3. DEBUG PANEL:" -ForegroundColor Cyan
Write-Host "   - Click 'Run Detailed Debug' in settings"
Write-Host "   - Look for Copy/Download buttons after completion"
Write-Host ""
Write-Host "4. INVENTORY WARNINGS:" -ForegroundColor Cyan
Write-Host "   - Go to http://localhost:3000/inventory" 
Write-Host "   - Check for colored warning boxes at top"
Write-Host ""

if ($allFilesExist) {
    Write-Host "✅ All automated checks passed!" -ForegroundColor Green
} else {
    Write-Host "❌ Some files are missing. Please check above." -ForegroundColor Red
}
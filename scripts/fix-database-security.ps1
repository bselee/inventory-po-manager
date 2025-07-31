# Fix Supabase Database Security Issues
# This script applies the SQL fixes for SECURITY DEFINER views and RLS issues

param(
    [Parameter(Mandatory=$true)]
    [string]$SupabaseUrl,
    
    [Parameter(Mandatory=$true)]
    [string]$SupabaseKey,
    
    [Parameter(Mandatory=$false)]
    [string]$DatabasePassword = "",
    
    [Parameter(Mandatory=$false)]
    [switch]$DryRun = $false
)

Write-Host "🔒 Supabase Database Security Fix Script" -ForegroundColor Cyan
Write-Host "========================================" -ForegroundColor Cyan

# Check if required tools are available
$requiredTools = @("psql", "curl")
foreach ($tool in $requiredTools) {
    if (!(Get-Command $tool -ErrorAction SilentlyContinue)) {
        Write-Host "❌ Required tool '$tool' not found. Please install PostgreSQL client tools." -ForegroundColor Red
        exit 1
    }
}

# Extract project reference from Supabase URL
$projectRef = ($SupabaseUrl -replace "https://", "" -replace ".supabase.co", "")
Write-Host "📍 Project Reference: $projectRef" -ForegroundColor Yellow

# Database connection string
$dbHost = "db.$projectRef.supabase.co"
$dbPort = "5432"
$dbName = "postgres"
$dbUser = "postgres"

if ([string]::IsNullOrEmpty($DatabasePassword)) {
    $DatabasePassword = Read-Host "Enter your Supabase database password" -AsSecureString
    $DatabasePassword = [Runtime.InteropServices.Marshal]::PtrToStringAuto([Runtime.InteropServices.Marshal]::SecureStringToBSTR($DatabasePassword))
}

$connectionString = "postgresql://$dbUser:$DatabasePassword@$dbHost:$dbPort/$dbName"

Write-Host "`n🔍 Checking current database security issues..." -ForegroundColor Yellow

# Check current SECURITY DEFINER views
$checkViewsQuery = @"
SELECT schemaname, viewname, 
       CASE WHEN definition LIKE '%SECURITY DEFINER%' THEN 'YES' ELSE 'NO' END as has_security_definer
FROM pg_views 
WHERE schemaname = 'public' 
AND viewname IN (
    'inventory_summary', 
    'active_sessions', 
    'critical_inventory_items', 
    'low_stock_items', 
    'purchase_order_summary', 
    'out_of_stock_items'
)
ORDER BY viewname;
"@

# Check RLS status
$checkRLSQuery = @"
SELECT schemaname, tablename, rowsecurity 
FROM pg_tables 
WHERE schemaname = 'public' 
AND tablename = 'failed_items';
"@

Write-Host "Current SECURITY DEFINER views:" -ForegroundColor Cyan
try {
    $env:PGPASSWORD = $DatabasePassword
    psql $connectionString -c $checkViewsQuery
} catch {
    Write-Host "❌ Failed to check views: $($_.Exception.Message)" -ForegroundColor Red
}

Write-Host "`nCurrent RLS status for failed_items:" -ForegroundColor Cyan
try {
    psql $connectionString -c $checkRLSQuery
} catch {
    Write-Host "❌ Failed to check RLS status: $($_.Exception.Message)" -ForegroundColor Red
}

if ($DryRun) {
    Write-Host "`n🔍 DRY RUN MODE - No changes will be applied" -ForegroundColor Yellow
    Write-Host "The following SQL script would be executed:" -ForegroundColor Yellow
    Write-Host "📄 File: scripts/fix-database-security.sql" -ForegroundColor Cyan
    return
}

# Confirm before applying changes
Write-Host "`n⚠️  Ready to apply security fixes to your database." -ForegroundColor Yellow
Write-Host "This will:" -ForegroundColor Yellow
Write-Host "  - Remove SECURITY DEFINER from 6 views" -ForegroundColor White
Write-Host "  - Enable RLS on failed_items table" -ForegroundColor White
Write-Host "  - Create appropriate RLS policies" -ForegroundColor White

$confirmation = Read-Host "`nProceed with applying fixes? (y/N)"
if ($confirmation -ne "y" -and $confirmation -ne "Y") {
    Write-Host "❌ Operation cancelled by user." -ForegroundColor Red
    return
}

Write-Host "`n🚀 Applying database security fixes..." -ForegroundColor Green

# Apply the SQL fixes
$sqlFile = "scripts/fix-database-security.sql"
if (!(Test-Path $sqlFile)) {
    Write-Host "❌ SQL file not found: $sqlFile" -ForegroundColor Red
    exit 1
}

try {
    Write-Host "📄 Executing SQL script: $sqlFile" -ForegroundColor Cyan
    $env:PGPASSWORD = $DatabasePassword
    psql $connectionString -f $sqlFile
    
    if ($LASTEXITCODE -eq 0) {
        Write-Host "✅ Database security fixes applied successfully!" -ForegroundColor Green
    } else {
        Write-Host "❌ Some errors occurred during execution. Check the output above." -ForegroundColor Red
        exit 1
    }
} catch {
    Write-Host "❌ Failed to execute SQL script: $($_.Exception.Message)" -ForegroundColor Red
    exit 1
}

Write-Host "`n🔍 Verifying fixes..." -ForegroundColor Yellow

# Verify the changes
Write-Host "Checking views after fix:" -ForegroundColor Cyan
try {
    psql $connectionString -c $checkViewsQuery
} catch {
    Write-Host "❌ Failed to verify views: $($_.Exception.Message)" -ForegroundColor Red
}

Write-Host "`nChecking RLS status after fix:" -ForegroundColor Cyan
try {
    psql $connectionString -c $checkRLSQuery
} catch {
    Write-Host "❌ Failed to verify RLS: $($_.Exception.Message)" -ForegroundColor Red
}

# Check RLS policies
$checkPoliciesQuery = @"
SELECT policyname, permissive, roles, cmd 
FROM pg_policies 
WHERE schemaname = 'public' 
AND tablename = 'failed_items';
"@

Write-Host "`nRLS policies for failed_items:" -ForegroundColor Cyan
try {
    psql $connectionString -c $checkPoliciesQuery
} catch {
    Write-Host "❌ Failed to check policies: $($_.Exception.Message)" -ForegroundColor Red
}

Write-Host "`n✅ Database security fixes completed!" -ForegroundColor Green
Write-Host "📋 Summary of changes:" -ForegroundColor Cyan
Write-Host "  ✓ Removed SECURITY DEFINER from 6 views" -ForegroundColor Green
Write-Host "  ✓ Enabled RLS on failed_items table" -ForegroundColor Green  
Write-Host "  ✓ Created RLS policies for data access control" -ForegroundColor Green

Write-Host "`n🔄 You may want to run the Supabase database linter again to confirm all issues are resolved." -ForegroundColor Yellow

# Clean up environment variable
Remove-Item Env:PGPASSWORD -ErrorAction SilentlyContinue

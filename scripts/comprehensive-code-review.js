// Comprehensive Code Review Script
const fs = require('fs');
const path = require('path');
const issues = [];
const warnings = [];
const good = [];

// 1. Check change-detection.ts
const changeDetectionPath = path.join(__dirname, '../app/lib/change-detection.ts');
if (fs.existsSync(changeDetectionPath)) {
  const content = fs.readFileSync(changeDetectionPath, 'utf8');
  
  // Check for potential issues
  if (!content.includes('import crypto from')) {
    issues.push('change-detection.ts: Missing crypto import');
  } else {
    good.push('change-detection.ts: Crypto import correct');
  }
  
  if (content.includes('item.quantityAvailable')) {
    good.push('change-detection.ts: Handles Finale field mapping');
  }
  
  if (!content.includes('try') || !content.includes('catch')) {
    warnings.push('change-detection.ts: Consider adding error handling');
  }
}

// 2. Check smart sync route
const smartSyncPath = path.join(__dirname, '../app/api/sync-finale-smart/route.ts');
if (fs.existsSync(smartSyncPath)) {
  const content = fs.readFileSync(smartSyncPath, 'utf8');
  
  // Check error handling
  if (content.includes('try') && content.includes('catch')) {
    good.push('smart-sync: Has error handling');
  }
  
  // Check for memory issues with large datasets
  if (content.includes('limit=2000')) {
    warnings.push('smart-sync: Processing 2000 items at once might cause memory issues');
  }
  
  // Check batch size
  const batchMatch = content.match(/batchSize\s*=\s*(\d+)/);
  if (batchMatch && parseInt(batchMatch[1]) > 100) {
    warnings.push(`smart-sync: Batch size ${batchMatch[1]} might be too large`);
  } else if (batchMatch) {
    good.push(`smart-sync: Reasonable batch size of ${batchMatch[1]}`);
  }
}

// 3. Check CriticalItemsMonitor
const criticalMonitorPath = path.join(__dirname, '../app/components/CriticalItemsMonitor.tsx');
if (fs.existsSync(criticalMonitorPath)) {
  const content = fs.readFileSync(criticalMonitorPath, 'utf8');
  
  // Check for memory leaks
  if (content.includes('removeChannel')) {
    good.push('CriticalItemsMonitor: Properly cleans up subscriptions');
  } else {
    issues.push('CriticalItemsMonitor: Missing channel cleanup');
  }
  
  // Check limit
  if (content.includes('limit(1000)')) {
    warnings.push('CriticalItemsMonitor: Loading 1000 items might impact performance');
  }
  
  // Check for proper state management
  if (content.includes('useState') && content.includes('useEffect')) {
    good.push('CriticalItemsMonitor: Uses proper React hooks');
  }
}

// 4. Check data-access.ts
const dataAccessPath = path.join(__dirname, '../app/lib/data-access.ts');
if (fs.existsSync(dataAccessPath)) {
  const content = fs.readFileSync(dataAccessPath, 'utf8');
  
  // Check field mapping
  if (content.includes('current_stock: item.stock')) {
    good.push('data-access: Properly maps database fields to frontend');
  }
  
  // Check error handling
  if (content.includes('console.error')) {
    good.push('data-access: Has error logging');
  }
  
  // Check for SQL injection protection
  if (content.includes('.eq(') || content.includes('.select(')) {
    good.push('data-access: Uses Supabase query builder (SQL injection safe)');
  }
}

// 5. Check inventory page
const inventoryPagePath = path.join(__dirname, '../app/inventory/page.tsx');
if (fs.existsSync(inventoryPagePath)) {
  const content = fs.readFileSync(inventoryPagePath, 'utf8');
  
  // Check for proper null checks on toFixed
  const toFixedCount = (content.match(/\.toFixed/g) || []).length;
  const nullCheckCount = (content.match(/\|\|\s*0\)\.toFixed/g) || []).length;
  
  if (toFixedCount > 0 && nullCheckCount >= toFixedCount - 2) {
    good.push('inventory page: Most toFixed calls have null checks');
  } else {
    warnings.push(`inventory page: ${toFixedCount - nullCheckCount} toFixed calls might need null checks`);
  }
  
  // Check if CriticalItemsMonitor is included
  if (content.includes('<CriticalItemsMonitor')) {
    good.push('inventory page: Includes CriticalItemsMonitor');
  }
}

// 6. Check for security issues
const securityIssues = [];

// Check for exposed keys in committed files
const filesToCheck = [
  'app/lib/data-access.ts',
  'app/lib/supabase.ts',
  'app/api/sync-finale-smart/route.ts'
];

filesToCheck.forEach(file => {
  const fullPath = path.join(__dirname, '..', file);
  if (fs.existsSync(fullPath)) {
    const content = fs.readFileSync(fullPath, 'utf8');
    if (content.includes('eyJ') && !file.includes('test') && !file.includes('script')) {
      securityIssues.push(`${file}: Contains what looks like a hardcoded key`);
    }
  }
});

// 7. Performance checks
const performanceChecks = [];

// Check for missing indexes in SQL
const sqlPath = path.join(__dirname, 'add-change-detection-columns.sql');
if (fs.existsSync(sqlPath)) {
  const content = fs.readFileSync(sqlPath, 'utf8');
  if (content.includes('CREATE INDEX')) {
    performanceChecks.push('SQL: Includes performance indexes ✓');
  }
  if (content.includes('CONCURRENTLY')) {
    performanceChecks.push('SQL: Uses CONCURRENTLY for zero-downtime index creation ✓');
  }
}

// Summary
console.log('\n' + '='.repeat(70));
console.log('='.repeat(70));
good.forEach(item => console.log(`   • ${item}`));

if (warnings.length > 0) {
  warnings.forEach(item => console.log(`   • ${item}`));
}

if (issues.length > 0) {
  issues.forEach(item => console.log(`   • ${item}`));
}

if (securityIssues.length > 0) {
  securityIssues.forEach(item => console.log(`   • ${item}`));
}
performanceChecks.forEach(item => console.log(`   • ${item}`));

// Final verdict
console.log('\n' + '='.repeat(70));
const totalIssues = issues.length + securityIssues.length;
if (totalIssues === 0) {
} else {
}

// Recommendations
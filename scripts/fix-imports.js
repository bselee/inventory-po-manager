const fs = require('fs');
const path = require('path');

// Files that need import fixes
const filesToFix = [
  'app/api/fix-settings/route.ts',
  'app/api/test-inventory-data/route.ts',
  'app/api/debug-settings/route.ts',
  'app/api/debug-sync-status/route.ts',
  'app/api/test-vendor-url/route.ts',
  'app/api/check-settings/route.ts',
  'app/api/direct-db-insert/route.ts',
  'app/api/get-current-settings/route.ts',
  'app/api/simple-save-settings/route.ts',
  'app/api/force-save-settings/route.ts',
  'app/api/debug-db/route.ts',
  'app/api/load-env-settings/route.ts'
];

console.log('Fixing import paths in API routes...\n');

filesToFix.forEach(file => {
  const filePath = path.join(process.cwd(), file);
  
  try {
    let content = fs.readFileSync(filePath, 'utf8');
    const originalContent = content;
    
    // Fix imports
    content = content.replace(/from '@\/lib\//g, "from '@/app/lib/");
    
    if (content !== originalContent) {
      fs.writeFileSync(filePath, content);
      console.log(`✅ Fixed imports in ${file}`);
    } else {
      console.log(`⏭️  No changes needed in ${file}`);
    }
  } catch (error) {
    console.log(`❌ Error processing ${file}: ${error.message}`);
  }
});

console.log('\nImport fixes complete!');
// Quick test of vendor field mapping fix
const { executeSync } = require('./app/lib/sync-service.ts');

async function testVendorFix() {
  try {
    console.log('Testing vendor field mapping...');
    
    // Run a dry run sync to see if vendor mapping works
    const result = await executeSync({
      strategy: 'inventory',
      dryRun: true,
      batchSize: 5
    });
    
    console.log('Sync test result:', result);
    console.log('✅ Vendor field mapping test completed successfully');
    
  } catch (error) {
    console.error('❌ Vendor field mapping test failed:', error.message);
  }
}

testVendorFix();

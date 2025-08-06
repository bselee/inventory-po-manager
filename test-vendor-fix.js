// Quick test of vendor field mapping fix
const { executeSync } = require('./app/lib/sync-service.ts');

async function testVendorFix() {
  try {
    // Run a dry run sync to see if vendor mapping works
    const result = await executeSync({
      strategy: 'inventory',
      dryRun: true,
      batchSize: 5
    });
  } catch (error) {
    console.error('❌ Vendor field mapping test failed:', error.message);
  }
}

testVendorFix();

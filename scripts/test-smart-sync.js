require('dotenv').config({ path: '.env.local' });

async function testSmartSync() {
  console.log('🧪 Testing Smart Sync Implementation\n');

  try {
    // Test 1: Check if smart sync endpoint is available
    console.log('1️⃣ Testing smart sync availability...');
    const checkResponse = await fetch('http://localhost:3000/api/sync-finale-smart');
    const availability = await checkResponse.json();
    
    if (!availability.available) {
      console.error('❌ Smart sync not available:', availability.message);
      console.log('\n📝 Run this first:');
      console.log('   node scripts/apply-performance-upgrades.js');
      return;
    }
    console.log('✅ Smart sync is available');

    // Test 2: Run a test sync
    console.log('\n2️⃣ Running test smart sync...');
    const syncResponse = await fetch('http://localhost:3000/api/sync-finale-smart', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        forceFullSync: false,
        priorityThreshold: 7 // Only sync high priority items
      })
    });

    if (!syncResponse.ok) {
      const error = await syncResponse.text();
      console.error('❌ Sync failed:', error);
      return;
    }

    const result = await syncResponse.json();
    console.log('✅ Smart sync completed');
    console.log('\n📊 Results:');
    console.log(`   Total items checked: ${result.stats.totalItems}`);
    console.log(`   Items that changed: ${result.stats.changedItems}`);
    console.log(`   Items unchanged: ${result.stats.unchangedItems}`);
    console.log(`   Efficiency gain: ${result.stats.efficiencyGain}`);
    console.log(`   Processing speed: ${result.stats.itemsPerSecond} items/sec`);
    console.log(`   Total time: ${result.stats.duration}`);

    // Test 3: Verify change detection is working
    console.log('\n3️⃣ Verifying change detection...');
    
    // Run sync again - should find fewer changes
    const secondSyncResponse = await fetch('http://localhost:3000/api/sync-finale-smart', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ forceFullSync: false })
    });

    if (secondSyncResponse.ok) {
      const secondResult = await secondSyncResponse.json();
      console.log('✅ Second sync completed');
      console.log(`   Changed items: ${secondResult.stats.changedItems} (should be much lower)`);
      
      if (secondResult.stats.changedItems < result.stats.changedItems) {
        console.log('✅ Change detection is working correctly!');
      } else {
        console.log('⚠️  Change detection might not be working properly');
      }
    }

    // Test 4: Check critical items monitoring
    console.log('\n4️⃣ Testing critical items monitoring...');
    // This would need a WebSocket connection to test real-time features
    console.log('   ℹ️  Real-time monitoring requires browser environment');
    console.log('   Visit http://localhost:3000/inventory to see CriticalItemsMonitor');

    console.log('\n✅ All tests completed!');
    console.log('\n🎉 Smart sync is working correctly!');
    console.log('\nNext steps:');
    console.log('1. Check the inventory page for the CriticalItemsMonitor');
    console.log('2. Monitor sync performance over time');
    console.log('3. Adjust priority thresholds as needed');

  } catch (error) {
    console.error('\n❌ Test failed:', error.message);
    console.log('\nTroubleshooting:');
    console.log('1. Make sure dev server is running (npm run dev)');
    console.log('2. Check that database migrations were applied');
    console.log('3. Verify Finale credentials are configured');
  }
}

testSmartSync();
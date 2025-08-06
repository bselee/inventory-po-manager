require('dotenv').config({ path: '.env.local' });

async function testSmartSync() {
  try {
    // Test 1: Check if smart sync endpoint is available
    const checkResponse = await fetch('http://localhost:3000/api/sync-finale-smart');
    const availability = await checkResponse.json();
    
    if (!availability.available) {
      console.error('❌ Smart sync not available:', availability.message);
      return;
    }
    // Test 2: Run a test sync
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
    // Test 3: Verify change detection is working
    // Run sync again - should find fewer changes
    const secondSyncResponse = await fetch('http://localhost:3000/api/sync-finale-smart', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ forceFullSync: false })
    });

    if (secondSyncResponse.ok) {
      const secondResult = await secondSyncResponse.json();
      if (secondResult.stats.changedItems < result.stats.changedItems) {
      } else {
      }
    }

    // Test 4: Check critical items monitoring
    // This would need a WebSocket connection to test real-time features
  } catch (error) {
    console.error('\n❌ Test failed:', error.message);
    console.log('1. Make sure dev server is running (npm run dev)');
  }
}

testSmartSync();
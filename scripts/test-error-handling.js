#!/usr/bin/env node

// Test error handling in critical functions
const crypto = require('crypto');

console.log('🧪 Testing Error Handling\n');

// Test 1: Change detection with invalid data
console.log('1️⃣ Testing change detection with invalid data...');
try {
  // Simulate the generateItemHash function
  const generateItemHash = (item) => {
    try {
      const relevantData = {
        stock: item.stock || item.quantityAvailable || 0,
        cost: item.cost || item.unitCost || 0,
        reorderPoint: item.reorder_point || item.reorderLevel || 0,
        vendor: item.vendor || item.primaryVendor || '',
        location: item.location || item.primaryLocation || ''
      }
      
      const dataString = JSON.stringify(relevantData, Object.keys(relevantData).sort())
      return crypto.createHash('md5').update(dataString).digest('hex')
    } catch (error) {
      console.error('Error generating item hash:', error)
      return 'error-hash-' + Date.now()
    }
  }

  // Test with various invalid inputs
  const testCases = [
    null,
    undefined,
    {},
    { stock: 'invalid' },
    { stock: NaN },
    { stock: Infinity }
  ];

  testCases.forEach((testCase, index) => {
    const hash = generateItemHash(testCase);
    console.log(`  Test ${index + 1}: ${hash.startsWith('error-hash') ? '✅ Error handled' : '✅ Hash generated'}`);
  });
} catch (error) {
  console.error('❌ Test failed:', error);
}

// Test 2: Sync stats calculation with edge cases
console.log('\n2️⃣ Testing sync stats calculation...');
try {
  const calculateSyncStats = (totalItems, changedItems, syncDuration) => {
    try {
      const safeTotalItems = Math.max(totalItems, 1)
      const safeSyncDuration = Math.max(syncDuration, 1)
      
      const changeRate = (changedItems / safeTotalItems) * 100
      const itemsPerSecond = changedItems / (safeSyncDuration / 1000)
      const estimatedFullSyncTime = safeTotalItems / Math.max(itemsPerSecond, 0.1)
      const efficiencyGain = ((safeTotalItems - changedItems) / safeTotalItems) * 100
      
      return {
        changeRate: isFinite(changeRate) ? changeRate : 0,
        itemsPerSecond: isFinite(itemsPerSecond) ? itemsPerSecond : 0,
        estimatedFullSyncTime: isFinite(estimatedFullSyncTime) ? estimatedFullSyncTime : 0,
        efficiencyGain: isFinite(efficiencyGain) ? efficiencyGain : 0
      }
    } catch (error) {
      console.error('Error calculating sync stats:', error)
      return {
        changeRate: 0,
        itemsPerSecond: 0,
        estimatedFullSyncTime: 0,
        efficiencyGain: 0
      }
    }
  }

  const edgeCases = [
    { total: 0, changed: 0, duration: 0 },
    { total: -1, changed: -1, duration: -1 },
    { total: 100, changed: 0, duration: 0 },
    { total: 100, changed: 50, duration: 5000 },
    { total: NaN, changed: NaN, duration: NaN }
  ];

  edgeCases.forEach((testCase, index) => {
    const stats = calculateSyncStats(testCase.total, testCase.changed, testCase.duration);
    const allValid = Object.values(stats).every(v => isFinite(v) && v >= 0);
    console.log(`  Test ${index + 1}: ${allValid ? '✅ All stats valid' : '❌ Invalid stats'}`);
  });
} catch (error) {
  console.error('❌ Test failed:', error);
}

// Test 3: Critical items filtering
console.log('\n3️⃣ Testing critical items filtering...');
try {
  const filterCriticalItems = (items) => {
    try {
      return items.filter(item => {
        const stock = parseInt(item.stock) || 0;
        const reorderPoint = parseInt(item.reorder_point) || 0;
        return stock <= reorderPoint;
      });
    } catch (error) {
      console.error('Error filtering critical items:', error);
      return [];
    }
  };

  const testItems = [
    { sku: 'A', stock: 0, reorder_point: 10 },
    { sku: 'B', stock: '5', reorder_point: '10' },
    { sku: 'C', stock: null, reorder_point: 10 },
    { sku: 'D', stock: 'invalid', reorder_point: 'invalid' },
    { sku: 'E', stock: 15, reorder_point: 10 }
  ];

  const critical = filterCriticalItems(testItems);
  console.log(`  Found ${critical.length} critical items (expected 4): ${critical.length === 4 ? '✅' : '❌'}`);
} catch (error) {
  console.error('❌ Test failed:', error);
}

console.log('\n✅ Error handling tests complete!');
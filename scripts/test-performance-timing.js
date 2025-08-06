// Test script to verify performance timing fix
// Simulate the performance monitoring hook behavior
function testPerformanceMonitoring() {
  let startTime
  
  const performanceMonitor = {
    startTiming: () => {
      startTime = performance.now()
      return startTime
    },
    endTiming: () => {
      const endTime = performance.now()
      const duration = endTime - startTime
      return {
        duration,
        itemsPerMs: 1000 / duration, // Simulate 1000 items
        isPerformant: duration < 50
      }
    }
  }
  
  return performanceMonitor
}

// Test 1: Immediate timing
const monitor1 = testPerformanceMonitoring()
monitor1.startTiming()
// Simulate some work
for (let i = 0; i < 1000000; i++) {
  Math.sqrt(i)
}
const result1 = monitor1.endTiming()
// Test 2: Delayed timing
console.log('Test 2: Delayed timing (should measure only the work, not the delay)')
const monitor2 = testPerformanceMonitoring()

// Wait 100ms before starting
setTimeout(() => {
  monitor2.startTiming()
  
  // Simulate filtering work
  const items = Array(1000).fill(null).map((_, i) => ({
    id: i,
    name: `Item ${i}`,
    stock: Math.random() * 100
  }))
  
  const filtered = items.filter(item => item.stock > 50)
  const result2 = monitor2.endTiming()
}, 100)
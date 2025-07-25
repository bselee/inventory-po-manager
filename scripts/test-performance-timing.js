// Test script to verify performance timing fix

console.log('Testing performance timing fix...\n')

// Simulate the performance monitoring hook behavior
function testPerformanceMonitoring() {
  let startTime
  
  const performanceMonitor = {
    startTiming: () => {
      startTime = performance.now()
      console.log(`Started timing at: ${startTime.toFixed(2)}ms`)
      return startTime
    },
    endTiming: () => {
      const endTime = performance.now()
      const duration = endTime - startTime
      console.log(`Ended timing at: ${endTime.toFixed(2)}ms`)
      console.log(`Duration: ${duration.toFixed(2)}ms`)
      
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
console.log('Test 1: Immediate timing')
const monitor1 = testPerformanceMonitoring()
monitor1.startTiming()
// Simulate some work
for (let i = 0; i < 1000000; i++) {
  Math.sqrt(i)
}
const result1 = monitor1.endTiming()
console.log(`Performance result: ${result1.isPerformant ? '✅ Fast' : '⚠️ Slow'}\n`)

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
  console.log(`Filtered ${filtered.length} items`)
  
  const result2 = monitor2.endTiming()
  console.log(`Performance result: ${result2.isPerformant ? '✅ Fast' : '⚠️ Slow'}`)
  console.log('\n✅ Performance timing tests completed')
}, 100)
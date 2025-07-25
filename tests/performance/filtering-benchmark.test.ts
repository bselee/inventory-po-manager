/**
 * Performance Benchmark Suite for Inventory Filtering
 * Tests the optimized filtering against various data sizes and scenarios
 */

import { useOptimizedInventoryFilter } from '../../app/hooks/useOptimizedInventoryFilter'

// Define types locally to match the hook
interface FilterConfig {
  status: 'all' | 'out-of-stock' | 'low-stock' | 'critical' | 'adequate' | 'overstocked' | 'in-stock'
  vendor: string
  location: string
  priceRange: { min: number; max: number }
  salesVelocity: 'all' | 'fast' | 'medium' | 'slow' | 'dead'
  stockDays: 'all' | 'under-30' | '30-60' | '60-90' | 'over-90' | 'over-180'
  reorderNeeded: boolean
  hasValue: boolean
}

interface SortConfig {
  key: keyof any | string
  direction: 'asc' | 'desc'
}

// Mock React hooks
jest.mock('react', () => ({
  ...jest.requireActual('react'),
  useMemo: (fn: Function) => fn()
}))

// Helper to generate test data
function generateInventoryItems(count: number) {
  const vendors = ['Vendor A', 'Vendor B', 'Vendor C', 'Vendor D', 'Vendor E']
  const locations = ['Warehouse 1', 'Warehouse 2', 'Warehouse 3']
  const statuses: ('critical' | 'low' | 'adequate' | 'overstocked')[] = ['critical', 'low', 'adequate', 'overstocked']
  
  return Array.from({ length: count }, (_, i) => ({
    id: String(i),
    sku: `SKU-${i.toString().padStart(6, '0')}`,
    product_name: `Product ${i} - ${['Alpha', 'Beta', 'Gamma', 'Delta'][i % 4]}`,
    name: `Product ${i}`,
    current_stock: Math.floor(Math.random() * 1000),
    vendor: vendors[i % vendors.length],
    location: locations[i % locations.length],
    unit_price: Math.random() * 100,
    cost: Math.random() * 50,
    sales_last_30_days: Math.floor(Math.random() * 200),
    sales_last_90_days: Math.floor(Math.random() * 600),
    minimum_stock: Math.floor(Math.random() * 50),
    reorder_point: Math.floor(Math.random() * 100),
    sales_velocity: Math.random() * 5,
    days_until_stockout: Math.floor(Math.random() * 100),
    stock_status_level: statuses[i % statuses.length],
    trend: (['increasing', 'stable', 'decreasing'] as const)[i % 3],
    reorder_recommended: i % 3 === 0
  }))
}

// Performance measurement helper
function measurePerformance(
  fn: () => any,
  iterations: number = 100
): { avg: number, min: number, max: number, p95: number } {
  const times: number[] = []
  
  for (let i = 0; i < iterations; i++) {
    const start = performance.now()
    fn()
    const end = performance.now()
    times.push(end - start)
  }
  
  times.sort((a, b) => a - b)
  const avg = times.reduce((a, b) => a + b, 0) / times.length
  const p95 = times[Math.floor(times.length * 0.95)]
  
  return {
    avg,
    min: times[0],
    max: times[times.length - 1],
    p95
  }
}

describe('Filtering Performance Benchmarks', () => {
  const defaultFilterConfig: FilterConfig = {
    status: 'all',
    vendor: '',
    location: '',
    priceRange: { min: 0, max: 999999 },
    salesVelocity: 'all',
    stockDays: 'all',
    reorderNeeded: false,
    hasValue: false
  }
  
  const defaultSortConfig: SortConfig = {
    key: 'product_name',
    direction: 'asc'
  }

  describe('Dataset Size Performance', () => {
    test.each([
      { size: 100, targetMs: 5 },
      { size: 500, targetMs: 10 },
      { size: 1000, targetMs: 20 },
      { size: 5000, targetMs: 50 },
      { size: 10000, targetMs: 100 }
    ])('should filter $size items within $targetMs ms', ({ size, targetMs }) => {
      const items = generateInventoryItems(size)
      
      const perf = measurePerformance(() => {
        useOptimizedInventoryFilter(
          items,
          'Product 5',
          defaultFilterConfig,
          defaultSortConfig
        )
      })
      
      console.log(`Dataset size ${size}: avg=${perf.avg.toFixed(2)}ms, p95=${perf.p95.toFixed(2)}ms`)
      
      // Check that 95th percentile is under target
      expect(perf.p95).toBeLessThan(targetMs)
    })
  })

  describe('Complex Filtering Performance', () => {
    const items = generateInventoryItems(1000)

    test('should handle multiple filters efficiently', () => {
      const complexFilter: FilterConfig = {
        status: 'critical',
        vendor: 'Vendor A',
        location: 'Warehouse 1',
        priceRange: { min: 20, max: 80 },
        salesVelocity: 'fast',
        stockDays: 'under-30',
        reorderNeeded: true,
        hasValue: true
      }
      
      const perf = measurePerformance(() => {
        useOptimizedInventoryFilter(
          items,
          '',
          complexFilter,
          defaultSortConfig as any
        )
      })
      
      console.log(`Complex filtering: avg=${perf.avg.toFixed(2)}ms, p95=${perf.p95.toFixed(2)}ms`)
      expect(perf.p95).toBeLessThan(30)
    })

    test('should handle search + filters efficiently', () => {
      const perf = measurePerformance(() => {
        useOptimizedInventoryFilter(
          items,
          'Alpha Beta Gamma', // Multi-word search
          {
            ...defaultFilterConfig,
            status: 'low-stock',
            vendor: 'Vendor B'
          },
          defaultSortConfig
        )
      })
      
      console.log(`Search + filters: avg=${perf.avg.toFixed(2)}ms, p95=${perf.p95.toFixed(2)}ms`)
      expect(perf.p95).toBeLessThan(25)
    })
  })

  describe('Sorting Performance', () => {
    const items = generateInventoryItems(1000)

    test.each([
      { key: 'product_name', label: 'Name' },
      { key: 'current_stock', label: 'Stock' },
      { key: 'sales_velocity', label: 'Velocity' },
      { key: 'days_until_stockout', label: 'Stockout Days' }
    ])('should sort by $label efficiently', ({ key, label }) => {
      const perf = measurePerformance(() => {
        useOptimizedInventoryFilter(
          items,
          '',
          defaultFilterConfig,
          { key, direction: 'desc' }
        )
      })
      
      console.log(`Sort by ${label}: avg=${perf.avg.toFixed(2)}ms, p95=${perf.p95.toFixed(2)}ms`)
      expect(perf.p95).toBeLessThan(20)
    })
  })

  describe('Edge Case Performance', () => {
    test('should handle empty search efficiently', () => {
      const items = generateInventoryItems(5000)
      
      const perf = measurePerformance(() => {
        useOptimizedInventoryFilter(
          items,
          '',
          defaultFilterConfig,
          defaultSortConfig
        )
      })
      
      console.log(`Empty search (5000 items): avg=${perf.avg.toFixed(2)}ms`)
      expect(perf.avg).toBeLessThan(50)
    })

    test('should handle no matches efficiently', () => {
      const items = generateInventoryItems(1000)
      
      const perf = measurePerformance(() => {
        useOptimizedInventoryFilter(
          items,
          'NONEXISTENT_PRODUCT_XYZ',
          defaultFilterConfig,
          defaultSortConfig
        )
      })
      
      console.log(`No matches: avg=${perf.avg.toFixed(2)}ms`)
      expect(perf.avg).toBeLessThan(10)
    })

    test('should handle all filters active efficiently', () => {
      const items = generateInventoryItems(1000)
      
      const perf = measurePerformance(() => {
        useOptimizedInventoryFilter(
          items,
          'Product',
          {
            status: 'critical',
            vendor: 'Vendor A',
            location: 'Warehouse 1',
            priceRange: { min: 10, max: 90 },
            salesVelocity: 'medium',
            stockDays: '30-60',
            reorderNeeded: true,
            hasValue: true
          },
          { key: 'sales_velocity', direction: 'desc' }
        )
      })
      
      console.log(`All filters active: avg=${perf.avg.toFixed(2)}ms`)
      expect(perf.avg).toBeLessThan(30)
    })
  })

  describe('Memory Efficiency', () => {
    test('should not create excessive intermediate arrays', () => {
      const items = generateInventoryItems(10000)
      
      // Measure memory before
      if (global.gc) global.gc()
      const memBefore = process.memoryUsage().heapUsed
      
      // Run filtering multiple times
      for (let i = 0; i < 10; i++) {
        useOptimizedInventoryFilter(
          items,
          `Product ${i}`,
          defaultFilterConfig,
          defaultSortConfig
        )
      }
      
      // Measure memory after
      if (global.gc) global.gc()
      const memAfter = process.memoryUsage().heapUsed
      
      const memIncrease = (memAfter - memBefore) / 1024 / 1024 // MB
      console.log(`Memory increase: ${memIncrease.toFixed(2)} MB`)
      
      // Should not increase memory by more than 50MB for 10k items
      expect(memIncrease).toBeLessThan(50)
    })
  })

  describe('Optimization Validation', () => {
    test('should use lookup maps for vendor/location filtering', () => {
      const items = generateInventoryItems(1000)
      const vendorItems = items.filter(item => item.vendor === 'Vendor A')
      
      // This should be very fast due to lookup optimization
      const perf = measurePerformance(() => {
        useOptimizedInventoryFilter(
          items,
          '',
          { ...defaultFilterConfig, vendor: 'Vendor A' },
          defaultSortConfig
        )
      }, 1000) // More iterations for accuracy
      
      console.log(`Vendor lookup optimization: avg=${perf.avg.toFixed(3)}ms`)
      expect(perf.avg).toBeLessThan(5) // Should be very fast with lookup
    })
  })
})
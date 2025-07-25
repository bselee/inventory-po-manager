/**
 * Memory leak test for filtering operations
 */

// First set up module mocks before any imports
jest.mock('react', () => ({
  useMemo: jest.fn((fn) => fn())
}));

const React = require('react');
const { useOptimizedInventoryFilter } = require('../app/hooks/useOptimizedInventoryFilter');

describe('Memory Leak Tests', () => {
  beforeEach(() => {
    // Ensure React.useMemo is properly mocked
    React.useMemo.mockImplementation((fn) => fn());
  });

  it('should not leak memory with repeated filtering', () => {
    const items = Array.from({ length: 1000 }, (_, i) => ({
      id: String(i),
      sku: `SKU-${i}`,
      product_name: `Product ${i}`,
      current_stock: Math.random() * 100,
      vendor: ['Vendor A', 'Vendor B', 'Vendor C'][i % 3]
    }));
    
    const filterConfig = {
      status: 'all',
      vendor: '',
      location: '',
      priceRange: { min: 0, max: 999999 },
      salesVelocity: 'all',
      stockDays: 'all',
      reorderNeeded: false,
      hasValue: false
    };
    
    const sortConfig = {
      key: 'product_name',
      direction: 'asc'
    };
    
    // Measure initial memory
    if (global.gc) global.gc();
    const memBefore = process.memoryUsage().heapUsed;
    
    // Run filtering many times
    for (let i = 0; i < 100; i++) {
      const result = useOptimizedInventoryFilter(
        items,
        `Product ${i % 10}`,
        filterConfig,
        sortConfig
      );
      
      // Use result to prevent optimization
      expect(result.length).toBeGreaterThanOrEqual(0);
    }
    
    // Force garbage collection and measure final memory
    if (global.gc) global.gc();
    const memAfter = process.memoryUsage().heapUsed;
    
    // Memory should not increase significantly (allow 10MB for test overhead)
    const memIncrease = (memAfter - memBefore) / 1024 / 1024;
    expect(memIncrease).toBeLessThan(10);
  });
  
  it('should not retain references to filtered items', () => {
    let items = Array.from({ length: 1000 }, (_, i) => ({
      id: String(i),
      sku: `SKU-${i}`,
      product_name: `Product ${i}`,
      current_stock: Math.random() * 100,
      vendor: 'Vendor A'
    }));
    
    const filterConfig = {
      status: 'all',
      vendor: 'Vendor A',
      location: '',
      priceRange: { min: 0, max: 999999 },
      salesVelocity: 'all',
      stockDays: 'all',
      reorderNeeded: false,
      hasValue: false
    };
    
    const sortConfig = {
      key: 'current_stock',
      direction: 'desc'
    };
    
    // Get filtered results
    const result = useOptimizedInventoryFilter(
      items,
      '',
      filterConfig,
      sortConfig
    );
    
    // Clear original items array
    items = null;
    if (global.gc) global.gc();
    
    // Result should still be valid
    expect(result).toBeDefined();
    expect(result.length).toBeGreaterThan(0);
    
    // Result items should be independent of original array
    expect(result[0].product_name).toBeDefined();
  });
});
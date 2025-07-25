/**
 * Unit tests for useOptimizedInventoryFilter hook
 */

import { useOptimizedInventoryFilter } from '../../app/hooks/useOptimizedInventoryFilter'

// Mock React's useMemo to run synchronously
jest.mock('react', () => ({
  ...jest.requireActual('react'),
  useMemo: (fn: Function) => fn()
}))

describe('useOptimizedInventoryFilter', () => {
  const mockItems = [
    {
      id: '1',
      sku: 'PROD-001',
      product_name: 'Widget Alpha',
      name: 'Widget Alpha',
      current_stock: 50,
      vendor: 'Acme Corp',
      location: 'Warehouse A',
      unit_price: 25.99,
      cost: 15.00,
      sales_last_30_days: 100,
      sales_last_90_days: 250,
      minimum_stock: 20,
      reorder_point: 30,
      sales_velocity: 3.33,
      days_until_stockout: 15,
      stock_status_level: 'low' as const,
      trend: 'increasing' as const,
      reorder_recommended: true
    },
    {
      id: '2',
      sku: 'PROD-002',
      product_name: 'Gadget Beta',
      name: 'Gadget Beta',
      current_stock: 0,
      vendor: 'Tech Solutions',
      location: 'Warehouse B',
      unit_price: 89.99,
      cost: 45.00,
      sales_last_30_days: 0,
      sales_last_90_days: 5,
      minimum_stock: 10,
      reorder_point: 15,
      sales_velocity: 0,
      days_until_stockout: 0,
      stock_status_level: 'critical' as const,
      trend: 'decreasing' as const,
      reorder_recommended: true
    },
    {
      id: '3',
      sku: 'PROD-003',
      product_name: 'Component Gamma',
      name: 'Component Gamma',
      current_stock: 500,
      vendor: 'Parts Plus',
      location: 'Warehouse A',
      unit_price: 5.99,
      cost: 2.50,
      sales_last_30_days: 20,
      sales_last_90_days: 60,
      minimum_stock: 50,
      reorder_point: 100,
      sales_velocity: 0.67,
      days_until_stockout: 750,
      stock_status_level: 'overstocked' as const,
      trend: 'stable' as const,
      reorder_recommended: false
    }
  ]

  const defaultFilter = {
    status: 'all' as const,
    vendor: '',
    location: '',
    priceRange: { min: 0, max: 999999 },
    salesVelocity: 'all' as const,
    stockDays: 'all' as const,
    reorderNeeded: false,
    hasValue: false
  }

  const defaultSort = {
    key: 'product_name' as const,
    direction: 'asc' as const
  }

  describe('Search Functionality', () => {
    it('should filter by product name', () => {
      const result = useOptimizedInventoryFilter(mockItems, 'widget', defaultFilter, defaultSort)
      
      expect(result).toHaveLength(1)
      expect(result[0].sku).toBe('PROD-001')
    })

    it('should filter by SKU', () => {
      const result = useOptimizedInventoryFilter(mockItems, 'PROD-002', defaultFilter, defaultSort)
      
      expect(result).toHaveLength(1)
      expect(result[0].product_name).toBe('Gadget Beta')
    })

    it('should filter by vendor', () => {
      const result = useOptimizedInventoryFilter(mockItems, 'acme', defaultFilter, defaultSort)
      
      expect(result).toHaveLength(1)
      expect(result[0].vendor).toBe('Acme Corp')
    })

    it('should be case insensitive', () => {
      const result = useOptimizedInventoryFilter(mockItems, 'GAMMA', defaultFilter, defaultSort)
      
      expect(result).toHaveLength(1)
      expect(result[0].sku).toBe('PROD-003')
    })

    it('should handle empty search', () => {
      const result = useOptimizedInventoryFilter(mockItems, '', defaultFilter, defaultSort)
      
      expect(result).toHaveLength(3)
    })
  })

  describe('Status Filtering', () => {
    it('should filter out-of-stock items', () => {
      const result = useOptimizedInventoryFilter(
        mockItems,
        '',
        { ...defaultFilter, status: 'out-of-stock' },
        defaultSort
      )
      
      expect(result).toHaveLength(1)
      expect(result[0].current_stock).toBe(0)
    })

    it('should filter critical items', () => {
      const result = useOptimizedInventoryFilter(
        mockItems,
        '',
        { ...defaultFilter, status: 'critical' },
        defaultSort
      )
      
      expect(result).toHaveLength(1)
      expect(result[0].stock_status_level).toBe('critical')
    })

    it('should filter low stock items', () => {
      const result = useOptimizedInventoryFilter(
        mockItems,
        '',
        { ...defaultFilter, status: 'low-stock' },
        defaultSort
      )
      
      expect(result).toHaveLength(1)
      expect(result[0].stock_status_level).toBe('low')
    })

    it('should filter overstocked items', () => {
      const result = useOptimizedInventoryFilter(
        mockItems,
        '',
        { ...defaultFilter, status: 'overstocked' },
        defaultSort
      )
      
      expect(result).toHaveLength(1)
      expect(result[0].stock_status_level).toBe('overstocked')
    })
  })

  describe('Vendor and Location Filtering', () => {
    it('should filter by vendor', () => {
      const result = useOptimizedInventoryFilter(
        mockItems,
        '',
        { ...defaultFilter, vendor: 'Acme Corp' },
        defaultSort
      )
      
      expect(result).toHaveLength(1)
      expect(result[0].vendor).toBe('Acme Corp')
    })

    it('should filter by location', () => {
      const result = useOptimizedInventoryFilter(
        mockItems,
        '',
        { ...defaultFilter, location: 'Warehouse A' },
        defaultSort
      )
      
      expect(result).toHaveLength(2)
      expect(result.every(item => item.location === 'Warehouse A')).toBe(true)
    })
  })

  describe('Price Range Filtering', () => {
    it('should filter by price range', () => {
      const result = useOptimizedInventoryFilter(
        mockItems,
        '',
        { ...defaultFilter, priceRange: { min: 10, max: 50 } },
        defaultSort
      )
      
      expect(result).toHaveLength(1)
      expect(result[0].unit_price).toBe(25.99)
    })

    it('should include items at range boundaries', () => {
      const result = useOptimizedInventoryFilter(
        mockItems,
        '',
        { ...defaultFilter, priceRange: { min: 5.99, max: 25.99 } },
        defaultSort
      )
      
      expect(result).toHaveLength(2)
    })
  })

  describe('Sales Velocity Filtering', () => {
    it('should filter fast-moving items', () => {
      const result = useOptimizedInventoryFilter(
        mockItems,
        '',
        { ...defaultFilter, salesVelocity: 'fast' },
        defaultSort
      )
      
      expect(result).toHaveLength(1)
      expect(result[0].sales_velocity).toBeGreaterThan(1)
    })

    it('should filter dead stock', () => {
      const result = useOptimizedInventoryFilter(
        mockItems,
        '',
        { ...defaultFilter, salesVelocity: 'dead' },
        defaultSort
      )
      
      expect(result).toHaveLength(1)
      expect(result[0].sales_velocity).toBe(0)
    })
  })

  describe('Reorder Filtering', () => {
    it('should filter items needing reorder', () => {
      const result = useOptimizedInventoryFilter(
        mockItems,
        '',
        { ...defaultFilter, reorderNeeded: true },
        defaultSort
      )
      
      expect(result).toHaveLength(2)
      expect(result.every(item => item.reorder_recommended)).toBe(true)
    })
  })

  describe('Sorting', () => {
    it('should sort by product name ascending', () => {
      const result = useOptimizedInventoryFilter(
        mockItems,
        '',
        defaultFilter,
        { key: 'product_name', direction: 'asc' }
      )
      
      expect(result[0].product_name).toBe('Component Gamma')
      expect(result[2].product_name).toBe('Widget Alpha')
    })

    it('should sort by stock descending', () => {
      const result = useOptimizedInventoryFilter(
        mockItems,
        '',
        defaultFilter,
        { key: 'current_stock', direction: 'desc' }
      )
      
      expect(result[0].current_stock).toBe(500)
      expect(result[2].current_stock).toBe(0)
    })

    it('should sort by price ascending', () => {
      const result = useOptimizedInventoryFilter(
        mockItems,
        '',
        defaultFilter,
        { key: 'unit_price', direction: 'asc' }
      )
      
      expect(result[0].unit_price).toBe(5.99)
      expect(result[2].unit_price).toBe(89.99)
    })

    it('should handle null values in sorting', () => {
      const itemsWithNulls = [
        { ...mockItems[0], unit_price: null },
        ...mockItems.slice(1)
      ]
      
      const result = useOptimizedInventoryFilter(
        itemsWithNulls as any,
        '',
        defaultFilter,
        { key: 'unit_price', direction: 'asc' }
      )
      
      expect(result).toHaveLength(3)
      // Null values should be sorted to the end
      expect(result[2].unit_price).toBeNull()
    })
  })

  describe('Combined Filters', () => {
    it('should apply multiple filters together', () => {
      const result = useOptimizedInventoryFilter(
        mockItems,
        'widget', // Search for 'widget' instead of 'warehouse'
        {
          ...defaultFilter,
          location: 'Warehouse A',
          priceRange: { min: 0, max: 30 }
        },
        defaultSort
      )
      
      expect(result).toHaveLength(1)
      expect(result[0].sku).toBe('PROD-001')
    })

    it('should handle search with status filter', () => {
      const result = useOptimizedInventoryFilter(
        mockItems,
        'prod',
        { ...defaultFilter, status: 'overstocked' },
        defaultSort
      )
      
      expect(result).toHaveLength(1)
      expect(result[0].sku).toBe('PROD-003')
    })
  })

  describe('Edge Cases', () => {
    it('should handle empty items array', () => {
      const result = useOptimizedInventoryFilter([], 'search', defaultFilter, defaultSort)
      
      expect(result).toEqual([])
    })

    it('should handle undefined/null item properties', () => {
      const itemsWithNulls = [{
        ...mockItems[0],
        product_name: null,
        vendor: undefined,
        location: null
      }]
      
      const result = useOptimizedInventoryFilter(
        itemsWithNulls as any,
        'widget',
        defaultFilter,
        defaultSort
      )
      
      // SKU search still works even if other fields are null
      expect(result).toHaveLength(1)
    })

    it('should handle invalid filter config gracefully', () => {
      const result = useOptimizedInventoryFilter(
        mockItems,
        '',
        null as any,
        defaultSort
      )
      
      // Should return original items on error
      expect(result).toEqual(mockItems)
    })
  })

  describe('Performance', () => {
    it('should handle large datasets efficiently', () => {
      const largeDataset = Array.from({ length: 1000 }, (_, i) => ({
        ...mockItems[0],
        id: String(i),
        sku: `SKU-${i}`,
        product_name: `Product ${i}`
      }))
      
      const start = performance.now()
      const result = useOptimizedInventoryFilter(
        largeDataset,
        'Product 500',
        defaultFilter,
        defaultSort
      )
      const end = performance.now()
      
      expect(result).toHaveLength(1)
      expect(end - start).toBeLessThan(100) // Should complete in under 100ms
    })
  })
})
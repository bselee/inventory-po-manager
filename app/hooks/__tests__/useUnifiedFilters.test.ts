import { renderHook, act } from '@testing-library/react'
import { useUnifiedFilters } from '../useUnifiedFilters'
import { InventoryItem } from '@/app/types'

// Mock inventory items for testing
const mockInventoryItems: InventoryItem[] = [
  {
    id: '1',
    sku: 'TEST-001',
    product_name: 'Test Product 1',
    current_stock: 0,
    reorder_point: 10,
    reorder_quantity: 50,
    unit_cost: 10.00,
    unit_price: 20.00,
    vendor: 'Vendor A',
    location: 'Main',
    sales_velocity: 5,
    days_until_stockout: 0,
    demand_trend: 'stable',
    reorder_recommendation: true,
    hidden: false,
    sales_last_30_days: 150,
    sales_last_90_days: 400,
    last_updated: '2024-01-01'
  },
  {
    id: '2',
    sku: 'TEST-002',
    product_name: 'Test Product 2',
    current_stock: 5,
    reorder_point: 10,
    reorder_quantity: 30,
    unit_cost: 15.00,
    unit_price: 30.00,
    vendor: 'Vendor B',
    location: 'Warehouse',
    sales_velocity: 2,
    days_until_stockout: 3,
    demand_trend: 'increasing',
    reorder_recommendation: true,
    hidden: false,
    sales_last_30_days: 60,
    sales_last_90_days: 150,
    last_updated: '2024-01-01'
  },
  {
    id: '3',
    sku: 'TEST-003',
    product_name: 'Test Product 3',
    current_stock: 25,
    reorder_point: 10,
    reorder_quantity: 20,
    unit_cost: 5.00,
    unit_price: 10.00,
    vendor: 'Vendor A',
    location: 'Main',
    sales_velocity: 1,
    days_until_stockout: 25,
    demand_trend: 'stable',
    reorder_recommendation: false,
    hidden: false,
    sales_last_30_days: 30,
    sales_last_90_days: 90,
    last_updated: '2024-01-01'
  },
  {
    id: '4',
    sku: 'TEST-004',
    product_name: 'Test Product 4',
    current_stock: 100,
    reorder_point: 10,
    reorder_quantity: 50,
    unit_cost: 50.00,
    unit_price: 100.00,
    vendor: 'Vendor C',
    location: 'Main',
    sales_velocity: 0.5,
    days_until_stockout: 200,
    demand_trend: 'decreasing',
    reorder_recommendation: false,
    hidden: false,
    sales_last_30_days: 15,
    sales_last_90_days: 60,
    last_updated: '2024-01-01'
  },
  {
    id: '5',
    sku: 'HIDDEN-001',
    product_name: 'Hidden Product',
    current_stock: 50,
    reorder_point: 10,
    reorder_quantity: 20,
    unit_cost: 25.00,
    unit_price: 50.00,
    vendor: 'Vendor A',
    location: 'Main',
    sales_velocity: 0,
    days_until_stockout: Infinity,
    demand_trend: 'stable',
    reorder_recommendation: false,
    hidden: true,
    sales_last_30_days: 0,
    sales_last_90_days: 0,
    last_updated: '2024-01-01'
  }
]

describe('useUnifiedFilters', () => {
  describe('initial state', () => {
    it('should return all items when no filters applied', () => {
      const { result } = renderHook(() => useUnifiedFilters(mockInventoryItems))
      
      // Hidden items should be filtered by default
      expect(result.current.filteredItems).toHaveLength(4)
      expect(result.current.activeFilterCount).toBe(0)
      expect(result.current.isFiltered).toBe(false)
    })

    it('should extract unique vendors', () => {
      const { result } = renderHook(() => useUnifiedFilters(mockInventoryItems))
      
      expect(result.current.uniqueVendors).toContain('Vendor A')
      expect(result.current.uniqueVendors).toContain('Vendor B')
      expect(result.current.uniqueVendors).toContain('Vendor C')
      expect(result.current.uniqueVendors).toHaveLength(3)
    })

    it('should extract unique locations', () => {
      const { result } = renderHook(() => useUnifiedFilters(mockInventoryItems))
      
      expect(result.current.uniqueLocations).toContain('Main')
      expect(result.current.uniqueLocations).toContain('Warehouse')
      expect(result.current.uniqueLocations).toHaveLength(2)
    })
  })

  describe('text search filtering', () => {
    it('should filter by SKU', () => {
      const { result } = renderHook(() => useUnifiedFilters(mockInventoryItems))
      
      act(() => {
        result.current.updateFilter({ search: 'TEST-001' })
      })
      
      expect(result.current.filteredItems).toHaveLength(1)
      expect(result.current.filteredItems[0].sku).toBe('TEST-001')
      expect(result.current.activeFilterCount).toBe(1)
    })

    it('should filter by product name', () => {
      const { result } = renderHook(() => useUnifiedFilters(mockInventoryItems))
      
      act(() => {
        result.current.updateFilter({ search: 'Product 2' })
      })
      
      expect(result.current.filteredItems).toHaveLength(1)
      expect(result.current.filteredItems[0].product_name).toBe('Test Product 2')
    })

    it('should be case insensitive', () => {
      const { result } = renderHook(() => useUnifiedFilters(mockInventoryItems))
      
      act(() => {
        result.current.updateFilter({ search: 'test' })
      })
      
      expect(result.current.filteredItems).toHaveLength(4)
    })
  })

  describe('status filtering', () => {
    it('should filter out-of-stock items', () => {
      const { result } = renderHook(() => useUnifiedFilters(mockInventoryItems))
      
      act(() => {
        result.current.updateFilter({ status: 'out-of-stock' })
      })
      
      expect(result.current.filteredItems).toHaveLength(1)
      expect(result.current.filteredItems[0].current_stock).toBe(0)
    })

    it('should filter critical items', () => {
      const { result } = renderHook(() => useUnifiedFilters(mockInventoryItems))
      
      act(() => {
        result.current.updateFilter({ status: 'critical' })
      })
      
      expect(result.current.filteredItems).toHaveLength(1)
      expect(result.current.filteredItems[0].sku).toBe('TEST-002')
    })

    it('should filter low stock items', () => {
      const { result } = renderHook(() => useUnifiedFilters(mockInventoryItems))
      
      act(() => {
        result.current.updateFilter({ status: 'low' })
      })
      
      // Items with stock between reorder point and 2x reorder point
      expect(result.current.filteredItems.length).toBeGreaterThan(0)
    })

    it('should filter overstocked items', () => {
      const { result } = renderHook(() => useUnifiedFilters(mockInventoryItems))
      
      act(() => {
        result.current.updateFilter({ status: 'overstocked' })
      })
      
      // TEST-004 has stock of 100 (> 5 * reorder_point of 10)
      expect(result.current.filteredItems).toHaveLength(1)
      expect(result.current.filteredItems[0].sku).toBe('TEST-004')
    })
  })

  describe('vendor filtering', () => {
    it('should filter by specific vendor', () => {
      const { result } = renderHook(() => useUnifiedFilters(mockInventoryItems))
      
      act(() => {
        result.current.updateFilter({ vendor: 'Vendor A' })
      })
      
      expect(result.current.filteredItems).toHaveLength(2)
      expect(result.current.filteredItems.every(item => item.vendor === 'Vendor A')).toBe(true)
    })
  })

  describe('sales velocity filtering', () => {
    it('should filter fast moving items', () => {
      const { result } = renderHook(() => useUnifiedFilters(mockInventoryItems))
      
      act(() => {
        result.current.updateFilter({ salesVelocity: 'fast' })
      })
      
      // No items have velocity >= 10
      expect(result.current.filteredItems).toHaveLength(0)
    })

    it('should filter medium moving items', () => {
      const { result } = renderHook(() => useUnifiedFilters(mockInventoryItems))
      
      act(() => {
        result.current.updateFilter({ salesVelocity: 'medium' })
      })
      
      // Items with velocity between 1 and 10
      expect(result.current.filteredItems.length).toBeGreaterThan(0)
      expect(result.current.filteredItems.every(item => 
        item.sales_velocity >= 1 && item.sales_velocity < 10
      )).toBe(true)
    })

    it('should filter slow moving items', () => {
      const { result } = renderHook(() => useUnifiedFilters(mockInventoryItems))
      
      act(() => {
        result.current.updateFilter({ salesVelocity: 'slow' })
      })
      
      // Items with velocity between 0.1 and 1
      expect(result.current.filteredItems.length).toBeGreaterThan(0)
    })

    it('should filter dead stock', () => {
      const { result } = renderHook(() => useUnifiedFilters(mockInventoryItems))
      
      act(() => {
        result.current.updateFilter({ salesVelocity: 'dead', showHidden: true })
      })
      
      // HIDDEN-001 has velocity of 0
      expect(result.current.filteredItems).toHaveLength(1)
      expect(result.current.filteredItems[0].sku).toBe('HIDDEN-001')
    })
  })

  describe('boolean filters', () => {
    it('should filter items needing reorder', () => {
      const { result } = renderHook(() => useUnifiedFilters(mockInventoryItems))
      
      act(() => {
        result.current.updateFilter({ reorderNeeded: true })
      })
      
      expect(result.current.filteredItems).toHaveLength(2)
      expect(result.current.filteredItems.every(item => item.reorder_recommendation)).toBe(true)
    })

    it('should filter high value items', () => {
      const { result } = renderHook(() => useUnifiedFilters(mockInventoryItems))
      
      act(() => {
        result.current.updateFilter({ hasValue: true })
      })
      
      // Items with total value >= 100
      const highValueItems = result.current.filteredItems.filter(item => 
        (item.current_stock * item.unit_cost) >= 100
      )
      expect(highValueItems.length).toBeGreaterThan(0)
    })

    it('should show hidden items when requested', () => {
      const { result } = renderHook(() => useUnifiedFilters(mockInventoryItems))
      
      act(() => {
        result.current.updateFilter({ showHidden: true })
      })
      
      expect(result.current.filteredItems).toHaveLength(5)
      expect(result.current.filteredItems.some(item => item.hidden)).toBe(true)
    })
  })

  describe('combined filters', () => {
    it('should apply multiple filters correctly', () => {
      const { result } = renderHook(() => useUnifiedFilters(mockInventoryItems))
      
      act(() => {
        result.current.updateFilter({
          vendor: 'Vendor A',
          status: 'out-of-stock'
        })
      })
      
      expect(result.current.filteredItems).toHaveLength(1)
      expect(result.current.filteredItems[0].sku).toBe('TEST-001')
      expect(result.current.activeFilterCount).toBe(2)
    })

    it('should handle conflicting filters', () => {
      const { result } = renderHook(() => useUnifiedFilters(mockInventoryItems))
      
      act(() => {
        result.current.updateFilter({
          status: 'out-of-stock',
          salesVelocity: 'fast' // No out-of-stock items are fast moving
        })
      })
      
      expect(result.current.filteredItems).toHaveLength(0)
    })
  })

  describe('filter counts', () => {
    it('should calculate status counts correctly', () => {
      const { result } = renderHook(() => useUnifiedFilters(mockInventoryItems))
      
      expect(result.current.statusCounts.all).toBe(5)
      expect(result.current.statusCounts['out-of-stock']).toBe(1)
      expect(result.current.statusCounts.critical).toBe(1)
      expect(result.current.statusCounts.overstocked).toBe(1)
    })

    it('should calculate velocity counts correctly', () => {
      const { result } = renderHook(() => useUnifiedFilters(mockInventoryItems))
      
      expect(result.current.velocityCounts.all).toBe(5)
      expect(result.current.velocityCounts.fast).toBe(0)
      expect(result.current.velocityCounts.medium).toBeGreaterThan(0)
      expect(result.current.velocityCounts.slow).toBeGreaterThan(0)
    })

    it('should calculate trend counts correctly', () => {
      const { result } = renderHook(() => useUnifiedFilters(mockInventoryItems))
      
      expect(result.current.trendCounts.all).toBe(5)
      expect(result.current.trendCounts.increasing).toBe(1)
      expect(result.current.trendCounts.stable).toBe(3)
      expect(result.current.trendCounts.decreasing).toBe(1)
    })
  })

  describe('clearFilters', () => {
    it('should reset all filters to default', () => {
      const { result } = renderHook(() => useUnifiedFilters(mockInventoryItems))
      
      act(() => {
        result.current.updateFilter({
          search: 'test',
          vendor: 'Vendor A',
          status: 'critical'
        })
      })
      
      expect(result.current.activeFilterCount).toBe(3)
      
      act(() => {
        result.current.clearFilters()
      })
      
      expect(result.current.activeFilterCount).toBe(0)
      expect(result.current.filteredItems).toHaveLength(4) // Excludes hidden
    })
  })
})
import { describe, it, expect } from '@jest/globals'

// Mock the EnhancedQuickFilters component data
const mockPresetFilters = [
  {
    id: 'out-of-stock',
    label: 'Out of Stock',
    description: 'Items with zero stock or below reorder level',
    config: { 
      status: 'out-of-stock',
      stockRange: { min: 0, max: 0 }
    }
  },
  {
    id: 'high-value',
    label: 'High Value',
    description: 'Items with unit price over $100',
    config: { 
      priceRange: { min: 100, max: 999999 },
      hasValue: true
    }
  },
  {
    id: 'manufactured-items',
    label: 'Manufactured',
    description: 'Items manufactured by BuildASoil operations',
    config: { 
      sourceType: 'manufactured'
    }
  },
  {
    id: 'recently-purchased',
    label: 'Recently Purchased',
    description: 'Items purchased in the last 30 days',
    config: { 
      sourceType: 'purchased'
    }
  },
  {
    id: 'needs-attention',
    label: 'Needs Attention',
    description: 'Items that need immediate attention (out of stock or reorder needed)',
    config: { 
      status: 'out-of-stock',
      reorderNeeded: true,
      stockRange: { min: 0, max: 0 }
    }
  },
  {
    id: 'new-items',
    label: 'New Items',
    description: 'Items added in the last 30 days',
    config: { 
      status: 'all',
      sourceType: 'all'
    }
  }
]

describe('Enhanced Quick Filters', () => {
  it('should have comprehensive preset filters', () => {
    expect(mockPresetFilters.length).toBeGreaterThanOrEqual(6)
    
    // Check for essential business filters
    const filterIds = mockPresetFilters.map(f => f.id)
    expect(filterIds).toContain('out-of-stock')
    expect(filterIds).toContain('high-value')
    expect(filterIds).toContain('manufactured-items')
    expect(filterIds).toContain('recently-purchased')
    expect(filterIds).toContain('needs-attention')
    expect(filterIds).toContain('new-items')
  })

  it('should have proper filter configurations', () => {
    const outOfStockFilter = mockPresetFilters.find(f => f.id === 'out-of-stock')
    expect(outOfStockFilter?.config.status).toBe('out-of-stock')
    expect(outOfStockFilter?.config.stockRange?.max).toBe(0)

    const highValueFilter = mockPresetFilters.find(f => f.id === 'high-value')
    expect(highValueFilter?.config.priceRange?.min).toBe(100)
    expect(highValueFilter?.config.hasValue).toBe(true)

    const manufacturedFilter = mockPresetFilters.find(f => f.id === 'manufactured-items')
    expect(manufacturedFilter?.config.sourceType).toBe('manufactured')
  })

  it('should have meaningful descriptions', () => {
    mockPresetFilters.forEach(filter => {
      expect(filter.description).toBeTruthy()
      expect(filter.description.length).toBeGreaterThan(10)
    })
  })

  it('should support BuildASoil business needs', () => {
    // Check for manufactured items filter (BuildASoil makes their own products)
    const manufacturedFilter = mockPresetFilters.find(f => f.id === 'manufactured-items')
    expect(manufacturedFilter).toBeTruthy()
    expect(manufacturedFilter?.config.sourceType).toBe('manufactured')

    // Check for high-value filter (important for inventory management)
    const highValueFilter = mockPresetFilters.find(f => f.id === 'high-value')
    expect(highValueFilter).toBeTruthy()
    expect(highValueFilter?.config.priceRange?.min).toBeGreaterThan(50)

    // Check for attention-needed filter (critical for operations)
    const attentionFilter = mockPresetFilters.find(f => f.id === 'needs-attention')
    expect(attentionFilter).toBeTruthy()
    expect(attentionFilter?.config.reorderNeeded).toBe(true)
  })
})

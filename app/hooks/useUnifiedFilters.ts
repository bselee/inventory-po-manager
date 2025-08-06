import { useState, useCallback, useMemo, useEffect } from 'react'
import { InventoryItem } from '@/app/types'
import { UnifiedFilterConfig } from '@/app/components/inventory/UnifiedFilterSystem'

// Default filter configuration
const defaultFilterConfig: UnifiedFilterConfig = {
  search: '',
  status: 'all',
  vendor: 'all',
  location: 'all',
  sourceType: 'all',
  priceRange: { min: 0, max: Infinity },
  costRange: { min: 0, max: Infinity },
  stockRange: { min: 0, max: Infinity },
  salesVelocity: 'all',
  stockDays: 'all',
  demandTrend: 'all',
  reorderNeeded: false,
  hasValue: false,
  showHidden: false
}

export interface UseUnifiedFiltersResult {
  // Filtered items
  filteredItems: InventoryItem[]
  
  // Filter configuration
  filterConfig: UnifiedFilterConfig
  setFilterConfig: (config: UnifiedFilterConfig) => void
  updateFilter: (updates: Partial<UnifiedFilterConfig>) => void
  clearFilters: () => void
  
  // Filter metadata
  activeFilterCount: number
  isFiltered: boolean
  
  // Unique values for dropdowns
  uniqueVendors: string[]
  uniqueLocations: string[]
  
  // Filter counts by category
  statusCounts: Record<string, number>
  velocityCounts: Record<string, number>
  trendCounts: Record<string, number>
}

/**
 * Unified filter hook that consolidates all filtering logic
 */
export function useUnifiedFilters(items: InventoryItem[]): UseUnifiedFiltersResult {
  const [filterConfig, setFilterConfig] = useState<UnifiedFilterConfig>(defaultFilterConfig)
  
  // Extract unique values for dropdowns
  const uniqueVendors = useMemo(() => {
    const vendors = new Set(items.map(item => item.vendor).filter(Boolean))
    return Array.from(vendors).sort()
  }, [items])
  
  const uniqueLocations = useMemo(() => {
    const locations = new Set(items.map(item => item.location).filter(Boolean))
    return Array.from(locations).sort()
  }, [items])
  
  // Apply filter to a single item
  const applyFilterToItem = useCallback((item: InventoryItem, config: UnifiedFilterConfig): boolean => {
    // Text search
    if (config.search) {
      const searchLower = config.search.toLowerCase()
      const matchesSearch = 
        item.sku?.toLowerCase().includes(searchLower) ||
        item.product_name?.toLowerCase().includes(searchLower) ||
        item.vendor?.toLowerCase().includes(searchLower)
      if (!matchesSearch) return false
    }
    
    // Status filter
    if (config.status !== 'all') {
      const stock = item.current_stock || 0
      const reorderPoint = item.reorder_point || 0
      
      switch (config.status) {
        case 'out-of-stock':
          if (stock !== 0) return false
          break
        case 'critical':
          if (stock >= reorderPoint || stock === 0) return false
          break
        case 'low':
          if (stock === 0 || stock > reorderPoint * 2) return false
          break
        case 'adequate':
          if (stock <= reorderPoint * 2 || stock > reorderPoint * 5) return false
          break
        case 'overstocked':
          if (stock <= reorderPoint * 5) return false
          break
      }
    }
    
    // Vendor filter
    if (config.vendor !== 'all' && item.vendor !== config.vendor) return false
    
    // Location filter
    if (config.location !== 'all' && item.location !== config.location) return false
    
    // Source type filter
    if (config.sourceType !== 'all') {
      const isManufactured = item.vendor?.toLowerCase().includes('manufactured') || 
                            item.vendor?.toLowerCase().includes('in-house')
      if (config.sourceType === 'manufactured' && !isManufactured) return false
      if (config.sourceType === 'purchased' && isManufactured) return false
    }
    
    // Price range filter
    const price = item.unit_price || 0
    if (price < config.priceRange.min || price > config.priceRange.max) return false
    
    // Cost range filter
    const cost = item.unit_cost || 0
    if (cost < config.costRange.min || cost > config.costRange.max) return false
    
    // Stock range filter
    const stock = item.current_stock || 0
    if (stock < config.stockRange.min || stock > config.stockRange.max) return false
    
    // Sales velocity filter
    if (config.salesVelocity !== 'all') {
      const velocity = item.sales_velocity || 0
      switch (config.salesVelocity) {
        case 'fast':
          if (velocity < 10) return false
          break
        case 'medium':
          if (velocity < 1 || velocity >= 10) return false
          break
        case 'slow':
          if (velocity < 0.1 || velocity >= 1) return false
          break
        case 'dead':
          if (velocity >= 0.1) return false
          break
      }
    }
    
    // Stock days filter
    if (config.stockDays !== 'all') {
      const daysUntilStockout = item.days_until_stockout || Infinity
      switch (config.stockDays) {
        case 'under-30':
          if (daysUntilStockout >= 30) return false
          break
        case '30-60':
          if (daysUntilStockout < 30 || daysUntilStockout >= 60) return false
          break
        case '60-90':
          if (daysUntilStockout < 60 || daysUntilStockout >= 90) return false
          break
        case 'over-90':
          if (daysUntilStockout < 90 || daysUntilStockout >= 180) return false
          break
        case 'over-180':
          if (daysUntilStockout < 180) return false
          break
      }
    }
    
    // Demand trend filter
    if (config.demandTrend !== 'all') {
      const trend = item.demand_trend || 'stable'
      if (trend !== config.demandTrend) return false
    }
    
    // Boolean filters
    if (config.reorderNeeded && !item.reorder_recommendation) return false
    if (config.hasValue) {
      const value = (item.current_stock || 0) * (item.unit_cost || 0)
      if (value < 100) return false
    }
    if (!config.showHidden && item.hidden) return false
    
    return true
  }, [])
  
  // Filter all items
  const filteredItems = useMemo(() => {
    return items.filter(item => applyFilterToItem(item, filterConfig))
  }, [items, filterConfig, applyFilterToItem])
  
  // Calculate filter counts for different categories
  const statusCounts = useMemo(() => {
    const counts: Record<string, number> = {
      'all': items.length,
      'out-of-stock': 0,
      'critical': 0,
      'low': 0,
      'adequate': 0,
      'overstocked': 0
    }
    
    items.forEach(item => {
      const stock = item.current_stock || 0
      const reorderPoint = item.reorder_point || 0
      
      if (stock === 0) {
        counts['out-of-stock']++
      } else if (stock < reorderPoint) {
        counts['critical']++
      } else if (stock <= reorderPoint * 2) {
        counts['low']++
      } else if (stock <= reorderPoint * 5) {
        counts['adequate']++
      } else {
        counts['overstocked']++
      }
    })
    
    return counts
  }, [items])
  
  const velocityCounts = useMemo(() => {
    const counts: Record<string, number> = {
      'all': items.length,
      'fast': 0,
      'medium': 0,
      'slow': 0,
      'dead': 0
    }
    
    items.forEach(item => {
      const velocity = item.sales_velocity || 0
      
      if (velocity >= 10) {
        counts['fast']++
      } else if (velocity >= 1) {
        counts['medium']++
      } else if (velocity >= 0.1) {
        counts['slow']++
      } else {
        counts['dead']++
      }
    })
    
    return counts
  }, [items])
  
  const trendCounts = useMemo(() => {
    const counts: Record<string, number> = {
      'all': items.length,
      'increasing': 0,
      'stable': 0,
      'decreasing': 0
    }
    
    items.forEach(item => {
      const trend = item.demand_trend || 'stable'
      counts[trend]++
    })
    
    return counts
  }, [items])
  
  // Count active filters
  const activeFilterCount = useMemo(() => {
    let count = 0
    if (filterConfig.search) count++
    if (filterConfig.status !== 'all') count++
    if (filterConfig.vendor !== 'all') count++
    if (filterConfig.location !== 'all') count++
    if (filterConfig.sourceType !== 'all') count++
    if (filterConfig.salesVelocity !== 'all') count++
    if (filterConfig.stockDays !== 'all') count++
    if (filterConfig.demandTrend !== 'all') count++
    if (filterConfig.reorderNeeded) count++
    if (filterConfig.hasValue) count++
    if (filterConfig.showHidden) count++
    if (filterConfig.priceRange.min > 0 || filterConfig.priceRange.max < Infinity) count++
    if (filterConfig.costRange.min > 0 || filterConfig.costRange.max < Infinity) count++
    if (filterConfig.stockRange.min > 0 || filterConfig.stockRange.max < Infinity) count++
    return count
  }, [filterConfig])
  
  // Update filter configuration
  const updateFilter = useCallback((updates: Partial<UnifiedFilterConfig>) => {
    setFilterConfig(prev => ({ ...prev, ...updates }))
  }, [])
  
  // Clear all filters
  const clearFilters = useCallback(() => {
    setFilterConfig(defaultFilterConfig)
  }, [])
  
  return {
    // Filtered items
    filteredItems,
    
    // Filter configuration
    filterConfig,
    setFilterConfig,
    updateFilter,
    clearFilters,
    
    // Filter metadata
    activeFilterCount,
    isFiltered: activeFilterCount > 0,
    
    // Unique values for dropdowns
    uniqueVendors,
    uniqueLocations,
    
    // Filter counts by category
    statusCounts,
    velocityCounts,
    trendCounts
  }
}
import { useState, useMemo, useCallback, useEffect } from 'react'
import { InventoryItem } from '@/app/types'
import { FilterConfig } from '@/app/components/inventory/EnhancedQuickFilters'

export interface EnhancedFiltersResult {
  filteredItems: InventoryItem[]
  filterCounts: { [key: string]: number }
  activeFilterConfig: FilterConfig
  setActiveFilterConfig: (config: FilterConfig) => void
  applyFilter: (config: FilterConfig, filterId?: string) => void
  clearFilters: () => void
  activeFilterId: string | null
  isFilterActive: boolean
}

const defaultFilterConfig: FilterConfig = {
  status: 'all',
  vendor: '',
  location: '',
  priceRange: { min: 0, max: 999999 },
  salesVelocity: 'all',
  stockDays: 'all',
  reorderNeeded: false,
  hasValue: false,
  costRange: { min: 0, max: 999999 },
  stockRange: { min: 0, max: 999999 },
  sourceType: 'all'
}

export function useEnhancedInventoryFiltering(
  items: InventoryItem[]
): EnhancedFiltersResult {
  const [activeFilterConfig, setActiveFilterConfig] = useState<FilterConfig>(defaultFilterConfig)
  const [activeFilterId, setActiveFilterId] = useState<string | null>(null)

  // Calculate sales velocity for an item
  const calculateSalesVelocity = useCallback((item: InventoryItem): number => {
    const days30 = item.sales_last_30_days || 0
    return days30 / 30 // Daily velocity
  }, [])

  // Calculate days of stock
  const calculateStockDays = useCallback((item: InventoryItem): number => {
    const velocity = calculateSalesVelocity(item)
    if (velocity === 0) return Infinity
    return (item.stock ?? 0) / velocity
  }, [calculateSalesVelocity])

  // Determine velocity category
  const getVelocityCategory = useCallback((item: InventoryItem): string => {
    const velocity = calculateSalesVelocity(item)
    if (velocity >= 10) return 'fast'
    if (velocity >= 3) return 'medium'
    if (velocity > 0) return 'slow'
    return 'dead'
  }, [calculateSalesVelocity])

  // Apply filters to items
  const filteredItems = useMemo(() => {
    return items.filter(item => {
      // Status filter
      if (activeFilterConfig.status !== 'all') {
        switch (activeFilterConfig.status) {
          case 'out-of-stock':
            if ((item.stock ?? 0) !== 0) return false
            break
          case 'low-stock':
            if ((item.stock ?? 0) === 0 || (item.stock ?? 0) > (item.reorder_point ?? 0)) return false
            break
          case 'critical':
            if ((item.stock ?? 0) > (item.reorder_point ?? 0) / 2) return false
            break
          case 'adequate':
            if ((item.stock ?? 0) <= (item.reorder_point ?? 0) || (item.stock ?? 0) > (item.reorder_point ?? 0) * 3) return false
            break
          case 'overstocked':
            if ((item.stock ?? 0) <= (item.reorder_point ?? 0) * 3) return false
            break
          case 'in-stock':
            if ((item.stock ?? 0) === 0) return false
            break
        }
      }

      // Vendor filter
      if (activeFilterConfig.vendor && item.vendor !== activeFilterConfig.vendor) {
        return false
      }

      // Location filter
      if (activeFilterConfig.location && item.location !== activeFilterConfig.location) {
        return false
      }

      // Price range filter
      const price = item.unit_price || item.cost || 0
      if (price < activeFilterConfig.priceRange.min || price > activeFilterConfig.priceRange.max) {
        return false
      }

      // Cost range filter
      const cost = item.cost || 0
      if (cost < activeFilterConfig.costRange.min || cost > activeFilterConfig.costRange.max) {
        return false
      }

      // Stock range filter
      if ((item.stock ?? 0) < activeFilterConfig.stockRange.min || (item.stock ?? 0) > activeFilterConfig.stockRange.max) {
        return false
      }

      // Sales velocity filter
      if (activeFilterConfig.salesVelocity !== 'all') {
        const velocityCategory = getVelocityCategory(item)
        if (velocityCategory !== activeFilterConfig.salesVelocity) {
          return false
        }
      }

      // Stock days filter
      if (activeFilterConfig.stockDays !== 'all') {
        const stockDays = calculateStockDays(item)
        switch (activeFilterConfig.stockDays) {
          case 'under-30':
            if (stockDays >= 30 || stockDays === Infinity) return false
            break
          case '30-60':
            if (stockDays < 30 || stockDays >= 60 || stockDays === Infinity) return false
            break
          case '60-90':
            if (stockDays < 60 || stockDays >= 90 || stockDays === Infinity) return false
            break
          case 'over-90':
            if (stockDays < 90 || stockDays === Infinity) return false
            break
          case 'over-180':
            if (stockDays < 180 || stockDays === Infinity) return false
            break
        }
      }

      // Reorder needed filter
      if (activeFilterConfig.reorderNeeded && (item.stock ?? 0) > (item.reorder_point ?? 0)) {
        return false
      }

      // Has value filter (items over $50)
      if (activeFilterConfig.hasValue && price < 50) {
        return false
      }

      // Source type filter
      if (activeFilterConfig.sourceType !== 'all') {
        // This would need additional data about whether item is purchased or manufactured
        // For now, we'll skip this filter
      }

      return true
    })
  }, [items, activeFilterConfig, calculateSalesVelocity, calculateStockDays, getVelocityCategory])

  // Calculate counts for each quick filter
  const filterCounts = useMemo(() => {
    const counts: { [key: string]: number } = {
      'out-of-stock': 0,
      'reorder-needed': 0,
      'dead-stock': 0,
      'overstocked': 0,
      'fast-moving': 0,
      'low-value': 0,
      'critical-stock': 0
    }

    items.forEach(item => {
      const price = item.unit_price || item.cost || 0
      const velocity = calculateSalesVelocity(item)
      const stockDays = calculateStockDays(item)

      if ((item.stock ?? 0) === 0) counts['out-of-stock']++
      if ((item.stock ?? 0) <= (item.reorder_point ?? 0)) counts['reorder-needed']++
      if (velocity === 0 && item.sales_last_90_days === 0) counts['dead-stock']++
      if (stockDays > 90 && stockDays !== Infinity) counts['overstocked']++
      if (velocity >= 10) counts['fast-moving']++
      if (price < 50) counts['low-value']++
      if (stockDays < 30 && stockDays !== Infinity && (item.stock ?? 0) > 0) counts['critical-stock']++
    })

    return counts
  }, [items, calculateSalesVelocity, calculateStockDays])

  // Apply filter
  const applyFilter = useCallback((config: FilterConfig, filterId?: string) => {
    setActiveFilterConfig(config)
    setActiveFilterId(filterId || null)
  }, [])

  // Clear filters
  const clearFilters = useCallback(() => {
    setActiveFilterConfig(defaultFilterConfig)
    setActiveFilterId(null)
  }, [])

  // Check if any filter is active
  const isFilterActive = useMemo(() => {
    return JSON.stringify(activeFilterConfig) !== JSON.stringify(defaultFilterConfig)
  }, [activeFilterConfig])

  return {
    filteredItems,
    filterCounts,
    activeFilterConfig,
    setActiveFilterConfig,
    applyFilter,
    clearFilters,
    activeFilterId,
    isFilterActive
  }
}
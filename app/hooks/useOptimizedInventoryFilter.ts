/**
 * OPTIMIZED INVENTORY FILTERING - Implementing Serena Analysis
 * ===========================================================
 * 
 * Performance improvements based on Serena's semantic code analysis:
 * 1. Memoized string operations
 * 2. Lookup table for status filtering
 * 3. Early exit strategy
 * 4. Type-specific sorting
 */

import { useMemo } from 'react'
import type { InventoryItem } from '@/app/types'

// Local interface definitions for this hook
interface SortConfig {
  key: keyof InventoryItem
  direction: 'asc' | 'desc'
}

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

// STATUS MATCHER LOOKUP TABLE - O(1) status filtering
const STATUS_MATCHERS = {
  'all': () => true,
  'out-of-stock': (item: InventoryItem) => item.current_stock === 0,
  'critical': (item: InventoryItem, statusLevel: string) => statusLevel === 'critical',
  'low-stock': (item: InventoryItem, statusLevel: string) => statusLevel === 'low',
  'adequate': (item: InventoryItem, statusLevel: string) => statusLevel === 'adequate',
  'overstocked': (item: InventoryItem, statusLevel: string) => statusLevel === 'overstocked',
  'in-stock': (item: InventoryItem) => item.current_stock > 0,
} as const

// VELOCITY MATCHER LOOKUP TABLE
const VELOCITY_MATCHERS = {
  'all': () => true,
  'fast': (velocity: number) => velocity > 1,
  'medium': (velocity: number) => velocity > 0.1 && velocity <= 1,
  'slow': (velocity: number) => velocity > 0 && velocity <= 0.1,
  'dead': (velocity: number) => velocity === 0,
} as const

// STOCK DAYS MATCHER LOOKUP TABLE
const STOCK_DAYS_MATCHERS = {
  'all': () => true,
  'under-30': (days: number) => days > 0 && days <= 30,
  '30-60': (days: number) => days > 30 && days <= 60,
  '60-90': (days: number) => days > 60 && days <= 90,
  'over-90': (days: number) => days > 90,
  'over-180': (days: number) => days > 180,
} as const

/**
 * Optimized filtering hook with performance improvements
 */
export function useOptimizedInventoryFilter(
  allItems: InventoryItem[],
  searchTerm: string,
  filterConfig: FilterConfig,
  sortConfig: SortConfig
) {
  // OPTIMIZATION 1: Memoize search term preprocessing
  const searchTermLower = useMemo(() => 
    searchTerm.toLowerCase().trim(), 
    [searchTerm]
  )

  // OPTIMIZATION 2: Memoize filtered and sorted results
  const filteredAndSortedItems = useMemo(() => {
    try {
      // Early return for null/undefined/empty dataset
      if (!allItems || allItems.length === 0) return []

      // FILTERING with early exit strategy
      const filtered = allItems.filter(item => {
      // EARLY EXIT 1: Search filter (most likely to filter out items)
      if (searchTermLower) {
        // Pre-compute lowercase strings once per item
        const productNameLower = (item.product_name || item.name || '').toLowerCase()
        const skuLower = item.sku.toLowerCase()
        const vendorLower = item.vendor ? item.vendor.toLowerCase() : ''
        
        const matchesSearch = 
          productNameLower.includes(searchTermLower) ||
          skuLower.includes(searchTermLower) ||
          vendorLower.includes(searchTermLower)
        
        if (!matchesSearch) return false // EARLY EXIT
      }

      // EARLY EXIT 2: Status filter using lookup table
      if (filterConfig.status !== 'all') {
        const statusLevel = item.stock_status_level || 'adequate'
        const statusMatcher = STATUS_MATCHERS[filterConfig.status]
        if (!statusMatcher?.(item, statusLevel)) return false // EARLY EXIT
      }

      // EARLY EXIT 3: Vendor filter
      if (filterConfig.vendor) {
        const vendorLower = item.vendor?.toLowerCase() || ''
        const filterVendorLower = filterConfig.vendor.toLowerCase()
        if (!vendorLower.includes(filterVendorLower)) return false // EARLY EXIT
      }

      // EARLY EXIT 4: Location filter
      if (filterConfig.location) {
        const locationLower = item.location?.toLowerCase() || ''
        const filterLocationLower = filterConfig.location.toLowerCase()
        if (!locationLower.includes(filterLocationLower)) return false // EARLY EXIT
      }

      // Price range filter (numeric, fast)
      const price = item.unit_price || item.cost || 0
      if (price < filterConfig.priceRange.min || price > filterConfig.priceRange.max) {
        return false // EARLY EXIT
      }

      // EARLY EXIT 5: Sales velocity filter using lookup table
      if (filterConfig.salesVelocity !== 'all') {
        const velocity = item.sales_velocity || 0
        const velocityMatcher = VELOCITY_MATCHERS[filterConfig.salesVelocity]
        if (!velocityMatcher?.(velocity)) return false // EARLY EXIT
      }

      // EARLY EXIT 6: Stock days filter using lookup table
      if (filterConfig.stockDays !== 'all') {
        const stockDays = item.days_until_stockout || 0
        const stockDaysMatcher = STOCK_DAYS_MATCHERS[filterConfig.stockDays]
        if (!stockDaysMatcher?.(stockDays)) return false // EARLY EXIT
      }

      // Boolean filters (fast checks)
      if (filterConfig.reorderNeeded && !item.reorder_recommended) return false
      if (filterConfig.hasValue && (item.unit_price || item.cost || 0) <= 0) return false

      return true // Passed all filters
    })

    // OPTIMIZATION 3: Type-specific sorting
    if (sortConfig.key && filtered.length > 1) {
      const { key, direction } = sortConfig
      const multiplier = direction === 'asc' ? 1 : -1
      
      filtered.sort((a, b) => {
        const aValue = a[key]
        const bValue = b[key]
        
        // Handle null/undefined with early returns
        if (aValue == null && bValue == null) return 0
        if (aValue == null) return multiplier
        if (bValue == null) return -multiplier
        
        // TYPE-SPECIFIC OPTIMIZED COMPARISONS
        if (typeof aValue === 'number' && typeof bValue === 'number') {
          // Direct numeric comparison (fastest)
          return (aValue - bValue) * multiplier
        }
        
        if (typeof aValue === 'string' && typeof bValue === 'string') {
          // Optimized string comparison using localeCompare
          return aValue.localeCompare(bValue) * multiplier
        }
        
        // Boolean comparison
        if (typeof aValue === 'boolean' && typeof bValue === 'boolean') {
          return (Number(aValue) - Number(bValue)) * multiplier
        }
        
        // Fallback to string comparison
        return String(aValue).localeCompare(String(bValue)) * multiplier
      })
    }

      return filtered
    } catch (error) {
      logError('Error in inventory filtering:', error)
      // Return unfiltered items as fallback
      return allItems
    }
  }, [allItems, searchTermLower, filterConfig, sortConfig])

  return filteredAndSortedItems
}

/**
 * Performance monitoring hook for filtering operations
 */
export function useFilteringPerformance(itemCount: number, filterCount: number) {
  return useMemo(() => {
    let startTime: number
    
    return {
      startTiming: () => {
        startTime = performance.now()
        return startTime
      },
      endTiming: () => {
        const endTime = performance.now()
        const duration = endTime - startTime
        
        // Log performance metrics for monitoring
        if (duration > 100) { // Log if filtering takes > 100ms
          logWarn(`Slow filtering detected: ${duration.toFixed(2)}ms for ${itemCount} items with ${filterCount} active filters`)
        }
        
        return {
          duration,
          itemsPerMs: itemCount / duration,
          isPerformant: duration < 50 // Good performance threshold
        }
      }
    }
  }, [itemCount, filterCount])
}

/**
 * Hook to replace the original getFilteredAndSortedItems function
 */
export function useInventoryFiltering(
  allItems: InventoryItem[],
  searchTerm: string,
  filterConfig: FilterConfig,
  sortConfig: SortConfig
) {
  // Count active filters for performance monitoring
  const activeFilterCount = useMemo(() => {
    let count = 0
    if (searchTerm) count++
    if (filterConfig.status !== 'all') count++
    if (filterConfig.vendor) count++
    if (filterConfig.location) count++
    if (filterConfig.salesVelocity !== 'all') count++
    if (filterConfig.stockDays !== 'all') count++
    if (filterConfig.reorderNeeded) count++
    if (filterConfig.hasValue) count++
    return count
  }, [searchTerm, filterConfig])

  const performanceMonitor = useFilteringPerformance(allItems.length, activeFilterCount)
  
  try {
    // Start timing before filtering
    performanceMonitor.startTiming()
    
    const filteredItems = useOptimizedInventoryFilter(allItems, searchTerm, filterConfig, sortConfig)
    
    // End timing and log performance in development
    if (process.env.NODE_ENV === 'development' && allItems.length > 100) {
      const timing = performanceMonitor.endTiming()
    }

    return filteredItems
  } catch (error) {
    logError('Error in inventory filtering wrapper:', error)
    // Return all items as fallback
    return allItems
  }
}

export default useInventoryFiltering

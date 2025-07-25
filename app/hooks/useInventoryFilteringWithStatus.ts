import { useState, useEffect } from 'react'
import useInventoryFiltering from './useOptimizedInventoryFilter'

/**
 * Enhanced inventory filtering hook that provides error status
 */
export function useInventoryFilteringWithStatus(
  allItems: any[],
  searchTerm: string,
  filterConfig: any,
  sortConfig: any
) {
  const [isFilteringError, setIsFilteringError] = useState(false)
  
  // Wrap the filtering call to detect if we're in fallback mode
  let filteredItems = allItems
  
  try {
    setIsFilteringError(false)
    filteredItems = useInventoryFiltering(allItems, searchTerm, filterConfig, sortConfig)
    
    // Check if we got back all items when we have active filters
    // This might indicate fallback mode
    const hasActiveFilters = searchTerm || filterConfig.status !== 'all' || 
      filterConfig.vendor || filterConfig.location || filterConfig.reorderNeeded || 
      filterConfig.hasValue || filterConfig.salesVelocity !== 'all' || 
      filterConfig.stockDays !== 'all'
      
    if (hasActiveFilters && filteredItems.length === allItems.length) {
      // Possible fallback, but not necessarily an error
      console.warn('Filtering may be in fallback mode')
    }
  } catch (error) {
    console.error('Filtering error detected:', error)
    setIsFilteringError(true)
    filteredItems = allItems
  }
  
  return { filteredItems, isFilteringError }
}

export default useInventoryFilteringWithStatus
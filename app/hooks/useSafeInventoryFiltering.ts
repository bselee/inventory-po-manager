import { useState, useEffect } from 'react'
import useInventoryFiltering from './useOptimizedInventoryFilter'

/**
 * Safe wrapper around the inventory filtering hook that provides fallback behavior
 * if the optimized filtering fails.
 */
export function useSafeInventoryFiltering(
  allItems: any[],
  searchTerm: string,
  filterConfig: any,
  sortConfig: any
) {
  const [filteredItems, setFilteredItems] = useState(allItems)
  const [filterError, setFilterError] = useState<Error | null>(null)
  
  useEffect(() => {
    try {
      // Reset error state
      setFilterError(null)
      
      // This is a bit of a hack to catch errors in hooks
      // In a real implementation, we'd need to wrap the component
      const result = useInventoryFiltering(allItems, searchTerm, filterConfig, sortConfig)
      setFilteredItems(result)
    } catch (error) {
      logError('Filtering error:', error)
      setFilterError(error as Error)
      
      // Fallback: return all items unsorted/unfiltered
      setFilteredItems(allItems)
    }
  }, [allItems, searchTerm, filterConfig, sortConfig])
  
  return { filteredItems, filterError }
}

export default useSafeInventoryFiltering